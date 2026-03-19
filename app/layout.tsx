import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CICS Vault | New Era University",
  description: "CICS Document Repository System — New Era University",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
