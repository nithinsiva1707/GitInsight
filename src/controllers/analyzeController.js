const analysisService = require("../services/analysisService");

const analyzeUser = async (req, res, next) => {
  try {
    const analysis = await analysisService.getAnalysis(req.params.username);
    return res.status(200).json({ success: true, data: analysis });
  } catch (error) {
    return next(error);
  }
};

const getUserRepos = async (req, res, next) => {
  try {
    const repos = await analysisService.getRepos(req.params.username);
    return res.status(200).json({ success: true, data: repos });
  } catch (error) {
    return next(error);
  }
};

const getUserScore = async (req, res, next) => {
  try {
    const score = await analysisService.getScore(req.params.username);
    return res.status(200).json({ success: true, data: score });
  } catch (error) {
    return next(error);
  }
};

const compareUsers = async (req, res, next) => {
  try {
    const result = await analysisService.compareUsers(req.body.usernameA, req.body.usernameB);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  analyzeUser,
  getUserRepos,
  getUserScore,
  compareUsers
};
