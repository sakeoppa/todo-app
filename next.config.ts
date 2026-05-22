import type { NextConfig } from 'next';
import os from 'os';

function getLocalIps(): string[] {
  const result: string[] = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        result.push(iface.address);
      }
    }
  }
  return result;
}

const localIps = getLocalIps();
const ports = [3000, 3001, 3002, 3003, 3004, 3005, 3456];
const allowedOrigins = localIps.flatMap((ip) => ports.map((port) => `${ip}:${port}`));

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: localIps,
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
      allowedOrigins,
    },
  },
};

export default nextConfig;
