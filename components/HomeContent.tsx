"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/context";

const MODULE_KEYS = ["reports", "profile", "compare", "maps", "players"] as const;
const MODULE_ICONS = {
  reports: "fa-file-lines",
  profile: "fa-user",
  compare: "fa-scale-balanced",
  maps: "fa-map-location-dot",
  players: "fa-table-list",
} as const;
const MODULE_ACCENTS = {
  reports: "#a78bfa",
  profile: "#38bdf8",
  compare: "#34d399",
  maps: "#fbbf24",
  players: "#94a3b8",
} as const;
const MODULE_HREFS = {
  reports: "/reports",
  profile: "/profile",
  compare: "/compare",
  maps: "/maps",
  players: "/players",
} as const;

const INSIGHT_KEYS = ["xpv", "xp", "grades", "analyzed", "mission"] as const;
const INSIGHT_ICONS = {
  xp: "fa-route",
  xpv: "fa-bolt",
  grades: "fa-star",
  analyzed: "fa-magnifying-glass-chart",
  mission: "fa-bullseye",
} as const;
const INSIGHT_ACCENTS = {
  xp: "#38bdf8",
  xpv: "#a78bfa",
  grades: "#fbbf24",
  analyzed: "#34d399",
  mission: "#f472b6",
} as const;

function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const targets = root.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );

    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return ref;
}

export function HomeContent() {
  const { m } = useI18n();
  const insightsRef = useScrollReveal<HTMLElement>();

  return (
    <div className="home-shell">
      <div className="home-shell-bg" aria-hidden="true" />

      <div className="container home-page">
        <section className="home-intro">
          <p className="home-eyebrow">{m.home.eyebrow}</p>
          <h1 className="home-title">
            {m.brand.nameMain}
            <span>{m.brand.nameAccent}</span>
          </h1>
          <p className="home-lead">{m.home.lead}</p>
        </section>

        <nav className="home-modules" aria-label={m.home.modulesAria}>
          {MODULE_KEYS.map((key) => {
            const mod = m.home.modules[key];
            const featured = key === "reports";
            return (
              <Link
                key={key}
                href={MODULE_HREFS[key]}
                className={`home-module-card${featured ? " home-module-featured" : ""}`}
                style={{ "--module-accent": MODULE_ACCENTS[key] } as React.CSSProperties}
              >
                <span className="home-module-icon" aria-hidden="true">
                  <i className={`fa-solid ${MODULE_ICONS[key]}`} />
                </span>
                <span className="home-module-body">
                  <span className="home-module-title">{mod.title}</span>
                  <span className="home-module-desc">{mod.description}</span>
                </span>
                <span className="home-module-arrow" aria-hidden="true">
                  <i className="fa-solid fa-arrow-right" />
                </span>
              </Link>
            );
          })}
        </nav>

        <section className="home-insights" ref={insightsRef} aria-label={m.home.insightsAria}>
          <header className="home-insights-header" data-reveal>
            <h2 className="home-insights-title">{m.home.insightsTitle}</h2>
            <p className="home-insights-lead">{m.home.insightsLead}</p>
          </header>

          <div className="home-insight-list">
            {INSIGHT_KEYS.map((key, index) => {
              const card = m.home.insights[key];
              return (
                <article
                  key={key}
                  className="home-insight-card"
                  data-reveal
                  style={
                    {
                      "--insight-accent": INSIGHT_ACCENTS[key],
                      "--reveal-delay": `${index * 90}ms`,
                    } as React.CSSProperties
                  }
                >
                  <div className="home-insight-icon" aria-hidden="true">
                    <i className={`fa-solid ${INSIGHT_ICONS[key]}`} />
                  </div>
                  <div className="home-insight-body">
                    <span className="home-insight-tag">{card.tag}</span>
                    <h3 className="home-insight-title">{card.title}</h3>
                    <p className="home-insight-text">{card.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
