import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin • Sea Birds',
  icons: {
    icon: '/sea_birds_logo.jpeg',
    shortcut: '/sea_birds_logo.jpeg',
    apple: '/sea_birds_logo.jpeg',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
