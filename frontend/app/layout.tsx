import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  metadataBase: new URL('https://learn.xperiencewave.com'),
  title: {
    default: 'Wave Academy - Learning Platform',
    template: '%s | Wave Academy',
  },
  description: 'Transform your learning journey with Wave Academy',
  openGraph: {
    type: 'website',
    siteName: 'Wave Academy',
    title: 'Wave Academy - Learning Platform',
    description: 'Transform your learning journey with Wave Academy',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
