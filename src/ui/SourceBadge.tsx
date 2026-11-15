import type { SourceBadge as Badge } from "../types";

/** On-screen labels. ASSUMPTION shows as "Game rule"; legend still says ASSUMPTION. */
const LABELS: Record<Badge, string> = {
  LIVE: "LIVE",
  ARCHIVED: "ARCHIVED",
  REFERENCE: "REFERENCE",
  ASSUMPTION: "Game rule",
  STORY: "STORY",
  OSDR: "OSDR",
};

type Props = {
  badge: Badge;
  className?: string;
};

export function SourceBadge({ badge, className }: Props) {
  return (
    <span
      className={`source-badge source-badge--${badge.toLowerCase()}${className ? ` ${className}` : ""}`}
      title={`Source: ${LABELS[badge]}`}
    >
      {LABELS[badge]}
    </span>
  );
}
