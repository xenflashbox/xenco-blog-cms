import { NextResponse } from 'next/server'

export async function GET() {
  // Basic health check
  const health = {
    status: 'healthy',
    service: 'xenco-blog-cms',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      meilisearch: 'unknown',
    },
  }

  // Check database connection
  try {
    if (process.env.DATABASE_URL) {
      health.checks.database = 'configured'
    }
  } catch {
    health.checks.database = 'error'
  }

  // Check MeiliSearch connection
  try {
    if (process.env.MEILISEARCH_HOST) {
      const response = await fetch(`${process.env.MEILISEARCH_HOST}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      health.checks.meilisearch = response.ok ? 'healthy' : 'unhealthy'
    } else {
      health.checks.meilisearch = 'not_configured'
    }
  } catch {
    health.checks.meilisearch = 'unreachable'
  }

  return NextResponse.json(health)
}
