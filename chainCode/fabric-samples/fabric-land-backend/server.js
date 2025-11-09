const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
const { evaluateTransaction, submitTransaction } = require('./fabricClient');

const PORT =  1000;
const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', at: new Date().toISOString() }));

// ======== READS ========
// Get all lands (rich query on docType=land)
app.get('/api/lands', async (req, res) => {
  try {
    // Your chaincode returns JSON string from rich query in GetAll-like operation. Here, reuse QueryLandsByLocation with wildcard if needed.
    const result = await evaluateTransaction('GetAllLands'); // if you have it; otherwise you can add such a function
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ReadLand
app.get('/api/land/:landId', async (req, res) => {
  try {
    const result = await evaluateTransaction('ReadLand', req.params.landId);
    res.json({ success: true, result: JSON.parse(result) });
  } catch (err) {
    const code = err.message.includes('not found') ? 404 : 500;
    res.status(code).json({ success: false, error: err.message });
  }
});

// Get history
app.get('/api/land/:landId/history', async (req, res) => {
  try {
    const result = await evaluateTransaction('GetHistory', req.params.landId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Query by owner
app.get('/api/lands/owner/:owner', async (req, res) => {
  try {
    const result = await evaluateTransaction('QueryLandsByOwner', req.params.owner);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Query by location
app.get('/api/lands/location/:location', async (req, res) => {
  try {
    const result = await evaluateTransaction('QueryLandsByLocation', req.params.location);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======== WRITES ========
// CreateLand
app.post('/api/land', async (req, res) => {
  try {
    const {
      landId, titleNumber, landType, ownershipType, owner, ownerName, area, unit,
      surveyNumber, mutationNumber, location, lat, long, north, south, east, west,
      marketValue, docHash
    } = req.body || {};
    const required = { landId, titleNumber, landType, ownershipType, owner, ownerName, area, unit, location };
    for (const [k, v] of Object.entries(required)) {
      if (v === undefined || v === null || v === '') {
        return res.status(400).json({ success: false, error: `Missing field: ${k}` });
      }
    }
    const args = [
      landId, titleNumber, landType, ownershipType, owner, ownerName, String(area), unit,
      surveyNumber || '', mutationNumber || '', location, String(lat || ''), String(long || ''),
      north || '', south || '', east || '', west || '', String(marketValue || ''), docHash || ''
    ];
    const result = await submitTransaction('CreateLand', ...args);
    res.status(201).json({ success: true, result: JSON.parse(result) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// InitiateTransfer
app.post('/api/land/:landId/initiate-transfer', async (req, res) => {
  try {
    const { proposedBuyer, price, agreementHash } = req.body || {};
    if (!proposedBuyer || !price || !agreementHash) {
      return res.status(400).json({ success: false, error: 'proposedBuyer, price, agreementHash are required' });
    }
    const result = await submitTransaction('InitiateTransfer', req.params.landId, proposedBuyer, String(price), agreementHash);
    res.json({ success: true, result: JSON.parse(result) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ApproveTransfer
app.post('/api/land/:landId/approve-transfer', async (req, res) => {
  try {
    const result = await submitTransaction('ApproveTransfer', req.params.landId);
    res.json({ success: true, result: JSON.parse(result) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======== GENERIC ========
app.post('/api/query', async (req, res) => {
  try {
    const { fn, args = [] } = req.body || {};
    if (!fn) return res.status(400).json({ success: false, error: 'fn is required' });
    const result = await evaluateTransaction(fn, ...args.map(String));
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/invoke', async (req, res) => {
  try {
    const { fn, args = [] } = req.body || {};
    if (!fn) return res.status(400).json({ success: false, error: 'fn is required' });
    const result = await submitTransaction(fn, ...args.map(String));
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use((req, res) => res.status(404).json({ success: false, error: 'Not found' }));

app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
