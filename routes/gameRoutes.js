const express = require("express");
const router = express.Router();
const {
  startGame,
  submitAnswer,
  usePowerUp,
  endGame,
} = require("../controllers/gameController");
const { protect } = require("../middleware/auth");

router.post("/start", protect, startGame);
router.post("/answer", protect, submitAnswer);
router.post("/powerup", protect, usePowerUp);
router.post("/end", protect, endGame);

module.exports = router;
