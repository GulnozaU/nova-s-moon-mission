import type { SourceBadge as Badge } from "../types";

const LABELS: Record<Badge, string> = {
  LIVE: "LIVE",
  ARCHIVED: "ARCHIVED",
  REFERENCE: "REFERENCE",
  ASSUMPTION: "ASSUMPTION",
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
