import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLang, useGame } from "@/lib/store";
import { T, roleKey } from "@/i18n/translations";
import { ROLE_MAP, ROLES } from "@/lib/roles";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "Narrator — Loup-Garou" },
      { name: "description", content: "Guide players through the night phases and day votes." },
      { property: "og:title", content: "Narrator — Loup-Garou" },
      { property: "og:description", content: "Guide players through the night phases and day votes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Game,
});

function Game() {
  const { lang } = useLang();
  const { game, reset } = useGame();
  const t = T[lang];
  const nav = useNavigate();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [dead, setDead] = useState<Set<string>>(new Set());

  // Build night order from assigned roles (unique, ordered)
  const nightPhases = useMemo(() => {
    const usedRoles = new Set(game.assignments.map((a) => a.role));
    return ROLES.filter((r) => usedRoles.has(r.id) && r.id !== "villageois").sort(
      (a, b) => a.order - b.order,
    );
  }, [game.assignments]);

  const totalSteps = nightPhases.length + 1; // + day
  const isDay = phaseIdx >= nightPhases.length;
  const currentRole = !isDay ? nightPhases[phaseIdx] : null;

  const playersForRole = (roleId: string) =>
    game.assignments.filter((a) => a.role === roleId).map((a) => a.player);

  const toggleDead = (name: string) => {
    const n = new Set(dead);
    n.has(name) ? n.delete(name) : n.add(name);
    setDead(n);
  };

  const next = () => {
    if (phaseIdx < totalSteps - 1) setPhaseIdx((i) => i + 1);
    else setPhaseIdx(0); // loop back to night 1
  };

  const endGame = () => {
    reset();
    nav({ to: "/" });
  };

  return (
    <main className="min-h-[100dvh] bg-hero px-5 pb-24 pt-6">
      <header className="mx-auto flex max-w-md items-center justify-between">
        <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {t.narrator}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isDay ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"
          }`}
        >
          {isDay ? "☀ " + t.day : "🌙 " + t.night}
        </span>
      </header>

      <section className="mx-auto mt-6 max-w-md">
        {!isDay && currentRole ? (
          <div className="card-elevated rounded-3xl p-5 text-center animate-in fade-in slide-in-from-bottom-4">
            <img
              src={currentRole.image}
              alt=""
              width={512}
              height={512}
              loading="lazy"
              className="mx-auto h-40 w-40 rounded-2xl object-cover ring-2 ring-primary/40"
            />
            <h2 className="mt-4 text-2xl font-bold text-gradient bg-gradient-primary">
              {t[roleKey(currentRole.id)]}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t[roleKey(currentRole.id)]} {t.wakeUp}…
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {playersForRole(currentRole.id).map((p) => (
                <span
                  key={p}
                  className={`rounded-full border border-border bg-card/60 px-3 py-1 text-xs ${
                    dead.has(p) ? "line-through opacity-40" : ""
                  }`}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="card-elevated rounded-3xl p-5 text-center">
            <div className="text-5xl">☀</div>
            <h2 className="mt-2 text-2xl font-bold text-gradient bg-gradient-primary">{t.day}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.dayPhaseInfo}</p>
          </div>
        )}
      </section>

      <section className="mx-auto mt-6 max-w-md">
        <h3 className="mb-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {t.players}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {game.assignments.map((a) => {
            const role = ROLE_MAP[a.role];
            const isDead = dead.has(a.player);
            return (
              <button
                key={a.player}
                onClick={() => toggleDead(a.player)}
                className={`flex items-center gap-2 rounded-xl border p-2 text-start transition-all ${
                  isDead
                    ? "border-destructive/40 bg-destructive/10 opacity-60"
                    : "border-border bg-card/60"
                }`}
              >
                <img
                  src={role.image}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-medium ${isDead ? "line-through" : ""}`}>
                    {a.player}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {t[roleKey(role.id)]}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/85 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md gap-2">
          <button
            onClick={endGame}
            className="rounded-2xl border border-border bg-card/60 px-4 py-4 text-sm font-medium text-muted-foreground"
          >
            {t.endGame}
          </button>
          <button
            onClick={next}
            className="flex-1 rounded-2xl bg-gradient-primary animate-gradient-shift px-6 py-4 text-base font-semibold text-primary-foreground ring-glow"
          >
            {t.nextPhase} →
          </button>
        </div>
      </div>
    </main>
  );
}
