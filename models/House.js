const mongoose = require('mongoose');

const houseSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  photo: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('House', houseSchema);
