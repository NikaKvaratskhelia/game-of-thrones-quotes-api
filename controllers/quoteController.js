const Quote = require('../models/Quote');
const Character = require('../models/Character');

// GET /api/quotes
exports.getQuotes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { characterId, houseId } = req.query;

    let query = {};
    if (characterId) {
      query.character = characterId;
    } else if (houseId) {
      const characters = await Character.find({ house: houseId }).select('_id');
      const characterIds = characters.map(c => c._id);
      query.character = { $in: characterIds };
    }

    const total = await Quote.countDocuments(query);
    const quotes = await Quote.find(query)
      .populate({
        path: 'character',
        populate: { path: 'house' }
      })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: quotes.length,
      pagination: {
        totalItems: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      },
      data: quotes
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// GET /api/quotes/filter?characterId=XYZ or ?houseId=XYZ
exports.filterQuotes = async (req, res) => {
  try {
    const { characterId, houseId } = req.query;
    let matchQuery = {};

    if (characterId) {
      matchQuery.character = characterId;
    } else if (houseId) {
      // Find characters belonging to the house
      const characters = await Character.find({ house: houseId }).select('_id');
      const characterIds = characters.map(c => c._id);
      matchQuery.character = { $in: characterIds };
    }

    const quote = await Quote.aggregate([
      { $match: matchQuery },
      { $sample: { size: 1 } }
    ]);

    if (!quote || quote.length === 0) {
      return res.status(404).json({ success: false, error: 'No quotes found' });
    }

    const populatedQuote = await Quote.populate(quote[0], {
      path: 'character',
      populate: { path: 'house' }
    });

    res.status(200).json({
      success: true,
      data: populatedQuote
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// GET /api/quotes/random
exports.getRandomQuote = async (req, res) => {
  try {
    const quote = await Quote.aggregate([{ $sample: { size: 1 } }]);
    
    if (!quote || quote.length === 0) {
      return res.status(404).json({ success: false, error: 'No quotes found' });
    }

    // Populate the random quote
    const populatedQuote = await Quote.populate(quote[0], {
      path: 'character',
      populate: { path: 'house' }
    });

    res.status(200).json({
      success: true,
      data: populatedQuote
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/quotes
exports.createQuote = async (req, res) => {
  try {
    const quote = await Quote.create(req.body);
    res.status(201).json({ success: true, data: quote });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// PUT /api/quotes/:id
exports.updateQuote = async (req, res) => {
  try {
    const quote = await Quote.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!quote) {
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }

    res.status(200).json({ success: true, data: quote });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// DELETE /api/quotes/:id
exports.deleteQuote = async (req, res) => {
  try {
    const quote = await Quote.findByIdAndDelete(req.params.id);

    if (!quote) {
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
