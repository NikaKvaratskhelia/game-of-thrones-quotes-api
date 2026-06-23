const express = require('express');
const router = express.Router();
const {
  getQuotes,
  filterQuotes,
  getRandomQuote,
  createQuote,
  updateQuote,
  deleteQuote
} = require('../controllers/quoteController');

router.get('/filter', filterQuotes);
router.get('/random', getRandomQuote);

router.route('/')
  .get(getQuotes)
  .post(createQuote);

router.route('/:id')
  .put(updateQuote)
  .delete(deleteQuote);

module.exports = router;
