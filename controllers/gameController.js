const Quote = require("../models/Quote");
const GameSession = require("../models/GameSession");
const User = require("../models/User");
const levenshtein = require("fast-levenshtein");

function generateQuoteBlanks(sentence) {
  const words = sentence.split(" ");
  const wordCount = words.length;

  let blanksCount = 1;
  if (wordCount > 15) blanksCount = 4;
  else if (wordCount > 10) blanksCount = 3;
  else if (wordCount > 5) blanksCount = 2;

  const eligibleIndices = [];
  words.forEach((word, index) => {
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    if (cleanWord.length > 2) {
      eligibleIndices.push(index);
    }
  });

  const targetPool =
    eligibleIndices.length >= blanksCount
      ? eligibleIndices
      : words.map((_, i) => i);

  const chosenIndices = [...targetPool]
    .sort(() => 0.5 - Math.random())
    .slice(0, blanksCount)
    .sort((a, b) => a - b);

  const missingWords = [];
  const blankedWordsArray = [...words];

  chosenIndices.forEach((index) => {
    const cleanAnswer = words[index].replace(
      /[.,\/#!$%\^&\*;:{}=\-_`~()]/g,
      "",
    );
    missingWords.push(cleanAnswer);

    const punctuation = words[index].match(/[.,\/#!$%\^&\*;:{}=\-_`~()]+$/);
    blankedWordsArray[index] = "_____" + (punctuation ? punctuation[0] : "");
  });

  return { blankedText: blankedWordsArray.join(" "), missingWords };
}

function evaluateAnswers(userAnswers, correctWords) {
  if (
    !Array.isArray(userAnswers) ||
    userAnswers.length !== correctWords.length
  ) {
    return false;
  }

  for (let i = 0; i < correctWords.length; i++) {
    const userClean = (userAnswers[i] || "")
      .trim()
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    const targetClean = correctWords[i]
      .trim()
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");

    if (userClean === targetClean) continue;

    const distance = levenshtein.get(userClean, targetClean);

    if (targetClean.length <= 4 && distance > 0) return false;
    if (targetClean.length <= 7 && distance > 1) return false;
    if (distance > 2) return false;
  }

  return true;
}

exports.startGame = async (req, res) => {
  try {
    const userId = req.user.id;
    const { difficulty } = req.body;

    let popularityFilter = { $eq: 3 };
    if (difficulty === "easy") popularityFilter = { $in: [4, 5] };
    if (difficulty === "hard") popularityFilter = { $in: [1, 2] };

    const sampledQuotes = await Quote.aggregate([
      { $match: { popularity: popularityFilter } },
      { $sample: { size: 10 } },
    ]);

    if (!sampledQuotes || sampledQuotes.length < 10) {
      return res
        .status(400)
        .json({
          message: "Insufficient quotes matching difficulty framework.",
        });
    }

    const sessionQuotes = sampledQuotes.map((q) => {
      const { blankedText, missingWords } = generateQuoteBlanks(q.sentence);
      return {
        quoteId: q._id,
        originalText: q.sentence,
        blankedText,
        missingWords,
        revealedLetters: missingWords.map(() => ({ charIndices: [] })),
      };
    });

    await GameSession.deleteMany({ userId, status: "active" });

    const newSession = await GameSession.create({
      userId,
      quotes: sessionQuotes,
      status: "active",
      hearts: 3,
      combo: 0,
      multiplier: 1.0,
      currentQuoteIndex: 0,
    });

    const activeQuote = newSession.quotes[0];
    return res.status(201).json({
      sessionId: newSession._id,
      hearts: newSession.hearts,
      combo: newSession.combo,
      multiplier: newSession.multiplier,
      currentQuoteIndex: 0,
      currentQuote: {
        quoteId: activeQuote.quoteId,
        blankedText: activeQuote.blankedText,
        blanksNeeded: activeQuote.missingWords.length,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server failed to start session." });
  }
};

exports.submitAnswer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId, answers } = req.body;

    const session = await GameSession.findOne({
      _id: sessionId,
      userId,
      status: "active",
    });
    if (!session) {
      return res
        .status(404)
        .json({ message: "Active game session not found." });
    }

    const currentIndex = session.currentQuoteIndex;
    const currentQuote = session.quotes[currentIndex];

    const isCorrect = evaluateAnswers(answers, currentQuote.missingWords);

    let coinsEarned = 0;
    let xpEarned = 0;

    if (isCorrect) {
      session.combo += 1;

      const additionalSteps = Math.floor(session.combo / 3);
      session.multiplier = Math.min(1.0 + additionalSteps * 0.5, 3.0);

      coinsEarned = Math.round(10 * session.multiplier);
      xpEarned = 15;

      session.coinsEarned += coinsEarned;
      session.xpEarned += xpEarned;
      session.currentQuoteIndex += 1;

      await User.updateOne(
        { _id: userId },
        {
          $inc: { coins: coinsEarned, xp: xpEarned },
          $addToSet: { completedQuotes: currentQuote.quoteId },
        },
      );
    } else {
      session.hearts -= 1;
      session.combo = 0;
      session.multiplier = 1.0;

      if (session.hearts <= 0) {
        session.status = "failed";
      } else {
        session.currentQuoteIndex += 1;
      }
    }

    if (session.currentQuoteIndex >= 10 && session.status === "active") {
      session.status = "completed";
    }

    await session.save();

    let nextQuote = null;
    if (session.status === "active") {
      const nq = session.quotes[session.currentQuoteIndex];
      nextQuote = {
        quoteId: nq.quoteId,
        blankedText: nq.blankedText,
        blanksNeeded: nq.missingWords.length,
      };
    }

    return res.status(200).json({
      status: session.status,
      wasCorrect: isCorrect,
      correctAnswers: currentQuote.missingWords,
      hearts: session.hearts,
      combo: session.combo,
      multiplier: session.multiplier,
      coinsEarnedThisTurn: coinsEarned,
      nextQuote,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error processing submission validation." });
  }
};

exports.usePowerUp = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId, powerUpType } = req.body; // 'reveal_letter', 'skip_quote', 'buy_heart'

    const session = await GameSession.findOne({
      _id: sessionId,
      userId,
      status: "active",
    });
    if (!session)
      return res
        .status(404)
        .json({ message: "Active run frame target missing." });

    const user = await User.findById(userId);
    const currentIndex = session.currentQuoteIndex;
    const activeQuote = session.quotes[currentIndex];

    if (powerUpType === "reveal_letter") {
      if (user.coins < 5)
        return res.status(400).json({ message: "Insufficient funds." });

      let foundUnrevealed = null;
      for (let wIdx = 0; wIdx < activeQuote.missingWords.length; wIdx++) {
        const targetWord = activeQuote.missingWords[wIdx];
        const record = activeQuote.revealedLetters[wIdx];

        if (record.charIndices.length < targetWord.length) {
          const pool = [];
          for (let c = 0; c < targetWord.length; c++) {
            if (!record.charIndices.includes(c)) pool.push(c);
          }
          const randomCharIndex = pool[Math.floor(Math.random() * pool.length)];
          record.charIndices.push(randomCharIndex);

          foundUnrevealed = {
            wordIndex: wIdx,
            charIndex: randomCharIndex,
            letter: targetWord[randomCharIndex],
          };
          break;
        }
      }

      if (!foundUnrevealed)
        return res
          .status(400)
          .json({ message: "All letters already visible." });

      user.coins -= 5;

      let totalLettersLeft = 0;
      for (let wIdx = 0; wIdx < activeQuote.missingWords.length; wIdx++) {
        const targetWord = activeQuote.missingWords[wIdx];
        const record = activeQuote.revealedLetters[wIdx];
        totalLettersLeft += targetWord.length - record.charIndices.length;
      }

      let nextQuote = null;
      if (totalLettersLeft === 0) {
        session.currentQuoteIndex += 1;

        if (session.currentQuoteIndex >= 10) {
          session.status = "completed";
        }
      }

      await user.save();
      await session.save();

      if (session.status === "active" && totalLettersLeft === 0) {
        const nq = session.quotes[session.currentQuoteIndex];
        nextQuote = {
          quoteId: nq.quoteId,
          blankedText: nq.blankedText,
          blanksNeeded: nq.missingWords.length,
        };
      }

      return res.status(200).json({
        powerUpType,
        userCoins: user.coins,
        hint: foundUnrevealed,
        status: session.status,
        nextQuote: nextQuote, 
      });
    }

    if (powerUpType === "skip_quote") {
      if (user.coins < 15)
        return res.status(400).json({ message: "Insufficient funds." });

      user.coins -= 15;
      session.currentQuoteIndex += 1;

      if (session.currentQuoteIndex >= 10) {
        session.status = "completed";
      }

      await user.save();
      await session.save();

      let nextQuote = null;
      if (session.status === "active") {
        const nq = session.quotes[session.currentQuoteIndex];
        nextQuote = {
          quoteId: nq.quoteId,
          blankedText: nq.blankedText,
          blanksNeeded: nq.missingWords.length,
        };
      }

      return res
        .status(200)
        .json({
          powerUpType,
          userCoins: user.coins,
          status: session.status,
          nextQuote,
        });
    }

    if (powerUpType === "buy_heart") {
      if (user.coins < 10)
        return res.status(400).json({ message: "Insufficient funds." });
      if (session.hearts >= 3)
        return res
          .status(400)
          .json({ message: "Hearts pool capped already at maximum (3)." });

      user.coins -= 10;
      session.hearts += 1;

      await user.save();
      await session.save();

      return res
        .status(200)
        .json({ powerUpType, userCoins: user.coins, hearts: session.hearts });
    }

    return res
      .status(400)
      .json({ message: "Invalid power-up format profile specified." });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Power-up allocation logic crash." });
  }
};

exports.endGame = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body;

    const session = await GameSession.findOne({ _id: sessionId, userId });
    if (!session)
      return res
        .status(404)
        .json({ message: "Session metadata element missed." });

    if (session.status === "active") {
      session.status = "failed";
      await session.save();
    }

    const user = await User.findById(userId);

    if (session.combo > user.highestStreak) {
      user.highestStreak = session.combo;
    }

    const computedLevel = Math.floor(user.xp / 1000) + 1;
    if (computedLevel > user.currentLevel) {
      user.currentLevel = computedLevel;
    }

    await user.save();

    return res.status(200).json({
      sessionId: session._id,
      finalStatus: session.status,
      coinsEarnedThisRun: session.coinsEarned,
      xpEarnedThisRun: session.xpEarned,
      userTotals: {
        coins: user.coins,
        xp: user.xp,
        currentLevel: user.currentLevel,
        highestStreak: user.highestStreak,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Session wrap validation failed." });
  }
};
