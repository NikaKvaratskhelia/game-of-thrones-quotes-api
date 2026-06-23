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

exports.createCharacter = async (req, res) => {
  try {
    const character = await Character.create(req.body);
    res.status(201).json({ success: true, data: character });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.updateCharacter = async (req, res) => {
  try {
    const character = await Character.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!character) {
      return res.status(404).json({ success: false, error: 'Character not found' });
    }

    res.status(200).json({ success: true, data: character });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteCharacter = async (req, res) => {
  try {
    const character = await Character.findById(req.params.id);

    if (!character) {
      return res.status(404).json({ success: false, error: 'Character not found' });
    }

    await Quote.deleteMany({ character: character._id });

    await Character.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
