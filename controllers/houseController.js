const House = require('../models/House');
const Character = require('../models/Character');

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

exports.createHouse = async (req, res) => {
  try {
    const house = await House.create(req.body);
    res.status(201).json({ success: true, data: house });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};