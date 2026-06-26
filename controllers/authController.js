const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "30d", 
  });
};

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide username, email, and password." });
    }

    const userExists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });
    if (userExists) {
      return res
        .status(400)
        .json({ message: "Username or email already exists." });
    }

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        coins: user.coins,
        xp: user.xp,
        currentLevel: user.currentLevel,
        highestStreak: user.highestStreak,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error);
    return res
      .status(500)
      .json({
        message: "Server error during registration.",
        devError: error.message,
        devStack: error.stack,
      });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password." });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        coins: user.coins,
        xp: user.xp,
        currentLevel: user.currentLevel,
        highestStreak: user.highestStreak,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Server error during login." });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Google ID Token is required." });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      const fallbackUsername =
        name.replace(/\s+/g, "").toLowerCase() + googleId.slice(-4);

      user = await User.create({
        username: fallbackUsername,
        email: email.toLowerCase(),
        password: Math.random().toString(36).slice(-8) + googleId.slice(-6),
        coins: 50,
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        coins: user.coins,
        xp: user.xp,
        currentLevel: user.currentLevel,
        highestStreak: user.highestStreak,
      },
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.status(400).json({
      message: "Server error during registration.",
      devError: error.message,
      devStack: error.stack,
    });
  }
};
