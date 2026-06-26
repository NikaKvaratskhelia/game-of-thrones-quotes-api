const mongoose = require('mongoose');
const Quote = require('../models/Quote');
const Character = require('../models/Character');
const User = require('../models/User');

const LEVEL_SIZE = 10;
const DIFFICULTIES = {
  easy: { minPopularity: 4, minNonPopular: 0, nonPopularPopularity: 3, requiredNonPopular: 0 },
  medium: { minPopularity: 3, minNonPopular: 0, nonPopularPopularity: 3, requiredNonPopular: 0 },
  hard: { minPopularity: 3, minNonPopular: 4, nonPopularPopularity: 3, requiredNonPopular: 4 }
};

const buildQuotePipeline = (playedQuoteIds, minPopularity, size) => [
  { $match: { _id: { $nin: playedQuoteIds }, popularity: { $gte: minPopularity } } },
  { $sample: { size } },
  {
    $lookup: {
      from: 'characters',
      localField: 'character',
      foreignField: '_id',
      as: 'character'
    }
  },
  { $unwind: '$character' },
  {
    $project: {
      sentence: 1,
      character: 1,
      season: 1,
      popularity: 1
    }
  }
];

const getLevel = async (req, res) => {
  const user = req.user;
  const playedQuoteIds = Array.isArray(user.completedQuotes) ? user.completedQuotes : [];
  const requestedDifficulty = (req.query.difficulty || 'medium').toLowerCase();
  const difficulty = DIFFICULTIES[requestedDifficulty] ? requestedDifficulty : 'medium';
  const config = DIFFICULTIES[difficulty];

  const buildProcessed = async (quotes) => Promise.all(quotes.map(async (quote) => {
    const correctCharacter = quote.character;
    const houseId = correctCharacter.house;

    const sameHouseFilter = houseId ? { house: houseId, _id: { $ne: correctCharacter._id } } : { _id: { $ne: correctCharacter._id } };
    let distractors = await Character.aggregate([
      { $match: sameHouseFilter },
      { $sample: { size: 3 } },
      { $project: { _id: 1, name: 1, house: 1 } }
    ]);

    if (distractors.length < 3) {
      const remaining = 3 - distractors.length;
      const fallback = await Character.aggregate([
        { $match: { _id: { $nin: distractors.map((d) => d._id).concat([correctCharacter._id]) } } },
        { $sample: { size: remaining } },
        { $project: { _id: 1, name: 1, house: 1 } }
      ]);
      distractors = distractors.concat(fallback);
    }

    const choices = [
      { id: correctCharacter._id, name: correctCharacter.name, correct: true },
      ...distractors.map((d) => ({ id: d._id, name: d.name, correct: false }))
    ];

    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    return {
      quoteId: quote._id,
      sentence: quote.sentence,
      season: quote.season,
      popularity: quote.popularity,
      correctCharacter: {
        id: correctCharacter._id,
        name: correctCharacter.name,
        house: correctCharacter.house
      },
      gameChoices: choices
    };
  }));

  const quotesByDifficulty = async () => {
    if (difficulty !== 'hard') {
      return Quote.aggregate(buildQuotePipeline(playedQuoteIds, config.minPopularity, LEVEL_SIZE));
    }

    const popularPart = await Quote.aggregate(buildQuotePipeline(playedQuoteIds, 4, 6));
    const nonPopularPart = await Quote.aggregate([
      { $match: { _id: { $nin: playedQuoteIds }, popularity: config.nonPopularPopularity } },
      { $sample: { size: config.requiredNonPopular } },
      {
        $lookup: {
          from: 'characters',
          localField: 'character',
          foreignField: '_id',
          as: 'character'
        }
      },
      { $unwind: '$character' },
      {
        $project: {
          sentence: 1,
          character: 1,
          season: 1,
          popularity: 1
        }
      }
    ]);

    if (nonPopularPart.length < config.requiredNonPopular || popularPart.length < 6) {
      return Quote.aggregate(buildQuotePipeline(playedQuoteIds, config.minPopularity, LEVEL_SIZE));
    }

    return [...nonPopularPart.slice(0, config.requiredNonPopular), ...popularPart.slice(0, 6)];
  };

  const quotes = await quotesByDifficulty();
  if (!quotes || quotes.length < LEVEL_SIZE) {
    return res.status(400).json({
      success: false,
      message: 'Not enough unplayed quotes available to generate a full level with the selected difficulty.'
    });
  }

  const processed = await buildProcessed(quotes);

  res.status(200).json({ success: true, data: { level: user.currentLevel, difficulty, quotes: processed } });
};
  const processed = await Promise.all(quotes.map(async (quote) => {
    const correctCharacter = quote.character;
    const houseId = correctCharacter.house;

    const sameHouseFilter = houseId ? { house: houseId, _id: { $ne: correctCharacter._id } } : { _id: { $ne: correctCharacter._id } };
    let distractors = await Character.aggregate([
      { $match: sameHouseFilter },
      { $sample: { size: 3 } },
      { $project: { _id: 1, name: 1, house: 1 } }
    ]);

    if (distractors.length < 3) {
      const remaining = 3 - distractors.length;
      const fallback = await Character.aggregate([
        { $match: { _id: { $nin: distractors.map((d) => d._id).concat([correctCharacter._id]) } } },
        { $sample: { size: remaining } },
        { $project: { _id: 1, name: 1, house: 1 } }
      ]);
      distractors = distractors.concat(fallback);
    }

    const choices = [
      { id: correctCharacter._id, name: correctCharacter.name, correct: true },
      ...distractors.map((d) => ({ id: d._id, name: d.name, correct: false }))
    ];

    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    return {
      quoteId: quote._id,
      sentence: quote.sentence,
      season: quote.season,
      correctCharacter: {
        id: correctCharacter._id,
        name: correctCharacter.name,
        house: correctCharacter.house
      },
      gameChoices: choices
    };
  }));

  res.status(200).json({ success: true, data: { level: user.currentLevel, quotes: processed } });
};

