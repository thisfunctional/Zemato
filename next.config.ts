import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'

const nextConfig: NextConfig = {}

export default withPWA({
  dest: 'public',
  // Desativa em desenvolvimento para não interferir com hot-reload
  disable: process.env.NODE_ENV === 'development',
  // Cache apenas assets estáticos; sem modo offline complexo por agora
  workboxOptions: {
    disableDevLogs: true,
  },
})(nextConfig)
