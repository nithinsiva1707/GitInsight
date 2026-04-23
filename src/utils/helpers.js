class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const roundTo = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const normalizeScore = (value, maxReference) => {
  if (maxReference <= 0) {
    return 0;
  }
  return clamp((value / maxReference) * 100, 0, 100);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toIso = (date) => new Date(date).toISOString();

const computeDaysSince = (date) => {
  const now = Date.now();
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) {
    return Number.POSITIVE_INFINITY;
  }
  return (now - then) / (1000 * 60 * 60 * 24);
};

const safeUsername = (username) => {
  return String(username || "").trim().toLowerCase();
};

module.exports = {
  ApiError,
  clamp,
  roundTo,
  normalizeScore,
  sleep,
  toIso,
  computeDaysSince,
  safeUsername
};
