import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Standalone output for production deployment
   * 
   * Benefits:
   * - Drastically reduced Docker image size (~50-80% smaller)
   * - Only copies necessary files for production
   * - Includes Node.js runtime in .next/standalone
   * 
   * @see https://nextjs.org/docs/advanced-features/output-file-tracing
   */
  output: "standalone",

  /**
   * Experimental features for improved performance
   */
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  /**
   * Environment variables available at build time
   */
  env: {
    NEXT_PUBLIC_APP_NAME: "TicketRush",
  },
};

export default nextConfig;
