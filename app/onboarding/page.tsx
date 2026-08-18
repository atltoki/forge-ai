import { Shell } from '@/components/shell';
import { ClientOnboarding } from '@/components/client-onboarding';
export default async function OnboardingPage({searchParams}:{searchParams:Promise<{product?:string}>}){const {product='atlyn'}=await searchParams;return <Shell title="Bienvenue dans ton espace"><ClientOnboarding product={product}/></Shell>}
