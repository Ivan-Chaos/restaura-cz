import { CapabilitySection } from "@/components/landing/CapabilitySection";
import { Hero } from "@/components/landing/Hero";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Pricing } from "@/components/landing/Pricing";
import { StepsStrip } from "@/components/landing/StepsStrip";
import { getAsset, type MediaAsset } from "@/lib/landing/assets";
import { CAPABILITIES, STEPS } from "@/lib/landing/capabilities";
import { PLANS } from "@/lib/landing/plans";

/**
 * The whole marketing page, in the order a hesitant restaurant owner reads it:
 * what this is → what it does → how much work it is → what it costs.
 *
 * Every section is a Server Component. The only JavaScript this route ships is
 * two small leaves — the hero's optional clip and the scroll reveal — because
 * the visitor most worth catching is on a phone, on mobile data, deciding in
 * the first few seconds.
 *
 * `heroClip` is passed only when the file is actually present. That check
 * happens in the page (which can touch the filesystem at build time) and
 * arrives here as a prop, so this component stays a pure composition.
 */
export interface LandingProps {
  heroClip?: MediaAsset;
}

export function Landing({ heroClip }: LandingProps) {
  const capabilities = [...CAPABILITIES].sort((a, b) => a.order - b.order);

  return (
    <>
      <LandingHeader />

      <main>
        <Hero poster={getAsset("hero")} clip={heroClip} />

        {capabilities.map((capability) => (
          <CapabilitySection key={capability.id} capability={capability} />
        ))}

        <StepsStrip steps={STEPS} />

        <Pricing plans={PLANS} />
      </main>

      <LandingFooter />
    </>
  );
}
