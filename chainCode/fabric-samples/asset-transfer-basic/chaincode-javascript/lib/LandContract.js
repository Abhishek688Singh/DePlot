/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

class LandContract extends Contract {

    // ===========================
    // 🔹 LEDGER INITIALIZATION
    // ===========================
    async InitLedger(ctx) {
        const txId = ctx.stub.getTxID();
        const timestamp = new Date(ctx.stub.getTxTimestamp().seconds * 1000).toISOString();

        const initialLands = [
            {
                landId: 'LAND0001',
                titleNumber: 'TN-123456',
                landType: 'Residential',
                ownershipType: 'Freehold',
                owner: 'Aadhar_1234',
                ownerName: 'Akhil Kumar',
                area: 1200,
                unit: 'sq.ft',
                surveyNumber: 'SV-9876',
                mutationNumber: 'MUT-9087',
                location: 'Village X, Tehsil Y, Kanpur Nagar, Uttar Pradesh, 208002',
                coordinates: { lat: 26.4511, long: 80.3469 },
                boundary: {
                    north: 'Road',
                    south: 'River',
                    east: 'Plot 12',
                    west: 'Canal'
                },
                marketValue: 4000000,
                registrationDate: timestamp,
                legalStatus: 'REGISTERED',
                currentStatus: 'OWNED',
                docHash: 'sha256:abcdef...',
                previousOwners: [
                    { owner: 'Aadhar_1111', from: '2015-01-01', to: '2025-11-04' }
                ],
                history: [
                    {
                        txId,
                        action: 'CREATED',
                        by: 'Registrar_001',
                        timestamp
                    }
                ],
                lastUpdated: timestamp
            }
        ];

        for (const land of initialLands) {
            await ctx.stub.putState(
                land.landId,
                Buffer.from(stringify(sortKeysRecursive(land)))
            );
            console.log(`✅ Land record ${land.landId} initialized`);
        }
    }

    // ===========================
    // 🔹 UTILITIES
    // ===========================
    _getClientId(ctx) {
        return ctx.clientIdentity.getID();
    }

    _getMSP(ctx) {
        return ctx.clientIdentity.getMSPID();
    }

    _getAttr(ctx, name) {
        try {
            return ctx.clientIdentity.getAttributeValue(name);
        } catch(err) {
            return null;
        }
    }

    // ===========================
    // 🔹 CREATE LAND (Registrar)
    // ===========================
    async CreateLand(
        ctx,
        landId,
        titleNumber,
        landType,
        ownershipType,
        owner,
        ownerName,
        area,
        unit,
        surveyNumber,
        mutationNumber,
        location,
        lat,
        long,
        north,
        south,
        east,
        west,
        marketValue,
        docHash
    ) {
        const msp = this._getMSP(ctx);
        const role = this._getAttr(ctx, 'role');

        if (msp !== 'Org1MSP' || role !== 'gov') {
            throw new Error('❌ Only Government registrar (Org1, role=gov) can create land records');
        }

        const exists = await ctx.stub.getState(landId);
        if (exists && exists.length > 0) {
            throw new Error(`❌ Land ${landId} already exists`);
        }

        const txId = ctx.stub.getTxID();
        const timestamp = new Date().toISOString();

        const land = {
            docType: 'land',
            landId,
            titleNumber,
            landType,
            ownershipType,
            owner,
            ownerName,
            area: Number(area),
            unit,
            surveyNumber,
            mutationNumber,
            location,
            coordinates: { lat: Number(lat), long: Number(long) },
            boundary: { north, south, east, west },
            marketValue: Number(marketValue),
            registrationDate: timestamp,
            legalStatus: 'REGISTERED',
            currentStatus: 'OWNED',
            docHash,
            previousOwners: [],
            history: [
                { txId, action: 'CREATED', by: 'Registrar_001', timestamp }
            ],
            lastUpdated: timestamp
        };

        await ctx.stub.putState(landId, Buffer.from(stringify(sortKeysRecursive(land))));
        console.log(`✅ Land record ${landId} created by Registrar`);

        return JSON.stringify(land);
    }

    // ===========================
    // 🔹 READ LAND
    // ===========================
    async ReadLand(ctx, landId) {
        const data = await ctx.stub.getState(landId);
        if (!data || data.length === 0) {
            throw new Error(`❌ Land ${landId} not found`);
        }
        return data.toString();
    }

