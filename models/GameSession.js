const mongoose = require('mongoose');

const sessionQuoteSchema = new mongoose.Schema({
  quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote', required: true },
  originalText: { type: String, required: true },
  blankedText: { type: String, required: true },
  missingWords: [{ type: String, required: true }],
  revealedLetters: [{
    wordIndex: Number,     
    charIndices: [Number]
  }]
}, { _id: false });

const gameSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['active', 'completed', 'failed'], default: 'active', index: true },
  quotes: [sessionQuoteSchema],
  currentQuoteIndex: { type: Number, default: 0 },
  hearts: { type: Number, default: 3, min: 0, max: 5 },
  combo: { type: Number, default: 0 },
  multiplier: { type: Number, default: 1.0 },
  coinsEarned: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 }
}, { timestamps: true });

gameSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7200 });

module.exports = mongoose.model('GameSession', gameSessionSchema);