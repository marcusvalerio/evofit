/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // A rota que gera os GIFs lê as imagens do catálogo e as fontes direto do disco.
  outputFileTracingIncludes: {
    "/api/gif/[id]": ["./public/exercises/img/**", "./node_modules/geist/dist/fonts/geist-sans/Geist-{Bold,SemiBold,BlackItalic}.ttf"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // catálogo de exercícios: arquivos estáticos que só mudam com novo deploy
        source: "/exercises/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ]
  },
}

export default nextConfig
