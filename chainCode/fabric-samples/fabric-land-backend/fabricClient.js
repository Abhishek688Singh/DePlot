/*
 * Fabric client utilities
 */
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CCP_PATH = process.env.CCP_PATH;
const WALLET_PATH = process.env.WALLET_PATH || './wallet';
const IDENTITY = process.env.IDENTITY || 'appUser';
const CHANNEL_NAME = process.env.CHANNEL_NAME || 'land';
const CHAINCODE_NAME = process.env.CHAINCODE_NAME || 'land';
const CONTRACT_NAME = process.env.CONTRACT_NAME || 'LandContract';

if (!CCP_PATH) {
  console.error('Missing CCP_PATH in environment.');
  process.exit(1);
}

async function getContract() {
  const ccp = JSON.parse(fs.readFileSync(path.resolve(CCP_PATH), 'utf8'));
  const wallet = await Wallets.newFileSystemWallet(path.resolve(WALLET_PATH));
  const identity = await wallet.get(IDENTITY);
  if (!identity) {
    throw new Error(`Identity "${IDENTITY}" not found in wallet at ${WALLET_PATH}`);
  }

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: IDENTITY,
    discovery: { enabled: true, asLocalhost: true }
  });

  const network = await gateway.getNetwork(CHANNEL_NAME);
  const contract = network.getContract(CHAINCODE_NAME, CONTRACT_NAME);
  return { gateway, contract };
}

async function evaluateTransaction(fn, ...args) {
  const { gateway, contract } = await getContract();
  try {
    const result = await contract.evaluateTransaction(fn, ...args);
    const str = result.toString();
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  } finally {
    gateway && (await gateway.disconnect());
  }
}

async function submitTransaction(fn, ...args) {
  const { gateway, contract } = await getContract();
  try {
    const result = await contract.submitTransaction(fn, ...args);
    const str = result.toString();
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  } finally {
    gateway && (await gateway.disconnect());
  }
}

module.exports = {
  evaluateTransaction,
  submitTransaction,
};
