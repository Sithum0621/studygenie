import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Sinhala } from "next/font/google";
import { AppChrome } from "@/components/app-chrome";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSinhala = Noto_Sans_Sinhala({
  variable: "--font-sinhala",
  subsets: ["sinhala"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "StudyGenie",
  description:
    "AI education platform — tutor, notes, quizzes, saha flashcards. Web + PWA.",
  applicationName: "StudyGenie",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "StudyGenie",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSinhala.variable} h-full antialiased`}
    >
      <body
        className="min-h-full bg-[#f6f3ec] text-stone-900"
        suppressHydrationWarning
      >
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
