"use client";

import { OrganizerBadgeTile } from "@/components/ui/OrganizerBadge";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  organizerBadge?: boolean;
};

export function PassScoreBadges({ organizerBadge = false }: Props) {
  const { m } = useI18n();
  if (!organizerBadge) return null;

  return (
    <section className="pass-score-badges" aria-label={m.sections.badges}>
      <h4 className="pass-score-badges-title">{m.sections.badges}</h4>
      <div className="pass-score-badges-divider" aria-hidden="true" />
      <div className="pass-score-badges-row">
        <OrganizerBadgeTile />
      </div>
    </section>
  );
}
