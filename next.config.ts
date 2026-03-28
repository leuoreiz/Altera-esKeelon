import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  transpilePackages: ['fabric'],
  // Inclui binários do Chromium no bundle serverless da Vercel
  ...(({
    experimental: {
      outputFileTracingIncludes: {
        '/api/screenshot': ['./node_modules/@sparticuz/chromium/**/*'],
        '/api/review/submit': ['./node_modules/@sparticuz/chromium/**/*'],
      },
    },
  }) as NextConfig),
}

export default nextConfig
