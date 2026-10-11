import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Sea Birds',
  description: 'Heritage handloom sarees, silk yardage and artisanal textiles. Enquire via WhatsApp.',
  icons: {
    icon: '/sea_birds_logo.jpeg',
    shortcut: '/sea_birds_logo.jpeg',
    apple: '/sea_birds_logo.jpeg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.className}>
      <head>
        <link rel="icon" href="/sea_birds_logo.jpeg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/sea_birds_logo.jpeg" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="bg-surface font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
