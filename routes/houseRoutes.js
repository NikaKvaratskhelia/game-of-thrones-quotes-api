const express = require('express');
const router = express.Router();
const {
  getHouses,
  createHouse,
  updateHouse,
  deleteHouse
} = require('../controllers/houseController');

router.route('/')
  .get(getHouses)
  .post(createHouse);

router.route('/:id')
  .put(updateHouse)
  .delete(deleteHouse);

module.exports = router;
