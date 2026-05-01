/**
 * Verify CRON_SECRET for secure endpoints
 */
export function verifyCronSecret(authHeader: string | null, providedSecret: string | null): boolean {
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret) {
    console.warn('CRON_SECRET not configured')
    return false
  }

  // Check Authorization header (Bearer token)
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    return token === expectedSecret
  }

  // Check query parameter
  if (providedSecret) {
    return providedSecret === expectedSecret
  }

  return false
}