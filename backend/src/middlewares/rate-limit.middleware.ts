import { Request, Response, NextFunction } from 'express'

interface Bucket {
  count: number
  resetAt: number
}

/**
 * Minimal in-memory rate limiter (no external deps).
 * Keyed by IP, sliding fixed-window.
 * Not distributed — resets on restart. Suitable for single-instance deploys.
 */
export function rateLimit(options: { windowMs: number; max: number; message?: string }) {
  const { windowMs, max, message = 'Too many requests' } = options
  const buckets = new Map<string, Bucket>()

  // Clean stale buckets every windowMs to avoid memory leak
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key)
    }
  }, windowMs)

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown'

    const now = Date.now()
    let bucket = buckets.get(ip)

    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + windowMs }
      buckets.set(ip, bucket)
    }

    bucket.count++

    res.setHeader('X-RateLimit-Limit', max)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - bucket.count))
    res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000))

    if (bucket.count > max) {
      res.status(429).json({ error: message })
      return
    }

    next()
  }
}
