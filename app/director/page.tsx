import { Shell } from '@/components/shell';
import { DirectorCockpit } from '@/components/director/cockpit';
import { requireUserSession } from '@/lib/supabase/session';

export const dynamic = 'force-dynamic';

export default async function DirectorPage() {
  await requireUserSession();
  return <Shell title="ATL DIRECTOR"><DirectorCockpit /></Shell>;
}
