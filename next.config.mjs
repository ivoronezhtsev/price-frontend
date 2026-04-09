/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.wbbasket.ru', // Разрешает все поддомены wbbasket
      },
    ],
  },
};

export default nextConfig;
