const express = require("express");
const analyzeController = require("../controllers/analyzeController");
const { validateUsernameParam, validateCompareBody } = require("../middleware/validateRequest");

const router = express.Router();

router.get("/analyze/:username", validateUsernameParam, analyzeController.analyzeUser);
router.get("/repos/:username", validateUsernameParam, analyzeController.getUserRepos);
router.get("/score/:username", validateUsernameParam, analyzeController.getUserScore);
router.post("/compare", validateCompareBody, analyzeController.compareUsers);

module.exports = router;
