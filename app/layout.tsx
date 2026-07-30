import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seven. Неделя в твоем ритме",
  description: "Приватный недельный планер без регистрации.",
  icons: {
    icon: [
      { url: "/favicon-v3-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-v3.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon-v3-32.png",
    apple: "/apple-touch-icon-v3.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
