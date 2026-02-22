import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "bloom — Teach to Learn",
  description:
    "An AI-powered learning tool where you teach concepts to discover and fill your knowledge gaps.",
  icons: {
    icon: "/bloomlogo.png",
    apple: "/bloomlogo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
