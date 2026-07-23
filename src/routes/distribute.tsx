import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useLang, useGame } from "@/lib/store";
import { T, roleKey } from "@/i18n/translations";
import { ROLE_MAP } from "@/lib/roles";
import { useState } from "react";

export const Route = createFileRoute("/distribute")({
  head: () => ({
    meta: [
      { title: "Deal cards — Loup-Garou" },
      { name: "description", content: "Pass the phone and privately reveal each player's role." },
      { property: "og:title", content: "Deal cards — Loup-Garou" },
      { property: "og:description", content: "Pass the phone and privately reveal each player's role." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Distribute,
});

function Distribute() {
  const { lang } = useLang();
  const { game, setGame } = useGame();
  const t = T[lang];
  const nav = useNavigate();
  const [revealed, setRevealed] = useState(false);

  const idx = game.currentReveal;
  const current = game.assignments[idx];

  if (!current) {
    return (
      <main className="min-h-[100dvh] bg-hero flex items-center justify-center p-6">
        <Link to="/" className="text-sm text-muted-foreground">← {t.back}</Link>
      </main>
    );
  }

  const role = ROLE_MAP[current.role];
  const isLast = idx === game.assignments.length - 1;

  const next = () => {
    setRevealed(false);
    if (isLast) {
      setGame((g) => ({ ...g, phase: "play", currentReveal: 0 }));
      nav({ to: "/game" });
    } else {
      setGame((g) => ({ ...g, currentReveal: g.currentReveal + 1 }));
    }
  };

  return (
    <main className="min-h-[100dvh] bg-hero flex flex-col items-center justify-center px-6 py-8 text-center">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        {idx + 1} / {game.assignments.length}
      </div>

      {!revealed ? (
        <>
          <p className="mt-8 text-sm text-muted-foreground">{t.passPhone}</p>
          <h1 className="mt-2 text-4xl font-bold text-gradient bg-gradient-primary animate-gradient-shift">
            {current.player}
          </h1>
          <button
            onClick={() => setRevealed(true)}
            className="mt-12 rounded-2xl bg-gradient-primary animate-gradient-shift px-10 py-5 text-lg font-semibold text-primary-foreground ring-glow"
          >
            {t.reveal}
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t.yourRole}</p>
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-primary blur-2xl opacity-60" aria-hidden />
            <img
              src={role.image}
              alt={t[roleKey(role.id)]}
              width={320}
              height={320}
              className="relative h-64 w-64 rounded-3xl object-cover ring-2 ring-primary/60"
            />
          </div>
          <h2 className="text-3xl font-bold">{t[roleKey(role.id)]}</h2>
          <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {t["team_" + role.team]}
          </span>
          <button
            onClick={next}
            className="mt-8 rounded-2xl border border-border bg-card/70 px-8 py-4 text-base font-semibold backdrop-blur-md"
          >
            {t.doneReveal} →
          </button>
        </div>
      )}
    </main>
  );
}
