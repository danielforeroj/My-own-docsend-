import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Internal DocSend MVP",
  description: "Lean internal document sharing platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
