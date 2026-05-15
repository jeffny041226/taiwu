import { TIER_LABELS, TIER_COLORS } from "@/config/game";
import type { Tier } from "@/types/cricket";

interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

export function TierBadge({ tier, className = "" }: TierBadgeProps) {
  const colors = TIER_COLORS[tier] || TIER_COLORS.common;
  const label = TIER_LABELS[tier] || tier;

  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-noto-serif)] ${className}`}
      style={{ color: colors.text, backgroundColor: colors.bg }}
    >
      {label}
    </span>
  );
}
