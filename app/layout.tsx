import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResiApp",
  description: "こころのしなやかさを、毎日少しずつ。",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png?v=2", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png?v=2", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/icon-192.png?v=2", type: "image/png", sizes: "192x192" }],
    shortcut: "/favicon-32.png?v=2",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ResiApp",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#E8895B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <div id="phone-frame">{children}</div>
      </body>
    </html>
  );
}
