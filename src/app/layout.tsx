import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AnkiDocs',
  description: 'Génère des cartes Anki et QCM à partir de tes cours',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
