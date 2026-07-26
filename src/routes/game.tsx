import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLang, useGame } from "@/lib/store";
import { T, roleKey } from "@/i18n/translations";
import { ROLE_MAP, ROLES, type RoleId } from "@/lib/roles";
import { useEffect, useMemo, useState } from "react";
import moderatorImg from "@/assets/moderator.jpg";

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

type NightLog = {
  wolvesTarget?: string | null;
  defenderProtected?: string | null;
  defenderShieldActive?: boolean;
  witchSaved?: boolean;
  witchPoisoned?: string | null;
  seerChecked?: string | null;
  cupidLovers?: [string, string] | null;
  jailerLocked?: string | null;
  ravenCursed?: string | null;
  wildModel?: string | null;
  infected?: string | null;
};

type Phase = "night" | "report" | "day";

// Power-history keys tracked across the whole game (per-role, per-action).
// Wolves are intentionally excluded — they can attack any living player every night.
// Salvateur has its own dedicated history + ultimate-shield logic.
type PowerKey = "seer" | "jailer" | "raven" | "wild" | "cupid" | "witchSave" | "witchKill";

function actionKind(id: RoleId): "wolves" | "seer" | "witch" | "defender" | "cupid" | "jailer" | "raven" | "wild" | "none" {
  switch (id) {
    case "loup-garou": return "wolves";
    case "voyant": return "seer";
    case "sorciere": return "witch";
    case "salvateur": return "defender";
    case "cupidon": return "cupid";
    case "geolier": return "jailer";
    case "corbeau": return "raven";
    case "enfant-sauvage": return "wild";
    default: return "none";
  }
}

function computeWinner(
  alive: string[],
  assignments: { player: string; role: RoleId }[],
): "village" | "loups" | null {
  const teams = alive.map((p) => ROLE_MAP[assignments.find((a) => a.player === p)!.role].team);
  const wolves = teams.filter((t) => t === "loups").length;
  const nonWolves = teams.length - wolves;
  if (wolves === 0) return "village";
  if (wolves >= nonWolves) return "loups";
  return null;
}

