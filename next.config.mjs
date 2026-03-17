import createNextIntlPlugin from "next-intl/plugin";


const withNextIntl = createNextIntlPlugin();

import("./env.mjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    localPatterns: [
      {
        pathname: "/api/v1/scraping/qrcode",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "unavatar.io",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  serverExternalPackages: ["postgres", "redis"],
  experimental: {
    optimizePackageImports: ["@radix-ui/react-accordion", "@radix-ui/react-alert-dialog", "@radix-ui/react-aspect-ratio", "@radix-ui/react-avatar", "@radix-ui/react-collapsible", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-label", "@radix-ui/react-popover", "@radix-ui/react-scroll-area", "@radix-ui/react-select", "@radix-ui/react-separator", "@radix-ui/react-slot", "@radix-ui/react-switch", "@radix-ui/react-tabs", "@radix-ui/react-tooltip", "lucide-react"],
    // serverActions: {
    //   allowedOrigins: ["localhost:3000", process.env.NEXT_PUBLIC_APP_URL],
    // },
  },
  rewrites() {
    return [
      {
        source: "/logo.png",
        destination: "/_static/logo-192.png",
      },
    ];
  },
  redirects() {
    return [
      {
        source: "/docs/:path*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/chat/:path*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/s",
        destination: "/",
        permanent: true,
      },
      {
        source: "/x",
        destination: "/s/x",
        permanent: true,
      },
      {
        source: "/manifest.json",
        destination: "/manifest.webmanifest",
        permanent: true,
      },
    ];
  },
};






export default withNextIntl(nextConfig);
