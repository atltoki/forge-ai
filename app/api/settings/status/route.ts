import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const workerConfigured = Boolean(process.env.WORKER_API_URL && process.env.WORKER_API_TOKEN);
  const geminiResearchReady = Boolean(process.env.GEMINI_API_KEY && process.env.TAVILY_API_KEY);
  let workerReachable = false;

  if (process.env.WORKER_API_URL) {
    try {
      const response = await fetch(`${process.env.WORKER_API_URL.replace(/\/$/, '')}/health`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
      workerReachable = response.ok;
    } catch {
      workerReachable = false;
    }
  }

  return NextResponse.json({
    services: [
      { id: 'supabase', name: 'Supabase', ready: Boolean(supabase), detail: supabase ? 'Base de données et Auth configurées' : 'Variables Supabase manquantes' },
      { id: 'auth', name: 'Session utilisateur', ready: Boolean(user), detail: user?.email ?? 'Connexion requise' },
      { id: 'worker', name: 'Cloudflare Worker', ready: workerConfigured, healthy: workerReachable, detail: workerReachable ? 'Worker et file d’attente accessibles' : workerConfigured ? 'Configuré — diagnostic public en attente du redéploiement' : 'URL ou jeton Worker manquant' },
      { id: 'research', name: 'Recherche IA', ready: Boolean(geminiResearchReady || process.env.OPENAI_API_KEY), detail: geminiResearchReady ? 'Tavily Search + Gemini 3.1 Flash Lite' : process.env.GEMINI_API_KEY ? 'Clé Tavily manquante' : process.env.OPENAI_API_KEY ? 'OpenAI avec recherche web' : 'Aucun fournisseur configuré' },
      { id: 'callbacks', name: 'Callbacks sécurisés', ready: Boolean(process.env.WORKER_CALLBACK_TOKEN && process.env.RESEARCH_AGENT_TOKEN), detail: process.env.WORKER_CALLBACK_TOKEN && process.env.RESEARCH_AGENT_TOKEN ? 'Jetons de communication présents' : 'Jetons de callback manquants' },
      { id: 'vercel', name: 'Vercel', ready: Boolean(process.env.VERCEL), detail: process.env.VERCEL ? 'Application déployée' : 'Exécution locale' },
    ],
  });
}