function Game() {
  const { lang } = useLang();
  const { game, reset } = useGame();
  const t = T[lang];
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>("night");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [dead, setDead] = useState<Set<string>>(new Set());
  const [round, setRound] = useState(1);
  const [nightLog, setNightLog] = useState<NightLog>({});

  // Power tracking (persist for the whole game).
  // Each key stores the set of players already targeted by that power.
  const [powerHistory, setPowerHistory] = useState<Record<PowerKey, Set<string>>>({
    seer: new Set(),
    jailer: new Set(),
    raven: new Set(),
    wild: new Set(),
    cupid: new Set(),
    witchSave: new Set(),
    witchKill: new Set(),
  });
  const [defenderHistory, setDefenderHistory] = useState<Set<string>>(new Set());
  const [defenderShieldUsed, setDefenderShieldUsed] = useState(false);
  const [defenderPowerless, setDefenderPowerless] = useState(false);

  const nightPhases = useMemo(() => {
    const usedRoles = new Set(game.assignments.map((a) => a.role));
    return ROLES.filter((r) => usedRoles.has(r.id) && r.id !== "villageois" && r.id !== "idiot-village")
      .sort((a, b) => a.order - b.order);
  }, [game.assignments]);

  const currentRole = phase === "night" ? nightPhases[phaseIdx] : null;
  const upcoming = phase === "night" ? nightPhases.slice(phaseIdx + 1) : [];

  const alivePlayers = game.assignments
    .map((a) => a.player)
    .filter((p) => !dead.has(p));

  const winner = computeWinner(alivePlayers, game.assignments);

  const playersForRole = (roleId: string) =>
    game.assignments.filter((a) => a.role === roleId).map((a) => a.player);

  const toggleDead = (name: string) => {
    setDead((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name); else n.add(name);
      return n;
    });
  };

  const nextNightPhase = () => {
    // Commit power-target history for the role that just played.
    const role = currentRole;
    if (role) {
      const additions: Partial<Record<PowerKey, string[]>> = {};
      if (role.id === "voyant" && nightLog.seerChecked) additions.seer = [nightLog.seerChecked];
      if (role.id === "geolier" && nightLog.jailerLocked) additions.jailer = [nightLog.jailerLocked];
      if (role.id === "corbeau" && nightLog.ravenCursed) additions.raven = [nightLog.ravenCursed];
      if (role.id === "enfant-sauvage" && nightLog.wildModel) additions.wild = [nightLog.wildModel];
      if (role.id === "cupidon" && nightLog.cupidLovers) additions.cupid = [...nightLog.cupidLovers];
      if (role.id === "sorciere") {
        if (nightLog.witchSaved && nightLog.wolvesTarget) additions.witchSave = [nightLog.wolvesTarget];
        if (nightLog.witchPoisoned) additions.witchKill = [nightLog.witchPoisoned];
      }
      if (Object.keys(additions).length) {
        setPowerHistory((prev) => {
          const next = { ...prev };
          (Object.keys(additions) as PowerKey[]).forEach((k) => {
            next[k] = new Set(prev[k]);
            additions[k]!.forEach((p) => next[k].add(p));
          });
          return next;
        });
      }
      if (role.id === "salvateur" && !defenderPowerless) {
        if (nightLog.defenderShieldActive) {
          setDefenderShieldUsed(true);
          setDefenderPowerless(true);
        } else if (nightLog.defenderProtected) {
          setDefenderHistory((prev) => new Set(prev).add(nightLog.defenderProtected!));
        }
      }
    }


    if (phaseIdx < nightPhases.length - 1) {
      setPhaseIdx((i) => i + 1);
    } else {
      // Resolve deaths
      const deaths = new Set<string>();
      const victim = nightLog.wolvesTarget;
      const shielded = !!nightLog.defenderShieldActive;
      if (
        victim &&
        !shielded &&
        victim !== nightLog.defenderProtected &&
        !nightLog.witchSaved &&
        victim !== nightLog.jailerLocked
      ) {
        deaths.add(victim);
      }
      if (nightLog.witchPoisoned) deaths.add(nightLog.witchPoisoned);
      if (deaths.size) {
        setDead((prev) => {
          const n = new Set(prev);
          deaths.forEach((d) => n.add(d));
          return n;
        });
      }
      setPhase("report");
    }
  };

  const beginDay = () => setPhase("day");

  const startNextNight = () => {
    setNightLog({});
    setPhaseIdx(0);
    setRound((r) => r + 1);
    setPhase("night");
  };

  const endGame = () => {
    reset();
    nav({ to: "/" });
  };

  // ------------ RENDER ------------
  return (
    <main className="min-h-[100dvh] bg-hero px-5 pb-32 pt-6">
      <header className="mx-auto flex max-w-md items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <img
            src={moderatorImg}
            alt={t.moderator}
            width={40}
            height={40}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/50"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {t.moderator}
            </span>
            <span className="text-xs font-semibold">
              {t.round} {round}
            </span>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            phase === "day"
              ? "bg-accent/20 text-accent"
              : phase === "report"
                ? "bg-moon/20 text-moon"
                : "bg-primary/20 text-primary"
          }`}
        >
          {phase === "day" ? "☀ " + t.day : phase === "report" ? "📜 " + t.nightReport : "🌙 " + t.night}
        </span>
      </header>

      {winner && <WinnerBanner winner={winner} t={t} onEnd={endGame} />}

      {phase === "night" && currentRole && (
        <NightView
          role={currentRole}
          upcoming={upcoming}
          t={t}
          playersForRole={playersForRole}
          alivePlayers={alivePlayers}
          nightLog={nightLog}
          setNightLog={setNightLog}
          powerHistory={powerHistory}
          defenderHistory={defenderHistory}
          defenderShieldUsed={defenderShieldUsed}
          defenderPowerless={defenderPowerless}
        />
      )}

      {phase === "report" && (
        <ReportView
          t={t}
          log={nightLog}
          deathsAll={dead}
          assignments={game.assignments}
        />
      )}

      {phase === "day" && (
        <DayView t={t} />
      )}

      {/* Roster always visible */}
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

      {/* Cemetery — night only */}
      {phase === "night" && dead.size > 0 && (
        <section className="mx-auto mt-6 max-w-md">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <SkullIcon className="h-4 w-4 text-blood" />
            <span>{t.cemetery}</span>
            <span className="text-muted-foreground/60">· {dead.size}</span>
          </div>
          <div className="card-elevated rounded-3xl border border-blood/30 p-3">
            <ul className="flex flex-wrap gap-2">
              {game.assignments
                .filter((a) => dead.has(a.player))
                .map((a) => {
                  const role = ROLE_MAP[a.role];
                  return (
                    <li
                      key={a.player}
                      className="flex items-center gap-2 rounded-2xl border border-blood/30 bg-blood/10 px-3 py-1.5"
                    >
                      <SkullIcon className="h-4 w-4 text-blood" />
                      <span className="text-xs font-medium line-through decoration-blood/70">
                        {a.player}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {t[roleKey(role.id)]}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </div>
        </section>
      )}



      {/* Sticky footer controls */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/85 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md gap-2">
          <button
            onClick={endGame}
            className="rounded-2xl border border-border bg-card/60 px-4 py-4 text-sm font-medium text-muted-foreground"
          >
            {t.endGame}
          </button>
          {phase === "night" && (
            <button
              onClick={nextNightPhase}
              className="flex-1 rounded-2xl bg-gradient-primary animate-gradient-shift px-6 py-4 text-base font-semibold text-primary-foreground ring-glow"
            >
              {phaseIdx === nightPhases.length - 1 ? t.endNight : t.nextPhase} →
            </button>
          )}
          {phase === "report" && (
            <button
              onClick={beginDay}
              className="flex-1 rounded-2xl bg-gradient-primary animate-gradient-shift px-6 py-4 text-base font-semibold text-primary-foreground ring-glow"
            >
              {t.beginDay} ☀
            </button>
          )}
          {phase === "day" && (
            <button
              onClick={startNextNight}
              className="flex-1 rounded-2xl bg-gradient-primary animate-gradient-shift px-6 py-4 text-base font-semibold text-primary-foreground ring-glow"
            >
              {t.beginNight} 🌙
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function SkullIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 2a9 9 0 0 0-9 9c0 3.1 1.6 5.8 4 7.4V21a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2.6c2.4-1.6 4-4.3 4-7.4a9 9 0 0 0-9-9Z" />
      <circle cx="9" cy="12" r="1.6" fill="currentColor" />
      <circle cx="15" cy="12" r="1.6" fill="currentColor" />
      <path d="M10 17h4M9.5 19.5v2M12 19.5v2M14.5 19.5v2" />
    </svg>
  );
}

// ==================== WINNER BANNER ====================
function WinnerBanner({
  winner, t, onEnd,
}: {
  winner: "village" | "loups";
  t: Record<string, string>;
  onEnd: () => void;
}) {
  return (
    <section className="mx-auto mt-6 max-w-md">
      <div className="card-elevated rounded-3xl border-2 border-accent/60 bg-accent/10 p-5 text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-accent">{t.gameOver}</div>
        <h2 className="mt-2 text-2xl font-bold text-gradient bg-gradient-primary">
          {winner === "village" ? t.villageWins : t.wolvesWins}
        </h2>
        <button
          onClick={onEnd}
          className="mt-4 rounded-2xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground ring-glow"
        >
          {t.announceWinner}
        </button>
      </div>
    </section>
  );
}

// ==================== NIGHT VIEW ====================
function NightView({
  role, upcoming, t, playersForRole, alivePlayers, nightLog, setNightLog,
  powerHistory, defenderHistory, defenderShieldUsed, defenderPowerless,
}: {
  role: typeof ROLES[number];
  upcoming: typeof ROLES;
  t: Record<string, string>;
  playersForRole: (id: string) => string[];
  alivePlayers: string[];
  nightLog: NightLog;
  setNightLog: (fn: (l: NightLog) => NightLog) => void;
  powerHistory: Record<PowerKey, Set<string>>;
  defenderHistory: Set<string>;
  defenderShieldUsed: boolean;
  defenderPowerless: boolean;
}) {
  const kind = actionKind(role.id);
  return (
    <>
      <section className="mx-auto mt-6 max-w-md">
        <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          {t.playingNow}
        </div>
        <div key={role.id} className="card-elevated rounded-3xl p-5 text-center animate-in fade-in slide-in-from-bottom-4">
          <img
            src={role.image}
            alt=""
            width={512}
            height={512}
            loading="lazy"
            className="mx-auto h-40 w-40 rounded-2xl object-cover ring-2 ring-primary/40"
          />
          <h2 className="mt-4 text-2xl font-bold text-gradient bg-gradient-primary">
            {t[roleKey(role.id)]}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t[roleKey(role.id)]} {t.wakeUp}…
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {playersForRole(role.id).map((p) => (
              <span
                key={p}
                className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {p}
              </span>
            ))}
          </div>

          {/* Action UI */}
          <RoleActionUI
            role={role}
            kind={kind}
            t={t}
            alivePlayers={alivePlayers}
            nightLog={nightLog}
            setNightLog={setNightLog}
            powerHistory={powerHistory}
            defenderHistory={defenderHistory}
            defenderShieldUsed={defenderShieldUsed}
            defenderPowerless={defenderPowerless}
          />
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="mx-auto mt-6 max-w-md">
          <h3 className="mb-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {t.upNext}
          </h3>
          <ul className="flex flex-col gap-2">
            {upcoming.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card/50 p-2">
                <img src={r.image} alt="" width={44} height={44} className="h-11 w-11 rounded-xl object-cover opacity-80" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{t[roleKey(r.id)]}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {playersForRole(r.id).join(", ") || "—"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// ==================== ROLE ACTION UI ====================
function RoleActionUI({
  role, kind, t, alivePlayers, nightLog, setNightLog,
  usedPowers, witchSaveUsed, witchKillUsed, defenderHistory, defenderShieldUsed, defenderPowerless,
}: {
  role: typeof ROLES[number];
  kind: ReturnType<typeof actionKind>;
  t: Record<string, string>;
  alivePlayers: string[];
  nightLog: NightLog;
  setNightLog: (fn: (l: NightLog) => NightLog) => void;
  usedPowers: Set<RoleId>;
  witchSaveUsed: boolean;
  witchKillUsed: boolean;
  defenderHistory: Set<string>;
  defenderShieldUsed: boolean;
  defenderPowerless: boolean;
}) {
  if (kind === "none") return null;

  const label = ({
    wolves: t.action_wolves,
    seer: t.action_seer,
    defender: t.action_defender,
    cupid: t.action_cupid,
    jailer: t.action_jailer,
    raven: t.action_raven,
    wild: t.action_wild,
    witch: t.action_generic,
  } as Record<string, string>)[kind];

  // One-shot lockout (excludes wolves, salvateur, witch — those have custom rules)
  if (ONE_SHOT_ROLES.includes(role.id) && usedPowers.has(role.id)) {
    return (
      <div className="mt-5 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
        {t.powerAlreadyUsed}
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-border/60 pt-4 text-start">
      <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>

      {kind === "witch" ? (
        <WitchUI
          t={t}
          alivePlayers={alivePlayers}
          nightLog={nightLog}
          setNightLog={setNightLog}
          witchSaveUsed={witchSaveUsed}
          witchKillUsed={witchKillUsed}
        />
      ) : kind === "cupid" ? (
        <CupidUI t={t} alivePlayers={alivePlayers} nightLog={nightLog} setNightLog={setNightLog} />
      ) : kind === "defender" ? (
        <DefenderUI
          t={t}
          alivePlayers={alivePlayers}
          nightLog={nightLog}
          setNightLog={setNightLog}
          defenderHistory={defenderHistory}
          defenderShieldUsed={defenderShieldUsed}
          defenderPowerless={defenderPowerless}
        />
      ) : (
        <TargetPicker
          value={
            kind === "wolves" ? nightLog.wolvesTarget ?? null
              : kind === "seer" ? nightLog.seerChecked ?? null
              : kind === "jailer" ? nightLog.jailerLocked ?? null
              : kind === "raven" ? nightLog.ravenCursed ?? null
              : kind === "wild" ? nightLog.wildModel ?? null
              : null
          }
          onChange={(v) => setNightLog((l) => {
            const patch: NightLog = { ...l };
            if (kind === "wolves") patch.wolvesTarget = v;
            if (kind === "seer") patch.seerChecked = v;
            if (kind === "jailer") patch.jailerLocked = v;
            if (kind === "raven") patch.ravenCursed = v;
            if (kind === "wild") patch.wildModel = v;
            return patch;
          })}
          players={alivePlayers}
          t={t}
        />
      )}
    </div>
  );
}

function TargetPicker({
  value, onChange, players, t, disabledPlayers,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  players: string[];
  t: Record<string, string>;
  disabledPlayers?: Set<string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onChange(null)}
        className={`rounded-full border px-3 py-1 text-xs ${value === null ? "border-primary bg-primary/20 text-primary" : "border-border bg-card/60"}`}
      >
        {t.nobody}
      </button>
      {players.map((p) => {
        const disabled = disabledPlayers?.has(p);
        return (
          <button
            key={p}
            disabled={disabled}
            onClick={() => onChange(p)}
            className={`rounded-full border px-3 py-1 text-xs ${
              value === p ? "border-primary bg-primary/20 text-primary" : "border-border bg-card/60"
            } ${disabled ? "opacity-40 line-through cursor-not-allowed" : ""}`}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

function DefenderUI({
  t, alivePlayers, nightLog, setNightLog, defenderHistory, defenderShieldUsed, defenderPowerless,
}: {
  t: Record<string, string>;
  alivePlayers: string[];
  nightLog: NightLog;
  setNightLog: (fn: (l: NightLog) => NightLog) => void;
  defenderHistory: Set<string>;
  defenderShieldUsed: boolean;
  defenderPowerless: boolean;
}) {
  if (defenderPowerless) {
    return (
      <div className="text-center text-xs text-muted-foreground">{t.defenderPowerless}</div>
    );
  }
  const shieldOn = !!nightLog.defenderShieldActive;
  return (
    <div className="space-y-4">
      {!shieldOn && (
        <>
          <div className="text-[11px] text-muted-foreground">{t.cantProtectSame}</div>
          <TargetPicker
            value={nightLog.defenderProtected ?? null}
            onChange={(v) => setNightLog((l) => ({ ...l, defenderProtected: v }))}
            players={alivePlayers}
            t={t}
            disabledPlayers={defenderHistory}
          />
        </>
      )}
      {!defenderShieldUsed && (
        <div className="rounded-xl border border-accent/40 bg-accent/5 p-3">
          <button
            onClick={() => setNightLog((l) => ({
              ...l,
              defenderShieldActive: !l.defenderShieldActive,
              defenderProtected: !l.defenderShieldActive ? null : l.defenderProtected,
            }))}
            className={`w-full rounded-full border px-3 py-2 text-xs font-semibold ${
              shieldOn ? "border-accent bg-accent/30 text-accent" : "border-border bg-card/60"
            }`}
          >
            🛡 {shieldOn ? t.shieldActivated : t.ultimateShield}
          </button>
          <div className="mt-2 text-[10px] text-muted-foreground">{t.shieldOnceOnly}</div>
        </div>
      )}
    </div>
  );
}

function WitchUI({
  t, alivePlayers, nightLog, setNightLog, witchSaveUsed, witchKillUsed,
}: {
  t: Record<string, string>;
  alivePlayers: string[];
  nightLog: NightLog;
  setNightLog: (fn: (l: NightLog) => NightLog) => void;
  witchSaveUsed: boolean;
  witchKillUsed: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 text-xs text-muted-foreground">{t.action_witch_save}</div>
        {witchSaveUsed ? (
          <div className="text-[11px] text-muted-foreground italic">{t.powerAlreadyUsed}</div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setNightLog((l) => ({ ...l, witchSaved: true }))}
              className={`rounded-full border px-3 py-1 text-xs ${nightLog.witchSaved ? "border-primary bg-primary/20 text-primary" : "border-border bg-card/60"}`}
            >
              {t.yes}
            </button>
            <button
              onClick={() => setNightLog((l) => ({ ...l, witchSaved: false }))}
              className={`rounded-full border px-3 py-1 text-xs ${nightLog.witchSaved === false ? "border-primary bg-primary/20 text-primary" : "border-border bg-card/60"}`}
            >
              {t.no}
            </button>
          </div>
        )}
      </div>
      <div>
        <div className="mb-1.5 text-xs text-muted-foreground">{t.action_witch_kill}</div>
        {witchKillUsed ? (
          <div className="text-[11px] text-muted-foreground italic">{t.powerAlreadyUsed}</div>
        ) : (
          <TargetPicker
            value={nightLog.witchPoisoned ?? null}
            onChange={(v) => setNightLog((l) => ({ ...l, witchPoisoned: v }))}
            players={alivePlayers}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

function CupidUI({
  t, alivePlayers, nightLog, setNightLog,
}: {
  t: Record<string, string>;
  alivePlayers: string[];
  nightLog: NightLog;
  setNightLog: (fn: (l: NightLog) => NightLog) => void;
}) {
  const [a, b] = nightLog.cupidLovers ?? [null, null];
  const toggle = (p: string) => {
    const cur = [a, b].filter(Boolean) as string[];
    let next: string[];
    if (cur.includes(p)) next = cur.filter((x) => x !== p);
    else if (cur.length < 2) next = [...cur, p];
    else next = [cur[1], p];
    setNightLog((l) => ({ ...l, cupidLovers: next.length === 2 ? (next as [string, string]) : null }));
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {alivePlayers.map((p) => {
        const selected = a === p || b === p;
        return (
          <button
            key={p}
            onClick={() => toggle(p)}
            className={`rounded-full border px-3 py-1 text-xs ${selected ? "border-accent bg-accent/20 text-accent" : "border-border bg-card/60"}`}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

// ==================== NIGHT REPORT ====================
function ReportView({
  t, log, deathsAll, assignments,
}: {
  t: Record<string, string>;
  log: NightLog;
  deathsAll: Set<string>;
  assignments: { player: string; role: RoleId }[];
}) {
  // Determine tonight's deaths
  const tonight: string[] = [];
  const victim = log.wolvesTarget;
  const shielded = !!log.defenderShieldActive;
  if (
    victim &&
    !shielded &&
    victim !== log.defenderProtected &&
    !log.witchSaved &&
    victim !== log.jailerLocked
  ) tonight.push(victim);
  if (log.witchPoisoned) tonight.push(log.witchPoisoned);

  const row = (label: string, value: string | null | undefined, tone: "kill" | "save" | "info" = "info") => {
    const color = tone === "kill" ? "text-destructive" : tone === "save" ? "text-accent" : "text-primary";
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 px-3 py-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-sm font-semibold ${value ? color : "text-muted-foreground"}`}>
          {value || "—"}
        </span>
      </div>
    );
  };

  return (
    <section className="mx-auto mt-6 max-w-md">
      <div className="card-elevated rounded-3xl p-5 animate-in fade-in slide-in-from-bottom-4">
        <h2 className="text-center text-2xl font-bold text-gradient bg-gradient-primary">
          {t.nightReport}
        </h2>

        <div className="mt-5 space-y-2">
          {row(t.wolvesAttacked, log.wolvesTarget, "kill")}
          {shielded && row(t.defenderProtected, "🛡 " + t.shieldActivated, "save")}
          {!shielded && log.defenderProtected !== undefined && row(t.defenderProtected, log.defenderProtected, "save")}
          {log.witchSaved !== undefined && row(t.witchSaved, log.witchSaved ? t.yes : t.no, "save")}
          {log.witchPoisoned !== undefined && row(t.witchPoisoned, log.witchPoisoned, "kill")}
          {log.seerChecked !== undefined && row(t.seerChecked, log.seerChecked)}
          {log.jailerLocked !== undefined && row(t.jailerLocked, log.jailerLocked, "save")}
          {log.ravenCursed !== undefined && row(t.ravenCursed, log.ravenCursed)}
          {log.cupidLovers && row(t.cupidLovers, log.cupidLovers.join(" ♥ "))}
          {log.wildModel !== undefined && row(t.action_wild, log.wildModel)}
        </div>

        <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <div className="text-[10px] uppercase tracking-[0.25em] text-destructive">
            {t.deathsTonight}
          </div>
          {tonight.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">{t.noDeaths}</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {tonight.map((p) => {
                const role = assignments.find((a) => a.player === p)?.role;
                return (
                  <li key={p} className="rounded-full bg-destructive/20 px-3 py-1 text-xs font-semibold text-destructive">
                    † {p}{role ? ` — ${t[roleKey(role)]}` : ""}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {/* touch deathsAll to avoid unused-var lint */}
        <div className="sr-only">{deathsAll.size}</div>
      </div>
    </section>
  );
}

// ==================== DAY VIEW ====================
function DayView({ t }: { t: Record<string, string> }) {
  useEffect(() => {}, []);
  return (
    <section className="mx-auto mt-6 max-w-md">
      <div className="card-elevated rounded-3xl p-5 text-center">
        <div className="text-5xl">☀</div>
        <h2 className="mt-2 text-2xl font-bold text-gradient bg-gradient-primary">{t.day}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.dayPhaseInfo}</p>
      </div>
    </section>
  );
}
