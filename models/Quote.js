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
  }
}, { timestamps: true });

module.exports = mongoose.model('Quote', quoteSchema);
