import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { useState, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import "./globals.css";
import { SettingsProvider } from "@/contexts/SettingsContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NovaDesk IT Ticket Management",
  description: "Modern IT Support Ticket Dashboard with real-time updates, SLA tracking, and knowledge base",
  manifest: "/manifest.json",
  applicationName: "NovaDesk",
  keywords: ["IT", "helpdesk", "tickets", "support", "service desk"],
  authors: [{ name: "NovaDesk Team" }],
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-neutral-950 text-neutral-50 antialiased`}>
        <SettingsProvider>
          <DigitalClock />
          {children}
        </SettingsProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

function DigitalClock() {
  const { settings } = useSettings();
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const t = new Date().toLocaleTimeString("en-US", {
        timeZone: settings.advanced.timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setTime(t);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [settings.advanced.timezone]);

  return (
    <div className="fixed top-4 right-4 z-50 glass-dark px-3 py-1 rounded-lg">
      <span className="font-mono text-sm text-neutral-300">{time}</span>
    </div>
  );
}

function ServiceWorkerRegistration() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(
                function(registration) {
                  console.log('ServiceWorker registration successful');
                },
                function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                }
              );
            });
          }
        `,
      }}
    />
  );
}