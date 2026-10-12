import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Visa Compass — Your next chapter starts here",
    template: "%s | Visa Compass",
  },
  description:
    "A calmer way to prepare for studying abroad. Organize your visa checklist, understand sources, and plan the next step with Visa Compass.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
