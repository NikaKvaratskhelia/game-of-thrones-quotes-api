const House = require('../models/House');
const Character = require('../models/Character');

// GET /api/houses
exports.getHouses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await House.countDocuments();
    const houses = await House.find().skip(skip).limit(limit);

    res.status(200).json({
      success: true,
      count: houses.length,
      pagination: {
        totalItems: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      },
      data: houses
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// POST /api/houses
exports.createHouse = async (req, res) => {
  try {
    const house = await House.create(req.body);
    res.status(201).json({ success: true, data: house });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// PUT /api/houses/:id
exports.updateHouse = async (req, res) => {
  try {
    const house = await House.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!house) {
      return res.status(404).json({ success: false, error: 'House not found' });
    }

    res.status(200).json({ success: true, data: house });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// DELETE /api/houses/:id
exports.deleteHouse = async (req, res) => {
  try {
    const house = await House.findById(req.params.id);

    if (!house) {
      return res.status(404).json({ success: false, error: 'House not found' });
    }

    // Set character house to null
    await Character.updateMany({ house: house._id }, { house: null });
    
    await House.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
