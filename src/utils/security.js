import { NextResponse } from 'next/server'

// Hardcoded whitelist of allowed domains/hosts for redirection post-auth
export const ALLOWED_REDIRECT_DOMAINS = [
  'adminasentra.netlify.app',
  'animated-cocada-cb9b93.netlify.app',
  'learn.institute.com',
  'admin.institute.com',
  'localhost:3000',
  'localhost:3001'
]

// Sanitizer to block Open Redirect attacks
export function getSafeRedirectUrl(targetUrlString, defaultFallback = '/dashboard') {
  if (!targetUrlString) return defaultFallback

  try {
    // Relative paths (e.g. /dashboard or /profile?tab=billing) are safe, as long as they don't start with double slash (protocol-relative)
    if (targetUrlString.startsWith('/') && !targetUrlString.startsWith('//')) {
      return targetUrlString
    }

    const parsedUrl = new URL(targetUrlString)
    
    // Check if the host matches exactly one of the whitelisted domains
    const isAllowed = ALLOWED_REDIRECT_DOMAINS.includes(parsedUrl.host)

    if (isAllowed) {
      return targetUrlString
    }
  } catch (error) {
    console.error('[SECURITY] Error parsing or validating redirect URL:', error)
  }

  return defaultFallback
}

// Whitelist of allowed origins for cross-origin resource sharing (CORS)
export const ALLOWED_CORS_ORIGINS = [
  'https://adminasentra.netlify.app',
  'https://animated-cocada-cb9b93.netlify.app',
  'https://learn.institute.com',
  'https://admin.institute.com',
  'http://localhost:3000',
  'http://localhost:3001'
]

// Helper to construct secure CORS headers dynamically
export function getCorsHeaders(request) {
  const origin = request.headers.get('origin')
  
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
  }

  if (origin && ALLOWED_CORS_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}
