import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Telum — AI Content Engine for Insurance Distribution',
  description: 'Transform insurance news into branded, compliance-checked content. Built for MGAs, Insurtechs, and Brokers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
