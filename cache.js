// Simple TTL in-memory cache.
class TTLCache {
  constructor() {
    this.store = new Map();
  }
  get(key) {
    const e = this.store.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return e.value;
  }
  set(key, value, ttlMs) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
  async wrap(key, ttlMs, loader) {
    const c = this.get(key);
    if (c !== null) return c;
    const v = await loader();
    this.set(key, v, ttlMs);
    return v;
  }
}
module.exports = new TTLCache();
