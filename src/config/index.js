const dotenv = require("dotenv");

dotenv.config();

const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  githubApiBaseUrl: process.env.GITHUB_API_BASE_URL || "https://api.github.com",
  githubToken: process.env.GITHUB_TOKEN || "",
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 1200),
  redisUrl: process.env.REDIS_URL || ""
};

module.exports = config;
