const express = require('express');
const router = express.Router();
const {
  getCharacters,
} = require('../controllers/characterController');

router.route('/')
  .get(getCharacters)

module.exports = router;
