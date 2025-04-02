export class rateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute default
    this.maxRequests = options.maxRequests || 100; // 100 requests per window default
    this.clients = new Map();

    return (req, res, next) => {
      try {
        const clientIp = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        if (!this.clients.has(clientIp)) {
          this.clients.set(clientIp, { count: 1, resetTime: now + this.windowMs });
          return next();
        }

        const client = this.clients.get(clientIp);
        if (now > client.resetTime) {
          client.count = 1;
          client.resetTime = now + this.windowMs;
          return next();
        }

        if (client.count >= this.maxRequests) {
          return res.status(429).json({ error: 'Too many requests, please try again later' });
        }

        client.count++;
        next();
      } catch (err) {
        console.error('Rate limiter error:', err);
        next();
      }
    };
  }
}

export default rateLimiter;
