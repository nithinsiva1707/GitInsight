const { ApiError } = require("../utils/helpers");

const GITHUB_USERNAME_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

const validateUsernameParam = (req, _res, next) => {
  const username = String(req.params.username || "").trim();
  if (!GITHUB_USERNAME_REGEX.test(username)) {
    return next(new ApiError(400, "INVALID_USERNAME", "Invalid GitHub username format"));
  }
  return next();
};

const validateCompareBody = (req, _res, next) => {
  const { usernameA, usernameB } = req.body || {};

  if (!GITHUB_USERNAME_REGEX.test(String(usernameA || "").trim())) {
    return next(new ApiError(400, "INVALID_USERNAME_A", "Invalid usernameA format"));
  }
  if (!GITHUB_USERNAME_REGEX.test(String(usernameB || "").trim())) {
    return next(new ApiError(400, "INVALID_USERNAME_B", "Invalid usernameB format"));
  }

  return next();
};

module.exports = {
  validateUsernameParam,
  validateCompareBody
};
