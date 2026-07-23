import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLang, useGame, shuffle } from "@/lib/store";
import { T, roleKey } from "@/i18n/translations";
import { ROLES, ROLE_MAP, type RoleId } from "@/lib/roles";
import { Header, BottomBar } from "@/routes/setup";
import { useMemo } from "react";

export const Route = createFileRoute("/roles")({
  head: () => ({
    meta: [
      { title: "Roles — Loup-Garou" },
      { name: "description", content: "Choose the roles for your Werewolf game." },
      { property: "og:title", content: "Roles — Loup-Garou" },
      { property: "og:description", content: "Choose the roles for your Werewolf game." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RolesPage,
});

function RolesPage() {
  const { lang } = useLang();
  const { game, setGame } = useGame();
  const t = T[lang];
  const nav = useNavigate();

  const total = useMemo(
    () => Object.values(game.roleCounts).reduce((s, n) => s + (n ?? 0), 0),
    [game.roleCounts],
  );
  const needed = game.players.length;

  const setCount = (id: RoleId, n: number) =>
    setGame((g) => ({
      ...g,
      roleCounts: { ...g.roleCounts, [id]: Math.max(0, n) },
    }));

  const canGo = total === needed && needed > 0;

  const distribute = () => {
    const pool: RoleId[] = [];
    (Object.entries(game.roleCounts) as [RoleId, number][]).forEach(([id, n]) => {
      for (let i = 0; i < (n ?? 0); i++) pool.push(id);
    });
    const shuffled = shuffle(pool);
    const players = shuffle(game.players);
    const assignments = players.map((player, i) => ({ player, role: shuffled[i] }));
    setGame((g) => ({ ...g, assignments, phase: "distribute", currentReveal: 0 }));
    nav({ to: "/distribute" });
  };

  return (
    <main className="min-h-[100dvh] bg-hero px-5 pb-32 pt-6">
      <Header title={t.chooseRoles} back="/setup" backLabel={t.back} />

      <div className="mx-auto mt-4 max-w-md text-center text-xs text-muted-foreground">
        {t.totalRoles}: <span className={`font-bold ${total === needed ? "text-primary" : "text-accent"}`}>{total}</span> / {needed}
      </div>

      <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-3">
        {ROLES.map((r) => {
          const count = game.roleCounts[r.id] ?? 0;
          return (
            <div
              key={r.id}
              className={`card-elevated relative overflow-hidden rounded-2xl p-2 transition-all ${
                count > 0 ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="relative aspect-square overflow-hidden rounded-xl">
                <img
                  src={r.image}
                  alt={t[roleKey(r.id)]}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2">
                  <div className="text-sm font-semibold">{t[roleKey(r.id)]}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t["team_" + r.team]}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  onClick={() => setCount(r.id, count - 1)}
                  className="h-8 w-8 rounded-full border border-border bg-card/60 text-foreground disabled:opacity-30"
                  disabled={count === 0}
                >
                  −
                </button>
                <span className="min-w-6 text-center text-sm font-bold">{count}</span>
                <button
                  onClick={() => setCount(r.id, count + 1)}
                  className="h-8 w-8 rounded-full bg-gradient-primary text-primary-foreground"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <BottomBar>
        {!canGo && (
          <p className="mb-2 text-center text-xs text-accent">{t.needMatch}</p>
        )}
        <button
          onClick={distribute}
          disabled={!canGo}
          className="w-full rounded-2xl bg-gradient-primary animate-gradient-shift px-6 py-4 text-base font-semibold text-primary-foreground ring-glow disabled:opacity-40 disabled:ring-0"
        >
          {t.distribute}
        </button>
      </BottomBar>
    </main>
  );
}

// Force ROLE_MAP retention (tree-shake safeguard for future logic)
void ROLE_MAP;
