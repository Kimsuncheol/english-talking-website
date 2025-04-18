import './globals.css'
import type { Metadata } from 'next'
import { LanguageProvider } from "@/lib/LanguageContext";
import dynamic from 'next/dynamic';
import ThemeProvider from '@/providers/ThemeProvider';
import { SettingsProvider } from '@/context/SettingsContext';

// Import the Chat component with dynamic import to avoid SSR issues
const ChatComponent = dynamic(() => import('@/components/Chat'), {
  ssr: true,
});

export const metadata: Metadata = {
  title: 'English Talking Website',
  description: 'Practice your English language skills with our AI assistant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SettingsProvider>
          <ThemeProvider>
            <LanguageProvider>
              <main className="container">
                {children}
              </main>
              <ChatComponent position="bottom-right" />
            </LanguageProvider>
          </ThemeProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}
