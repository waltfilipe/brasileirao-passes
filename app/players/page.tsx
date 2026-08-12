import { POSITION_FAMILIES } from "@/lib/positionFamilies";
import { getMeta, getPlayers } from "@/lib/api";
import { PlayersPageContent } from "./PlayersPageContent";

type PageProps = {
  searchParams: Promise<{
    position_family?: string;
    search?: string;
  }>;
};

export default async function PlayersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  let data = { total: 0, players: [] as Awaited<ReturnType<typeof getPlayers>>["players"] };
  let filters = { leagues: [] as string[], position_groups: [] as string[] };
  let error: string | null = null;

  let positionFamilies: { key: string; label: string }[] = [...POSITION_FAMILIES];

  const family = params.position_family ?? "all";

  try {
    const [meta, playersRes] = await Promise.all([
      getMeta(family),
      getPlayers({
        position_family: family !== "all" ? family : undefined,
        search: params.search,
        limit: 500,
      }),
    ]);
    data = playersRes;
    filters = { leagues: meta.leagues, position_groups: meta.position_groups ?? [] };
    if (meta.position_families?.length) {
      positionFamilies = meta.position_families;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load players";
  }

  return (
    <PlayersPageContent
      players={data.players}
      total={data.total}
      error={error}
      family={family}
      filters={filters}
      positionFamilies={positionFamilies}
      params={{
        position_family: params.position_family,
        search: params.search,
      }}
    />
  );
}
