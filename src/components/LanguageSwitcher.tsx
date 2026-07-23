import { LANGS, type Lang } from "@/i18n/translations";

export function LanguageSwitcher({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-border bg-card/60 p-1 backdrop-blur-md">
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => onChange(l.code)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
            lang === l.code
              ? "bg-gradient-primary text-primary-foreground ring-glow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