const claimRewards = async (req, res) => {
  const { coinsEarned, clearedQuoteIds } = req.body;
  const user = req.user;

  if (typeof coinsEarned !== 'number' || coinsEarned < 0 || !Array.isArray(clearedQuoteIds) || clearedQuoteIds.length !== LEVEL_SIZE) {
    return res.status(400).json({ success: false, message: 'Invalid rewards payload.' });
  }

  const invalidQuoteId = clearedQuoteIds.some((id) => !mongoose.Types.ObjectId.isValid(id));
  if (invalidQuoteId) {
    return res.status(400).json({ success: false, message: 'clearedQuoteIds must contain valid quote IDs.' });
  }

  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    {
      $inc: { coins: coinsEarned, currentLevel: 1 },
      $addToSet: { completedQuotes: { $each: clearedQuoteIds } }
    },
    { new: true, runValidators: true, select: '-password' }
  );

  res.status(200).json({
    success: true,
    data: {
      coins: updatedUser.coins,
      currentLevel: updatedUser.currentLevel,
      highScore: updatedUser.highScore
    }
  });
};

const SPEND_COSTS = {
  reveal_letter: 5,
  buy_life: 10,
  skip_quote: 15
};

const spendCoins = async (req, res) => {
  const { action } = req.body;
  const cost = SPEND_COSTS[action];

  if (!action || !cost) {
    return res.status(400).json({ success: false, message: 'Invalid action type.' });
  }

  const user = req.user;
  if (user.coins < cost) {
    return res.status(400).json({ success: false, message: 'Insufficient coins.' });
  }

  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    { $inc: { coins: -cost } },
    { new: true, select: '-password' }
  );

  res.status(200).json({
    success: true,
    data: {
      action,
      spent: cost,
      coins: updatedUser.coins
    }
  });
};

module.exports = { getLevel, claimRewards, spendCoins };
