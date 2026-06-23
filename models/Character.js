const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema({
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
  house: {
    type: String,
    ref: 'House',
    default: null
  },
  photo: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Character', characterSchema);
