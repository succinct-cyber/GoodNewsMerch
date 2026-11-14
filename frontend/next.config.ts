import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'

const config: NextConfig = {
  devIndicators: false,                 // hides the "N" badge during `npm run dev`
  poweredByHeader: false,               // drops the "X-Powered-By: Next.js" header
  images: {
    dangerouslyAllowLocalIP: isDev,     // dev only — lets next/image load media from localhost:8000
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'api.goodnewsmerch.store' },
      { protocol: 'https', hostname: 'goodnewsmerch.onrender.com' },
      { protocol: 'http',  hostname: 'localhost', port: '8000' },
    ],
  },
  // Links already sitting in customers' inboxes (sent by the old Django site) keep working.
  async redirects() {
    return [
      { source: '/accounts/activate/:uid/:token',       destination: '/verify-email?uid=:uid&token=:token',    permanent: true },
      { source: '/accounts/reset-password/:uid/:token', destination: '/reset-password?uid=:uid&token=:token', permanent: true },
      { source: '/accounts/login',     destination: '/login',     permanent: true },
      { source: '/accounts/register',  destination: '/register',  permanent: true },
      { source: '/accounts/dashboard', destination: '/dashboard', permanent: true },
      { source: '/accounts/my_orders', destination: '/dashboard/orders', permanent: true },
      { source: '/store/shop',         destination: '/shop',      permanent: true },
    ]
  },
}

export default config

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
