const express = require('express');
const router = express.Router();
const {
  getHouses,
} = require('../controllers/houseController');

router.route('/')
  .get(getHouses)


module.exports = router;
