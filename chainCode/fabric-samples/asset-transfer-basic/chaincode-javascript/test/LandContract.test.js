'use strict';

const { Context } = require('fabric-contract-api');
const sinon = require('sinon');
const { expect } = require('chai');
const LandContract = require('../lib/LandContract'); // adjust path if needed

describe('LandContract Tests', () => {
    let contract;
    let ctx;

    beforeEach(() => {
        contract = new LandContract();

        ctx = new Context();
        ctx.stub = {
            putState: sinon.stub(),
            getState: sinon.stub(),
            getTxID: sinon.stub().returns('TX12345'),
            getTxTimestamp: sinon.stub().returns({ seconds: Math.floor(Date.now() / 1000) }),
            getHistoryForKey: sinon.stub(),
            getQueryResult: sinon.stub()
        };

        ctx.clientIdentity = {
            getMSPID: sinon.stub().returns('Org1MSP'),
            getID: sinon.stub().returns('Aadhar_1234'),
            getAttributeValue: sinon.stub()
        };
    });

    // ===========================
    // 🔹 InitLedger
    // ===========================
    it('should initialize ledger with default land record', async () => {
        ctx.stub.putState.resolves();

        await contract.InitLedger(ctx);

        sinon.assert.calledOnce(ctx.stub.putState);
        const key = ctx.stub.putState.getCall(0).args[0];
        expect(key).to.equal('LAND0001');
    });

    // ===========================
    // 🔹 CreateLand
    // ===========================
    it('should allow government registrar to create a land record', async () => {
        ctx.clientIdentity.getAttributeValue.withArgs('role').returns('gov');
        ctx.stub.getState.resolves(Buffer.from('')); // no existing record
        ctx.stub.putState.resolves();

        const land = await contract.CreateLand(
            ctx,
            'LAND0010',
            'TN-111',
            'Residential',
            'Freehold',
            'Aadhar_5555',
            'Rohit Verma',
            '1500',
            'sq.ft',
            'SV-0001',
            'MUT-1001',
            'Kanpur',
            '26.4511',
            '80.3469',
            'North Boundary',
            'South Boundary',
            'East Boundary',
            'West Boundary',
            '5000000',
            'sha256:test'
        );

        const record = JSON.parse(land);
        expect(record.landId).to.equal('LAND0010');
        sinon.assert.calledOnce(ctx.stub.putState);
    });

    it('should reject non-gov users from creating land', async () => {
        ctx.clientIdentity.getAttributeValue.withArgs('role').returns('user');

        try {
            await contract.CreateLand(ctx, 'LAND999', 'TN', 'Type', 'Freehold', 'O', 'ON', '100', 'sq.ft', 'S', 'M', 'Loc', '26', '80', 'N', 'S', 'E', 'W', '1000', 'hash');
        } catch (e) {
            expect(e.message).to.include('Only Government registrar');
        }
    });

    // ===========================
    // 🔹 ReadLand
    // ===========================
    it('should read existing land record', async () => {
        const mockLand = { landId: 'LAND0001', owner: 'Aadhar_1234' };
        ctx.stub.getState.withArgs('LAND0001').resolves(Buffer.from(JSON.stringify(mockLand)));

        const result = await contract.ReadLand(ctx, 'LAND0001');
        expect(JSON.parse(result).landId).to.equal('LAND0001');
    });

    it('should throw error for missing land record', async () => {
        ctx.stub.getState.withArgs('LAND9999').resolves(Buffer.from(''));
        try {
            await contract.ReadLand(ctx, 'LAND9999');
        } catch (e) {
            expect(e.message).to.include('not found');
        }
    });

    // ===========================
    // 🔹 Initiate Transfer
    // ===========================
    it('should allow current owner to initiate transfer', async () => {
        const mockLand = {
            landId: 'LAND123',
            owner: 'Aadhar_1234',
            legalStatus: 'REGISTERED',
            history: []
        };
        ctx.stub.getState.resolves(Buffer.from(JSON.stringify(mockLand)));
        ctx.stub.putState.resolves();

        const result = await contract.InitiateTransfer(ctx, 'LAND123', 'Aadhar_9876', '6000000', 'sha256:agree');
        const updated = JSON.parse(result);
        expect(updated.legalStatus).to.equal('PENDING_TRANSFER');
    });

    it('should reject transfer by non-owner', async () => {
        const mockLand = { landId: 'LAND123', owner: 'Aadhar_5678', legalStatus: 'REGISTERED' };
        ctx.stub.getState.resolves(Buffer.from(JSON.stringify(mockLand)));

        try {
            await contract.InitiateTransfer(ctx, 'LAND123', 'Aadhar_9876', '6000000', 'sha256:agree');
        } catch (e) {
            expect(e.message).to.include('Only current owner');
        }
    });

    // ===========================
    // 🔹 Approve Transfer
    // ===========================
    it('should approve transfer by gov registrar', async () => {
        ctx.clientIdentity.getAttributeValue.withArgs('role').returns('gov');
        const mockLand = {
            landId: 'LAND321',
            owner: 'Aadhar_1234',
            pendingTransfer: { proposedBuyer: 'Aadhar_8888' },
            previousOwners: [],
            history: []
        };

        ctx.stub.getState.resolves(Buffer.from(JSON.stringify(mockLand)));
        ctx.stub.putState.resolves();

        const result = await contract.ApproveTransfer(ctx, 'LAND321');
        const updated = JSON.parse(result);
        expect(updated.owner).to.equal('Aadhar_8888');
        expect(updated.pendingTransfer).to.equal(null);
    });

    it('should reject approval from non-gov', async () => {
        ctx.clientIdentity.getAttributeValue.withArgs('role').returns('user');
        ctx.stub.getState.resolves(Buffer.from(JSON.stringify({
            landId: 'LAND999',
            pendingTransfer: { proposedBuyer: 'Aadhar_9999' }
        })));

        try {
            await contract.ApproveTransfer(ctx, 'LAND999');
        } catch (e) {
            expect(e.message).to.include('Only government registrar');
        }
    });

    // ===========================
    // 🔹 QueryLandsByOwner
    // ===========================
    it('should query lands by owner', async () => {
        const iterator = {
            next: sinon.stub(),
            close: sinon.stub().resolves()
        };
        iterator.next
            .onCall(0).resolves({ value: { value: Buffer.from(JSON.stringify({ landId: 'LAND10', owner: 'Aadhar_1234' })) } })
            .onCall(1).resolves({ done: true });

        ctx.stub.getQueryResult.resolves(iterator);

        const result = await contract.QueryLandsByOwner(ctx, 'Aadhar_1234');
        const data = JSON.parse(result);
        expect(data[0].landId).to.equal('LAND10');
    });

    // ===========================
    // 🔹 History
    // ===========================
    it('should return land history', async () => {
        const iterator = {
            next: sinon.stub(),
            close: sinon.stub().resolves()
        };
        iterator.next
            .onCall(0).resolves({
                value: { txId: 'TX1', value: Buffer.from('mockValue') },
                done: false
            })
            .onCall(1).resolves({ done: true });

        ctx.stub.getHistoryForKey.resolves(iterator);

        const result = await contract.GetHistory(ctx, 'LAND0001');
        const data = JSON.parse(result);
        expect(data[0].txId).to.equal('TX1');
    });
});
