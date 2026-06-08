import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vaultocrypt",
    short_name: "Vaultocrypt",
    description: "Internal client credential workspace for MetaBox Technology.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#08111f",
    theme_color: "#08111f",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
