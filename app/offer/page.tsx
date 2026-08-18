import Link from 'next/link';
import { Icon } from '@/components/icons';

const offers = [
  { key: 'forgem', number: '01', eyebrow: 'Identité de marque', name: 'Forgem', promise: 'Ta marque complète, prête à publier.', description: 'Un kit cohérent généré en quelques minutes : direction visuelle, couleurs, visuels et fichiers exportables.', price: '29 €', cadence: 'paiement unique', features: ['Kit complet en quelques minutes', 'Exports prêts pour le web', 'Aucun abonnement'], checkout: 'https://buy.stripe.com/dRmfZgfHf1s2gruap55c402', demo: 'https://brand-kit-studio.pages.dev', cta: 'Créer ma marque', accent: 'lime' },
  { key: 'ugc', number: '02', eyebrow: 'Contenu e-commerce', name: 'UGC Engine', promise: 'Tes photos produit deviennent des publicités vidéo.', description: 'Des vidéos premium aux formats réseaux sociaux, fidèles à ton vrai produit et prêtes à être publiées.', price: '59 €', cadence: 'par mois', features: ['Formats 9:16, 1:1 et 4:5', 'Variantes créatives A/B', 'Résiliable à tout moment'], checkout: 'https://buy.stripe.com/bJe00i66F0nY1wAgNt5c401', demo: 'https://ugc-engine.allan-tchicaya.workers.dev', cta: 'Lancer mon studio', accent: 'violet', featured: true },
  { key: 'kern', number: '03', eyebrow: 'Opérations B2B', name: 'KERN Inbox', promise: 'Chaque email devient une action contrôlée.', description: 'KERN classe les demandes, applique tes procédures, prépare les réponses et conserve une piste d’audit complète.', price: 'Sur mesure', cadence: 'à partir de 249 €/mois', features: ['Validation humaine obligatoire', 'Procédures et checklists', 'Journal d’audit complet'], checkout: '/onboarding?product=kern-inbox', demo: 'https://kern-inbox.allan-tchicaya.workers.dev', cta: 'Demander une installation', accent: 'cyan' },
] as const;

export default function OfferPage() {
  return <main className="offer-page min-h-screen overflow-hidden px-5 py-6 text-white">
    <nav className="mx-auto flex max-w-7xl items-center justify-between">
      <Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand font-black text-[#10170a]">F</span><span><strong className="block tracking-[.08em]">FORGE AI</strong><small className="font-mono text-[8px] uppercase tracking-[.18em] text-slate-600">Product constellation</small></span></Link>
      <Link href="/auth" className="btn-ghost">Espace client</Link>
    </nav>
    <section className="mx-auto max-w-7xl pb-12 pt-20 text-center sm:pt-28">
      <span className="live-signal"><span />3 systèmes prêts à travailler</span>
      <h1 className="mx-auto mt-7 max-w-5xl text-5xl font-semibold leading-[1.02] tracking-[-.055em] sm:text-7xl">Choisis le résultat. <span className="text-brand">L’IA fait le travail.</span></h1>
      <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-400">Des produits spécialisés, déjà opérationnels, pour créer ta marque, vendre tes produits ou automatiser tes opérations.</p>
    </section>
    <section className="mx-auto grid max-w-7xl gap-5 pb-24 lg:grid-cols-3">
      {offers.map((offer) => <article key={offer.key} className={`offer-product-card offer-accent-${offer.accent} ${'featured' in offer && offer.featured ? 'offer-featured' : ''}`}>
        {'featured' in offer && offer.featured && <span className="offer-badge">Meilleur point de départ</span>}
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{offer.eyebrow}</p><h2 className="mt-3 text-2xl font-semibold tracking-[-.03em]">{offer.name}</h2></div><span className="font-mono text-xs text-slate-700">{offer.number}</span></div>
        <p className="mt-8 text-2xl font-medium leading-8 tracking-[-.025em]">{offer.promise}</p>
        <p className="mt-4 min-h-[4.5rem] text-sm leading-6 text-slate-500">{offer.description}</p>
        <div className="mt-8 border-y border-white/[.07] py-6"><strong className="block text-4xl tracking-[-.045em] text-white">{offer.price}</strong><span className="mt-1 block text-xs text-slate-600">{offer.cadence}</span></div>
        <div className="mt-6 space-y-3">{offer.features.map((feature) => <p key={feature} className="flex gap-3 text-sm text-slate-300"><span className="offer-check"><Icon name="check" size={12} /></span>{feature}</p>)}</div>
        <div className="mt-auto grid gap-3 pt-8"><a href={offer.checkout} className="btn-primary w-full">{offer.cta}<Icon name="arrow" /></a><a href={offer.demo} target="_blank" rel="noreferrer" className="btn-muted w-full">Voir la démonstration</a></div>
      </article>)}
    </section>
    <section className="mx-auto mb-20 max-w-7xl rounded-[2rem] border border-white/[.07] bg-white/[.025] p-7 md:flex md:items-center md:justify-between md:p-10"><div><p className="eyebrow">Besoin de plusieurs moteurs ?</p><h2 className="mt-3 text-2xl font-semibold">FORGE AI orchestre tout depuis un seul cockpit.</h2><p className="mt-2 text-sm text-slate-500">Prospection, contenu, validations et mesure des résultats au même endroit.</p></div><Link href="/auth" className="btn-primary mt-6 md:mt-0">Accéder au cockpit <Icon name="arrow" /></Link></section>
  </main>;
}
