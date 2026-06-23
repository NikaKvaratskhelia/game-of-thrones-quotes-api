const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  sentence: {
    type: String,
    required: true,
    trim: true
  },
  character: {
    type: String,
    ref: 'Character',
    required: true
  },
  season: {
    type: Number,
    required: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Quote', quoteSchema);
