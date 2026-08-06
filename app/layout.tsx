import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Forge AI', description: 'Your AI operations cockpit' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="fr"><body>{children}</body></html>; }
