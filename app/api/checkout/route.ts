import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const OFFERS = {
  'forgem-99': {
    name: 'Forgem — kit de marque fait pour toi',
    description: 'Direction visuelle, palette, typographies et exports livrés sous 48 h.',
    amount: 9900,
    success: 'https://brand-kit-studio.pages.dev/commande.html?paid=1&offer=forgem-99',
    cancel: 'https://brand-kit-studio.pages.dev/commande.html?offer=forgem-99',
  },
  'bolide-audit-149': {
    name: 'BOLIDE — audit e-commerce express',
    description: 'Diagnostic mobile, checkout, vitesse et SEO livré sous 24 h.',
    amount: 14900,
    success: 'https://bolide-59x.pages.dev/audit?paid=1',
    cancel: 'https://bolide-59x.pages.dev/audit',
  },
} as const;

export async function GET(request: NextRequest) {
  const requestedOffer = request.nextUrl.searchParams.get('offer');
  if (!requestedOffer || !(requestedOffer in OFFERS)) {
    return NextResponse.json({ error: 'Offre inconnue' }, { status: 404 });
  }
  const offerKey = requestedOffer as keyof typeof OFFERS;
  const offer = OFFERS[offerKey];
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'Paiement non configuré' }, { status: 503 });

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('line_items[0][price_data][currency]', 'eur');
  params.set('line_items[0][price_data][unit_amount]', String(offer.amount));
  params.set('line_items[0][price_data][product_data][name]', offer.name);
  params.set('line_items[0][price_data][product_data][description]', offer.description);
  params.set('line_items[0][quantity]', '1');
  params.set('success_url', offer.success + '&session_id={CHECKOUT_SESSION_ID}');
  params.set('cancel_url', offer.cancel);
  params.set('metadata[offer_key]', offerKey);
  params.set('billing_address_collection', 'auto');

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const session = await response.json().catch(() => ({}));
  if (!response.ok || !session.url) return NextResponse.json({ error: 'Checkout indisponible' }, { status: 502 });
  return NextResponse.redirect(session.url, 303);
}
