import type { MetadataRoute } from "next";

/** What a phone shows when Bedrock is added to its home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bedrock",
    short_name: "Bedrock",
    description: "A personal university for engineering, from place value to the systems of frontier AI labs.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d0d",
    theme_color: "#0d0d0d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
