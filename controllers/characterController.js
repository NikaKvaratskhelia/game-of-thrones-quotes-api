const Character = require('../models/Character');
const Quote = require('../models/Quote');

exports.getCharacters = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Character.countDocuments();
    const characters = await Character.find()
      .populate('house')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: characters.length,
      pagination: {
        totalItems: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      },
      data: characters
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};