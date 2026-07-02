import { useEffect, useMemo, useState } from "react";
import { standings } from "../data/tournament";
import type { RedditPost, RedditResponse } from "../types";
import { RedditBrandIcon } from "./RedditBrandIcon";
import { FlagIcon } from "./FlagIcon";

interface RedditPostsFeedProps {
  theme: "classic-light" | "stadium-dark";
}

const FLAG_BY_CODE = new Map(standings.map((row) => [row.code, row.flagSvg]));

const formatCount = (n: number): string =>
  n >= 1000 ? `${Number((n / 1000).toFixed(1)).toLocaleString("pt-BR")} mil` : `${n}`;

// "Repercussão no Reddit" feed on the Redes Sociais tab. Reads /api/reddit —
// curated posts enriched with live Reddit data (or the curated seed when Reddit
// is unreachable). Rendered as outbound link cards (no third-party embed), so it
// stays blocker- and offline-resilient. Renders nothing until at least one post
// is available, keeping the tab clean.
export function RedditPostsFeed({ theme }: RedditPostsFeedProps) {
  const [posts, setPosts] = useState<RedditPost[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reddit")
      .then((res) => (res.ok ? (res.json() as Promise<RedditResponse>) : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.posts)) setPosts(data.posts);
      })
      .catch(() => {
        /* feed simply stays empty on failure */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLight = theme === "classic-light";
  const shellClasses = isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#121414] border-white/10";
  const cardClasses = isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10";
  const headingClasses = isLight ? "text-slate-900" : "text-white";
  const mutedClasses = isLight ? "text-slate-500" : "text-slate-400";
  const openClasses = isLight
    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
    : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10";

  const cards = useMemo(() => posts, [posts]);

  if (cards.length === 0) return null;

  return (
    <section
      id="reddit-posts-feed"
      aria-label="Repercussão da Copa no Reddit"
      className={`mt-6 rounded-3xl border p-5 ${shellClasses}`}
    >
      <div className="flex items-center gap-2">
        <RedditBrandIcon size={20} />
        <h3 className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
          Repercussão no Reddit
        </h3>
      </div>
      <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
        O que a torcida está discutindo no Reddit
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {cards.map((post) => {
          const flag = post.teamCode ? FLAG_BY_CODE.get(post.teamCode) : undefined;
          return (
            <a
              key={post.id}
              id={`reddit-post-card-${post.id}`}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block rounded-2xl border p-3 transition ${cardClasses} ${
                isLight ? "hover:bg-slate-100" : "hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-2">
                {flag && <FlagIcon flag={flag} className="h-4 w-6 shrink-0 rounded-[2px]" />}
                <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${mutedClasses}`}>
                  {post.subreddit}
                </span>
              </div>
              <p className={`mt-1.5 font-archivo font-semibold leading-snug ${headingClasses}`}>
                {post.title}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className={`font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                  {post.score !== undefined && `▲ ${formatCount(post.score)}`}
                  {post.score !== undefined && post.numComments !== undefined && " • "}
                  {post.numComments !== undefined && `${formatCount(post.numComments)} coment.`}
                </span>
                <span
                  id={`reddit-post-open-${post.id}`}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${openClasses}`}
                >
                  <RedditBrandIcon size={13} />
                  Abrir no Reddit
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
