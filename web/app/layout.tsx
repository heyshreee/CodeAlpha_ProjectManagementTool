import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ProjectFlow | Build. Track. Ship.',
  description: 'A focused workspace for teams to plan, track, and ship technical work.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