    // ===========================
    // 🔹 INITIATE TRANSFER (Owner)
    // ===========================
    async InitiateTransfer(ctx, landId, proposedBuyer, price, agreementHash) {
        const caller = this._getClientId(ctx);
        const landBytes = await ctx.stub.getState(landId);

        if (!landBytes || landBytes.length === 0) {
            throw new Error(`❌ Land ${landId} not found`);
        }

        const land = JSON.parse(landBytes.toString());
        if (land.owner !== caller) {
            throw new Error('❌ Only current owner can initiate a transfer');
        }

        if (land.legalStatus === 'PENDING_TRANSFER') {
            throw new Error('⚠️ Transfer already initiated for this land');
        }

        land.pendingTransfer = {
            proposedBuyer,
            price: Number(price),
            agreementHash,
            initiatedBy: caller,
            initiatedAt: new Date().toISOString()
        };
        land.legalStatus = 'PENDING_TRANSFER';
        land.history.push({
            txId: ctx.stub.getTxID(),
            action: 'TRANSFER_INITIATED',
            by: caller,
            timestamp: new Date().toISOString()
        });

        await ctx.stub.putState(landId, Buffer.from(stringify(sortKeysRecursive(land))));
        return JSON.stringify(land);
    }

    // ===========================
    // 🔹 APPROVE TRANSFER (Registrar)
    // ===========================
    async ApproveTransfer(ctx, landId) {
        const msp = this._getMSP(ctx);
        const role = this._getAttr(ctx, 'role');

        if (msp !== 'Org1MSP' || role !== 'gov') {
            throw new Error('❌ Only government registrar (Org1, role=gov) can approve transfers');
        }

        const landBytes = await ctx.stub.getState(landId);
        if (!landBytes || landBytes.length === 0) {
            throw new Error(`❌ Land ${landId} not found`);
        }

        const land = JSON.parse(landBytes.toString());
        if (!land.pendingTransfer) {
            throw new Error('⚠️ No transfer request pending for this land');
        }

        const oldOwner = land.owner;
        const newOwner = land.pendingTransfer.proposedBuyer;

        land.previousOwners.push({
            owner: oldOwner,
            to: new Date().toISOString()
        });

        land.owner = newOwner;
        land.ownerName = newOwner;
        land.legalStatus = 'REGISTERED';
        land.currentStatus = 'OWNED';
        land.pendingTransfer = null;

        land.history.push({
            txId: ctx.stub.getTxID(),
            action: 'TRANSFER_APPROVED',
            from: oldOwner,
            to: newOwner,
            timestamp: new Date().toISOString()
        });

        land.lastUpdated = new Date().toISOString();

        await ctx.stub.putState(landId, Buffer.from(stringify(sortKeysRecursive(land))));
        return JSON.stringify(land);
    }

    // ===========================
    // 🔹 HISTORY
    // ===========================
    async GetHistory(ctx, landId) {
        const iterator = await ctx.stub.getHistoryForKey(landId);
        const results = [];

        while (true) {
            const res = await iterator.next();
            if (res.value) {
                results.push({
                    txId: res.value.txId,
                    timestamp: res.value.timestamp ? res.value.timestamp : null,
                    isDelete: res.value.isDelete,
                    value: res.value.value.toString('utf8')
                });
            }
            if (res.done) {break;}
        }

        await iterator.close();
        return JSON.stringify(results);
    }

    // ===========================
    // 🔹 QUERY BY OWNER
    // ===========================
    async QueryLandsByOwner(ctx, owner) {
        const query = {
            selector: { docType: 'land', owner }
        };
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const results = [];
        while (true) {
            const res = await iterator.next();
            if (res.value) {results.push(JSON.parse(res.value.value.toString('utf8')));}
            if (res.done) {break;}
        }
        await iterator.close();
        return JSON.stringify(results);
    }

    // ===========================
    // 🔹 QUERY BY LOCATION
    // ===========================
    async QueryLandsByLocation(ctx, location) {
        const query = {
            selector: { docType: 'land', location }
        };
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const results = [];
        while (true) {
            const res = await iterator.next();
            if (res.value) {results.push(JSON.parse(res.value.value.toString('utf8')));}
            if (res.done) {break;}
        }
        await iterator.close();
        return JSON.stringify(results);
    }
}

module.exports = LandContract;
