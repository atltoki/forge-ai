import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Forge AI', description: 'OS d’agents IA pour missions complexes' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="fr"><body>{children}</body></html>; }
