import { NextRequest, NextResponse } from "next/server"

// In-memory rate limiter (per-IP, resets on server restart)
const rateLimit = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT_MAX = 100 // requests
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() || "unknown"
  return ip
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimit.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimit.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 }
  }

  entry.count++
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count)
  return { allowed: entry.count <= RATE_LIMIT_MAX, remaining }
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimit) {
    if (now > entry.resetTime) rateLimit.delete(key)
  }
}, 5 * 60 * 1000)

export function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Skip rate limiting for SSE endpoints (long-lived connections)
    if (request.nextUrl.pathname.startsWith("/api/sse/")) {
      return NextResponse.next()
    }

    const key = getRateLimitKey(request)
    const { allowed, remaining } = checkRateLimit(key)

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": RATE_LIMIT_MAX.toString(),
            "X-RateLimit-Remaining": "0",
            "Retry-After": "60",
          },
        }
      )
    }

    const response = NextResponse.next()
    response.headers.set("X-RateLimit-Limit", RATE_LIMIT_MAX.toString())
    response.headers.set("X-RateLimit-Remaining", remaining.toString())
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/:path*"],
}
