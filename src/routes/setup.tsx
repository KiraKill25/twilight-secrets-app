import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLang, useGame } from "@/lib/store";
import { T } from "@/i18n/translations";
import { useEffect } from "react";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Players — Loup-Garou" },
      { name: "description", content: "Enter the player names for your Werewolf game." },
      { property: "og:title", content: "Players — Loup-Garou" },
      { property: "og:description", content: "Enter the player names for your Werewolf game." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Setup,
});

function Setup() {
  const { lang } = useLang();
  const { game, setGame, ready } = useGame();
  const nav = useNavigate();
  const t = T[lang];

  useEffect(() => {
    if (ready && game.players.length === 0) {
      setGame((g) => ({ ...g, players: ["", "", "", "", "", "", "", ""], phase: "setup" }));
    }
  }, [ready, game.players.length, setGame]);

  const update = (i: number, v: string) =>
    setGame((g) => {
      const p = [...g.players];
      p[i] = v;
      return { ...g, players: p };
    });

  const add = () => setGame((g) => ({ ...g, players: [...g.players, ""] }));
  const remove = (i: number) =>
    setGame((g) => ({ ...g, players: g.players.filter((_, idx) => idx !== i) }));

  const valid = game.players.filter((p) => p.trim()).length >= 4;

  const goNext = () => {
    const cleaned = game.players.map((p) => p.trim()).filter(Boolean);
    setGame((g) => ({ ...g, players: cleaned, phase: "roles" }));
    nav({ to: "/roles" });
  };

  return (
    <main className="min-h-[100dvh] bg-hero px-5 pb-24 pt-6">
      <Header title={t.playerNames} back="/" backLabel={t.back} />

      <div className="mx-auto mt-6 max-w-md space-y-3">
        {game.players.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-sm font-bold text-primary-foreground">
              {i + 1}
            </div>
            <input
              value={p}
              onChange={(e) => update(i, e.target.value)}
              placeholder={t.playerPlaceholder}
              className="flex-1 rounded-xl border border-border bg-input/80 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={() => remove(i)}
              aria-label={t.removePlayer}
              className="h-11 w-11 rounded-xl border border-border bg-card/60 text-muted-foreground transition-colors hover:text-destructive"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={add}
          className="mt-3 w-full rounded-xl border border-dashed border-border bg-card/40 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          + {t.addPlayer}
        </button>
      </div>

      <BottomBar>
        <button
          onClick={goNext}
          disabled={!valid}
          className="w-full rounded-2xl bg-gradient-primary animate-gradient-shift px-6 py-4 text-base font-semibold text-primary-foreground ring-glow disabled:opacity-40 disabled:ring-0"
        >
          {t.next}
        </button>
      </BottomBar>
    </main>
  );
}

export function Header({ title, back, backLabel }: { title: string; back: string; backLabel: string }) {
  return (
    <header className="mx-auto flex max-w-md items-center justify-between">
      <Link
        to={back}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← {backLabel}
      </Link>
      <h1 className="text-lg font-semibold text-gradient bg-gradient-primary">{title}</h1>
      <span className="w-12" />
    </header>
  );
}

export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/85 px-5 py-4 backdrop-blur-xl">
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  );
}
