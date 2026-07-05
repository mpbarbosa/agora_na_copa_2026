// Per-match Instagram post(s) tab inside MatchDetailView's Ao Vivo view. Each
// post is a script-free InstagramPostFrame plus an outbound "open" link.
// Presentational: the parent decides visibility and passes the resolved URLs.
import { useT } from "../i18n";
import { InstagramPostFrame } from "./InstagramPostFrame";
import { InstagramBrandIcon } from "./InstagramBrandIcon";

interface MatchInstagramTabProps {
  urls: string[];
  theme: "classic-light" | "stadium-dark";
}

export function MatchInstagramTab({ urls, theme }: MatchInstagramTabProps) {
  const t = useT();

  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        theme === "classic-light"
          ? "bg-slate-50 border-slate-200"
          : "bg-[#121414]/70 border-white/10"
      }`}
      id="match-instagram-panel"
      data-testid="match-instagram"
    >
      <p
        className={`mb-3 font-anton text-base uppercase tracking-wide ${
          theme === "classic-light" ? "text-slate-900" : "text-white"
        }`}
      >
        {t("aoVivo.instagram.title")}
      </p>
      <div className="mx-auto max-w-md space-y-5">
        {urls.map((postUrl, index) => (
          <div key={postUrl} className="space-y-3">
            <InstagramPostFrame permalink={postUrl} id={`match-instagram-embed-${index}`} />
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              id={`match-instagram-open-${index}`}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                theme === "classic-light"
                  ? "border-slate-200 text-slate-700 hover:bg-white"
                  : "border-white/15 text-slate-100 hover:bg-white/10"
              }`}
            >
              <InstagramBrandIcon size={14} />
              {t("aoVivo.instagram.open")}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
