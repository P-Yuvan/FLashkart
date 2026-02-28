const express = require('express');
const RfidTag = require('../models/RfidTag');
const { protect } = require('../middleware/auth');
const router = express.Router();

// POST /api/rfid/verify
// Input:  { rfidTagIds: ['RFID001', 'RFID002', ...] }
// Output: { result: 'ALLOW' | 'ALERT', unpaidTags: [...], paidTags: [...] }
router.post('/verify', protect, async (req, res) => {
  try {
    const { rfidTagIds } = req.body;
    if (!rfidTagIds || !Array.isArray(rfidTagIds) || rfidTagIds.length === 0) {
      return res.status(400).json({ message: 'rfidTagIds array is required' });
    }

    const tags = await RfidTag.find({ rfidTagId: { $in: rfidTagIds } });

    const foundIds    = tags.map(t => t.rfidTagId);
    const missingIds  = rfidTagIds.filter(id => !foundIds.includes(id));
    const unpaidTags  = tags.filter(t => t.paymentStatus === 'UNPAID');
    const paidTags    = tags.filter(t => t.paymentStatus === 'PAID');

    // Any unregistered RFID = treat as unpaid (could be shoplifted item)
    const alertTags = [
      ...unpaidTags.map(t => ({ rfidTagId: t.rfidTagId, productName: t.productName, status: 'UNPAID' })),
      ...missingIds.map(id => ({ rfidTagId: id, productName: 'Unknown', status: 'UNREGISTERED' })),
    ];

    if (alertTags.length > 0) {
      return res.json({
        result: 'ALERT',
        message: `${alertTags.length} unpaid item(s) detected`,
        alertTags,
        paidTags: paidTags.map(t => ({ rfidTagId: t.rfidTagId, productName: t.productName, status: 'PAID' })),
      });
    }

    res.json({
      result: 'ALLOW',
      message: 'All items verified — exit permitted',
      paidTags: paidTags.map(t => ({ rfidTagId: t.rfidTagId, productName: t.productName, status: 'PAID' })),
      alertTags: [],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rfid/status/:rfidTagId  — check single tag status
router.get('/status/:rfidTagId', protect, async (req, res) => {
  try {
    const tag = await RfidTag.findOne({ rfidTagId: req.params.rfidTagId });
    if (!tag) return res.status(404).json({ message: 'RFID tag not registered', status: 'UNREGISTERED' });
    res.json({ rfidTagId: tag.rfidTagId, productName: tag.productName, paymentStatus: tag.paymentStatus, paidAt: tag.paidAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
