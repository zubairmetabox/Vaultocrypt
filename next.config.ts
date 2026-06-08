import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent clickjacking — no framing allowed from any origin
  { key: "X-Frame-Options", value: "DENY" },
  // Block MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send origin on cross-origin requests, no full URL
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Enforce HTTPS for 2 years (only active once deployed behind TLS)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Disable browser features this app never uses
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // CSP — permissive for Next.js + Clerk inline scripts/styles,
  // but blocks loading resources from arbitrary unknown origins.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js hydration + Clerk SDK both require unsafe-inline/eval on scripts
      // challenges.cloudflare.com is required for Clerk's Turnstile CAPTCHA
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://img.clerk.com",
      "font-src 'self'",
      "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev wss://*.clerk.com https://challenges.cloudflare.com",
      "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
