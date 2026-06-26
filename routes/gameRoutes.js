const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getLevel, claimRewards, spendCoins } = require('../controllers/gameController');

router.get('/level', protect, getLevel);
router.post('/claim-rewards', protect, claimRewards);
router.post('/spend-coins', protect, spendCoins);

module.exports = router;
