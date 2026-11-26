import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KUKANG EV Attendance & Contribution Tracker",
    short_name: "KUKANG EV",
    description:
      "Sistem absensi QR Code dan pelaporan kontribusi tim kendaraan listrik KUKANG EV ITERA",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#090607",
    theme_color: "#090607",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}