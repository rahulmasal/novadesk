import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { Toaster } from "react-hot-toast";
import { ThemeLoader } from "@/components/ThemeLoader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NovaDesk IT Ticket Management",
  description: "Modern IT Support Ticket Dashboard",
  manifest: "/manifest.json",
  applicationName: "NovaDesk",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <Toaster position="top-right" />
        <SettingsProvider>
          <ThemeLoader>{children}</ThemeLoader>
        </SettingsProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
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