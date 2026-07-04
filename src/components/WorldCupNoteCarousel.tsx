import { useRef, useState } from "react";
import { parseNoteSections } from "../utils/noteSections";
import { useLocale } from "../i18n";

interface Props {
  note: string;
  isLight: boolean;
  mutedClasses: string;
  id?: string;
}

/**
 * Renders a player's editorial worldCupNote. A single section reads as a plain
 * block; multiple sections (e.g. Leitura / Desempenho / Números) become a
 * horizontally swipeable snap carousel with dot indicators, so a long
 * multi-section note stays compact instead of a tall vertical wall. Body text
 * uses Inter (font-sans) at 15px for comfortable long-form reading.
 */
export function WorldCupNoteCarousel({ note, isLight, mutedClasses, id }: Props) {
  const { locale } = useLocale();
  const sections = parseNoteSections(note);
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Belt-and-suspenders: editorial pt-BR prose is HIDDEN in the Spanish (LATAM) thin shell.
  if (locale === "es") return null;

  const wrap = `mt-5 rounded-xl border p-3 ${
    isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/5"
  }`;
  const labelClass = `font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`;
  const bodyClass = "mt-1.5 font-sans text-[15px] leading-6";

  // Single section (or an unlabeled note) → plain block, no carousel.
  if (sections.length <= 1) {
    const s = sections[0];
    return (
      <div className={wrap} id={id} data-testid="player-leitura">
        {s && (
          <>
            <p className={labelClass}>{s.label}</p>
            <p className={bodyClass}>{s.body}</p>
          </>
        )}
      </div>
    );
  }

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className={wrap} id={id} data-testid="player-leitura">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hidden"
      >
        {sections.map((section) => (
          <div key={section.label} className="w-full shrink-0 snap-start">
            <p className={labelClass}>{section.label}</p>
            <p className={bodyClass}>{section.body}</p>
          </div>
        ))}
      </div>

      <div
        className="mt-3 flex items-center justify-center gap-1.5"
        role="tablist"
        aria-label="Seções da análise"
      >
        {sections.map((section, i) => (
          <button
            key={section.label}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={section.label}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all ${i === active ? "w-4" : "w-1.5"} ${
              i === active
                ? isLight
                  ? "bg-slate-700"
                  : "bg-white"
                : isLight
                  ? "bg-slate-300"
                  : "bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
