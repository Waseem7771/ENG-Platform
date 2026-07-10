import type { Metadata } from "next";
import { Rubik, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { getLocale, getMessages } from "@/lib/i18n";
import { dirFor } from "@/lib/i18n-shared";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "arabic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpeakPath — Your Path to Speaking English",
  description:
    "Interactive English learning for Arabic speakers — AI conversations, live sessions, and a path that fits your level.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${rubik.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider locale={locale} messages={messages}>
          {children}
          <Toaster />
        </LocaleProvider>
      </body>
    </html>
  );
}
