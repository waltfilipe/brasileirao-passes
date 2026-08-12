"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useTransition } from "react";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  positionFamilies: readonly { key: string; label: string }[];
  currentPositionFamily?: string;
  currentSearch?: string;
};

export function PlayersFilters({
  positionFamilies,
  currentPositionFamily,
  currentSearch,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { m } = useI18n();
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    const positionFamily = String(form.get("position_family") || "all");
    const search = String(form.get("search") || "").trim();
    if (positionFamily && positionFamily !== "all") params.set("position_family", positionFamily);
    if (search) params.set("search", search);
    startTransition(() => {
      router.push(`/players?${params.toString()}`);
    });
  }

  function clearFilters() {
    startTransition(() => {
      router.push("/players");
    });
  }

  return (
    <form className="filters" onSubmit={onSubmit}>
      <input
        name="search"
        type="search"
        placeholder={m.players.searchPlaceholder}
        defaultValue={currentSearch ?? searchParams.get("search") ?? ""}
      />
      <select
        name="position_family"
        defaultValue={currentPositionFamily ?? searchParams.get("position_family") ?? "all"}
      >
        <option value="all">{m.common.allPositions}</option>
        {positionFamilies.map((pf) => (
          <option key={pf.key} value={pf.key}>
            {pf.label}
          </option>
        ))}
      </select>
      <button type="submit" className="btn" disabled={isPending}>
        {isPending ? m.common.filtering : m.common.filter}
      </button>
      <button type="button" className="btn" style={{ background: "var(--surface-2)", color: "var(--text)" }} onClick={clearFilters}>
        {m.common.clear}
      </button>
    </form>
  );
}
