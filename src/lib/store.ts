import { useEffect, useState, useCallback } from "react";
import type { Lang } from "@/i18n/translations";
import type { RoleId } from "@/lib/roles";

const LANG_KEY = "lg.lang";
const GAME_KEY = "lg.game";

export interface GameState {
  players: string[];
  roleCounts: Partial<Record<RoleId, number>>;
  assignments: { player: string; role: RoleId }[];
  phase: "setup" | "roles" | "distribute" | "play";
  currentReveal: number;
}

const EMPTY: GameState = {
  players: [],
  roleCounts: {},
  assignments: [],
  phase: "setup",
  currentReveal: 0,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, val: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

export function useLang() {
  const [lang, setLangState] = useState<Lang>("fr");
  useEffect(() => { setLangState(read<Lang>(LANG_KEY, "fr")); }, []);
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    write(LANG_KEY, l);
  }, []);
  return { lang, setLang };
}

export function useGame() {
  const [game, setGameState] = useState<GameState>(EMPTY);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setGameState(read<GameState>(GAME_KEY, EMPTY));
    setReady(true);
  }, []);
  const setGame = useCallback((updater: GameState | ((g: GameState) => GameState)) => {
    setGameState((prev) => {
      const next = typeof updater === "function" ? (updater as (g: GameState) => GameState)(prev) : updater;
      write(GAME_KEY, next);
      return next;
    });
  }, []);
  const reset = useCallback(() => {
    write(GAME_KEY, EMPTY);
    setGameState(EMPTY);
  }, []);
  return { game, setGame, reset, ready };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
