const buckets = new Map();
const cleanupIntervalMs = 60 * 60 * 1000; // 1 hour
let cleanupTimer = null;

const scheduleCleanup = () => {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.expires <= now) {
        buckets.delete(key);
      }
    }
    if (buckets.size === 0) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, cleanupIntervalMs).unref?.();
};

const getClientKey = (req) =>
  req.ip ||
  req.headers['x-forwarded-for'] ||
  req.headers['x-real-ip'] ||
  req.connection?.remoteAddress ||
  'anonymous';

export const rateLimit = (options = {}) => {
  const windowMs = options.windowMs ?? 60 * 1000;
  const max = options.max ?? 60;
  const keyPrefix = options.keyPrefix ?? 'default';

  return (req, res, next) => {
    const now = Date.now();
    const clientKey = `${keyPrefix}:${getClientKey(req)}`;
    const existing = buckets.get(clientKey) ?? { count: 0, expires: now + windowMs };

    if (existing.expires <= now) {
      existing.count = 0;
      existing.expires = now + windowMs;
    }

    existing.count += 1;
    buckets.set(clientKey, existing);
    scheduleCleanup();

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - existing.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(existing.expires / 1000));

    if (existing.count > max) {
      const retryAfter = Math.max(0, Math.ceil((existing.expires - now) / 1000));
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter,
      });
    }

    return next();
  };
};

export default rateLimit;
