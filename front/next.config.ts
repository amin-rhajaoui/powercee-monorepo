import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    // Désactive l'optimisation en développement pour éviter les problèmes de port
    // L'optimisation sera active en production automatiquement
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "powercee-bucket.s3.eu-north-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
    ],
  },
  // Le rewrite a été supprimé car il ne transmet pas les cookies HttpOnly
  // Les requêtes passent maintenant par la route API /app/api/proxy/[...path]/route.ts
  // qui transmet correctement les cookies au backend
};

export default nextConfig;
