import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

class RedisClientService {
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private memoryCache: Map<string, any> = new Map();

  constructor() {
    try {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          if (times > 3) return null; // stop reconnecting if down
          return Math.min(times * 100, 1000);
        },
      });

      this.client.on("connect", () => {
        this.isConnected = true;
      });

      this.client.on("error", (err) => {
        // gracefully log without crashing
        this.isConnected = false;
      });

      this.client.connect().catch(() => {
        this.isConnected = false;
      });
    } catch {
      this.isConnected = false;
    }
  }

  async setUserOnline(userId: string): Promise<void> {
    if (this.isConnected && this.client) {
      await this.client.sadd("online_users", userId);
      await this.client.set(`user:${userId}:last_seen`, new Date().toISOString());
    } else {
      this.memoryCache.set(`user:${userId}:online`, true);
      this.memoryCache.set(`user:${userId}:last_seen`, new Date().toISOString());
    }
  }

  async setUserOffline(userId: string): Promise<void> {
    if (this.isConnected && this.client) {
      await this.client.srem("online_users", userId);
      await this.client.set(`user:${userId}:last_seen`, new Date().toISOString());
    } else {
      this.memoryCache.delete(`user:${userId}:online`);
      this.memoryCache.set(`user:${userId}:last_seen`, new Date().toISOString());
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    if (this.isConnected && this.client) {
      const isMember = await this.client.sismember("online_users", userId);
      return isMember === 1;
    }
    return !!this.memoryCache.get(`user:${userId}:online`);
  }

  async getOnlineUsers(): Promise<string[]> {
    if (this.isConnected && this.client) {
      return await this.client.smembers("online_users");
    }
    const online: string[] = [];
    Array.from(this.memoryCache.entries()).forEach(([key, val]) => {
      if (key.endsWith(":online") && val) {
        online.push(key.split(":")[1]);
      }
    });
    return online;
  }

  async setTyping(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    const key = `typing:${conversationId}:${userId}`;
    if (this.isConnected && this.client) {
      if (isTyping) {
        await this.client.set(key, "1", "EX", 5);
      } else {
        await this.client.del(key);
      }
    } else {
      if (isTyping) {
        this.memoryCache.set(key, Date.now() + 5000);
      } else {
        this.memoryCache.delete(key);
      }
    }
  }

  getRedisClient(): Redis | null {
    return this.client;
  }
}

export const redis = new RedisClientService();
export default redis;
