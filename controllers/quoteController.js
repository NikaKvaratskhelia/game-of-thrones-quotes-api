const Quote = require('../models/Quote');
const Character = require('../models/Character');

exports.getQuotes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { characterId, houseId, season } = req.query;

    let query = {};
    if (season) {
      query.season = parseInt(season, 10);
    }
    if (characterId) {
      query.character = characterId;
    }
    if (houseId) {
      const characters = await Character.find({ house: houseId }).select('_id');
      const characterIds = characters.map(c => c._id);
      if (query.character) {
        query.$and = [
          { character: query.character },
          { character: { $in: characterIds } }
        ];
        delete query.character;
      } else {
        query.character = { $in: characterIds };
      }
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

exports.filterQuotes = async (req, res) => {
  try {
    const { characterId, houseId, season } = req.query;
    let matchQuery = {};

    if (season) {
      matchQuery.season = parseInt(season, 10);
    }
    if (characterId) {
      matchQuery.character = characterId;
    }
    if (houseId) {
      const characters = await Character.find({ house: houseId }).select('_id');
      const characterIds = characters.map(c => c._id);
      if (matchQuery.character) {
        matchQuery.$and = [
          { character: matchQuery.character },
          { character: { $in: characterIds } }
        ];
        delete matchQuery.character;
      } else {
        matchQuery.character = { $in: characterIds };
      }
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

exports.getRandomQuote = async (req, res) => {
  try {
    const quote = await Quote.aggregate([{ $sample: { size: 1 } }]);

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
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createQuote = async (req, res) => {
  try {
    const quote = await Quote.create(req.body);
    res.status(201).json({ success: true, data: quote });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

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
