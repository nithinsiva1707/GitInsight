const { createClient } = require("redis");
const config = require("../config");

class CacheService {
  constructor() {
    this.memory = new Map();
    this.redisClient = null;
    this.useRedis = Boolean(config.redisUrl);
    this.redisConnecting = false;
  }

  async connectRedisIfNeeded() {
    if (!this.useRedis || this.redisClient || this.redisConnecting) {
      return;
    }

    this.redisConnecting = true;
    try {
      this.redisClient = createClient({ url: config.redisUrl });
      this.redisClient.on("error", () => {
        this.redisClient = null;
      });
      await this.redisClient.connect();
    } catch (_error) {
      this.redisClient = null;
    } finally {
      this.redisConnecting = false;
    }
  }

  async get(key) {
    await this.connectRedisIfNeeded();

    if (this.redisClient) {
      const raw = await this.redisClient.get(key);
      return raw ? JSON.parse(raw) : null;
    }

    const existing = this.memory.get(key);
    if (!existing) {
      return null;
    }

    if (existing.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }

    return existing.value;
  }

  async set(key, value, ttlSeconds = config.cacheTtlSeconds) {
    await this.connectRedisIfNeeded();

    if (this.redisClient) {
      await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      return;
    }

    this.memory.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }
}

module.exports = new CacheService();
