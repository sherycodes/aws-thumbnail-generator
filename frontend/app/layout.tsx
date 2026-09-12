import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thumbnail Generator",
  description:
    "Upload an image and get a thumbnail back, generated serverlessly on AWS.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={`${fontSans.variable} ${geistMono.variable}`}
    >
      <body className='antialiased'>
        <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
          {children}
          <Toaster position='bottom-right' />
        </ThemeProvider>
      </body>
    </html>
  );
}
