import { useMemo, useState } from "react";
import { news } from "../data/news";
import type { NewsArticle } from "../types";

interface NewsViewProps {
  theme: "classic-light" | "stadium-dark";
}

type NewsFilter = "Todas" | NewsArticle["category"];

const FILTERS: NewsFilter[] = ["Todas", "Sedes", "Ingressos", "Equipes", "Geral"];

const filterSlug = (filter: NewsFilter) =>
  filter
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

export function NewsView({ theme }: NewsViewProps) {
  const [activeFilter, setActiveFilter] = useState<NewsFilter>("Todas");

  const filteredNews = useMemo(
    () =>
      activeFilter === "Todas"
        ? news
        : news.filter((article) => article.category === activeFilter),
    [activeFilter],
  );

  const shellClasses =
    theme === "classic-light"
      ? "bg-white border-slate-200 shadow-sm"
      : "bg-[#121414] border-white/10";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";
  const subtleClasses = theme === "classic-light" ? "text-slate-500" : "text-slate-400";
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const activeFilterClasses =
    theme === "classic-light"
      ? "border-[#009c3b] bg-[#009c3b]/10 text-[#065f2c]"
      : "border-[#00e476] bg-[#00e476]/10 text-[#a7e6bf]";
  const idleFilterClasses =
    theme === "classic-light"
      ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      : "border-white/10 bg-white/5 text-slate-100 hover:border-white/20";

  return (
    <div className="max-w-7xl mx-auto px-4 mt-8" id="news-view">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2
            className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`}
            id="news-title"
          >
            Central de Notícias
          </h2>
          <p className={`mt-1 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
            Atualizações sobre sedes, ingressos, seleções e bastidores do Mundial
          </p>
        </div>

        <div
          className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
            theme === "classic-light"
              ? "border-slate-200 bg-slate-50 text-slate-600"
              : "border-white/10 bg-white/5 text-slate-200"
          }`}
          id="news-count-badge"
        >
          {filteredNews.length} destaques em foco
        </div>
      </div>

      <div
        className="mt-6 flex flex-wrap items-center gap-2"
        id="news-filter-bar"
      >
        {FILTERS.map((filter) => {
          const isActive = filter === activeFilter;

          return (
            <button
              key={filter}
              id={`btn-news-filter-${filterSlug(filter)}`}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`min-h-11 rounded-full border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition ${
                isActive ? activeFilterClasses : idleFilterClasses
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      <div
        className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3"
        id="news-card-grid"
      >
        {filteredNews.map((article) => (
          <article
            key={article.id}
            id={`news-card-${article.id}`}
            data-news-category={article.category}
            className={`rounded-3xl border p-5 ${shellClasses}`}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
                  theme === "classic-light"
                    ? "border-slate-200 bg-slate-50 text-slate-600"
                    : "border-white/10 bg-white/5 text-slate-200"
                }`}
              >
                {article.category}
              </span>
              <span className={`font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
                {article.date}
              </span>
            </div>

            <h3 className={`mt-4 font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
              {article.title}
            </h3>

            <p className={`mt-3 font-archivo text-sm leading-6 ${mutedClasses}`}>
              {article.summary}
            </p>

            <div
              className={`mt-4 rounded-2xl border px-4 py-4 ${
                theme === "classic-light"
                  ? "border-slate-100 bg-slate-50"
                  : "border-white/5 bg-white/5"
              }`}
            >
              <p className={`font-archivo text-sm leading-6 ${headingClasses}`}>
                {article.content}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
