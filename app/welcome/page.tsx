import type { Metadata } from 'next';
import SaasTemplate from '@/components/ui/saas-template';

export const metadata: Metadata = {
  title: 'FORGE AI — Transformez une intention en mission',
  description: 'Découvrez FORGE AI, le workspace d’agents IA qui recherche, vérifie et structure vos informations.',
};

export default function WelcomePage() {
  return <SaasTemplate />;
}
