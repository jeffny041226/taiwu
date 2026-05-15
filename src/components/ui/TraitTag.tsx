import { TRAIT_LABELS } from "@/config/game";
import type { Trait } from "@/types/cricket";

interface TraitTagProps {
  trait: Trait;
  className?: string;
}

export function TraitTag({ trait, className = "" }: TraitTagProps) {
  const label = TRAIT_LABELS[trait] || trait;

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] text-[var(--color-gold)] bg-[var(--color-gold)]/10 font-[family-name:var(--font-noto-serif)] ${className}`}>
      {label}
    </span>
  );
}
