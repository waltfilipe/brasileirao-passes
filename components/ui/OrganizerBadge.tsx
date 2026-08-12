"use client";

import { Tooltip } from "@/components/ui/Tooltip";
import { useI18n } from "@/lib/i18n/context";

export function OrganizerBadgeTile() {
  const { m } = useI18n();

  return (
    <Tooltip content={m.badges.organizerTooltip}>
      <div className="pass-badge-tile pass-badge-tile-organizer" aria-label={m.badges.organizer}>
        <span className="pass-badge-tile-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="2.25" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="6" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="18" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="6" cy="16" r="1.75" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="18" cy="16" r="1.75" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M7.6 9L10.2 11M16.4 9L13.8 11M7.6 15L10.2 13M16.4 15L13.8 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="pass-badge-tile-label">{m.badges.organizer}</span>
      </div>
    </Tooltip>
  );
}
