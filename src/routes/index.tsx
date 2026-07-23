import { createFileRoute, Link } from "@tanstack/react-router";
import { WolfLogo } from "@/components/WolfLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SoundToggle } from "@/components/SoundToggle";
import { useLang, useGame } from "@/lib/store";
import { T } from "@/i18n/translations";
import { audio } from "@/lib/audio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loup-Garou — Village of Shadows" },
      { name: "description", content: "Offline multilingual Werewolf party game with modern AMOLED design." },
      { property: "og:title", content: "Loup-Garou — Village of Shadows" },
      { property: "og:description", content: "Offline multilingual Werewolf party game with modern AMOLED design." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { lang, setLang } = useLang();
  const { game, ready } = useGame();
  const t = T[lang];
  const hasSaved = ready && game.players.length > 0;

  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-hero flex flex-col">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-5 pt-6">
        <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {t.offline}
        </span>
        <div className="flex items-center gap-2">
          <SoundToggle autoStart />
          <LanguageSwitcher lang={lang} onChange={setLang} />
        </div>
      </header>

      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
        <WolfLogo size={260} />
        <div>
          <h1 className="text-5xl font-bold tracking-tight text-gradient animate-gradient-shift bg-gradient-primary">
            {t.appName}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{t.tagline}</p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3 pt-6">
          <Link
            to="/setup"
            onClick={() => audio.startAmbient()}
            className="w-full rounded-2xl bg-gradient-primary animate-gradient-shift px-6 py-4 text-base font-semibold text-primary-foreground ring-glow transition-transform active:scale-[0.98]"
          >
            {t.newGame}
          </Link>
          {hasSaved && (
            <Link
              to={game.phase === "play" ? "/game" : game.phase === "distribute" ? "/distribute" : game.phase === "roles" ? "/roles" : "/setup"}
              className="w-full rounded-2xl border border-border bg-card/60 px-6 py-4 text-base font-medium text-foreground backdrop-blur-md transition-colors hover:bg-card"
            >
              {t.resume}
            </Link>
          )}
        </div>
      </section>

      <footer className="relative z-10 pb-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        {t.appName} · AMOLED
      </footer>
    </main>
  );
}
