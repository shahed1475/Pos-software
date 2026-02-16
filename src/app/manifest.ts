import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FluxPOS",
    short_name: "FluxPOS",
    description: "AI-powered restaurant POS system",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#111827",
    theme_color: "#111827",
    icons: [
      {
        src: "/images/logo.jpg",
        sizes: "192x192",
        type: "image/jpeg",
      },
      {
        src: "/images/logo.jpg",
        sizes: "512x512",
        type: "image/jpeg",
      },
    ],
  }
}
