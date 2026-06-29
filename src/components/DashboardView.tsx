interface DashboardViewProps {
  theme: "classic-light" | "stadium-dark";
}

/**
 * "Dashboard" tab — intentionally a blank placeholder for now. The nav button and
 * route are wired so the page exists; the content panel will be filled in later.
 */
export function DashboardView({ theme }: DashboardViewProps) {
  const isLight = theme === "classic-light";
  const headingClasses = isLight ? "text-slate-900" : "text-white";
  const mutedClasses = isLight ? "text-slate-600" : "text-slate-300";
  const subtleClasses = isLight ? "text-slate-500" : "text-slate-400";
  const shellClasses = isLight
    ? "bg-white border-slate-200 shadow-sm"
    : "bg-[#121414] border-white/10";

  return (
    <div className="max-w-7xl mx-auto px-4 mt-8" id="dashboard-view">
      <div>
        <h2
          className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`}
          id="dashboard-title"
        >
          Dashboard
        </h2>
        <p className={`mt-1 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
          Painel em construção
        </p>
      </div>

      <div
        className={`mt-6 flex min-h-[40vh] items-center justify-center rounded-2xl border ${shellClasses}`}
      >
        <p className={`font-mono text-xs uppercase tracking-wider ${subtleClasses}`}>
          Em breve
        </p>
      </div>
    </div>
  );
}
