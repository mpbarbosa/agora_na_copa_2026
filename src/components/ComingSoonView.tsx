import { NavItem } from "../navigation";

interface ComingSoonViewProps {
  theme: "classic-light" | "stadium-dark";
  item: NavItem;
}

export function ComingSoonView({ theme, item }: ComingSoonViewProps) {
  return (
    <div
      className="max-w-5xl mx-auto px-4 mt-8 flex flex-col items-center text-center py-20"
      id="coming-soon-view"
    >
      <span
        className={`px-3 py-1.5 rounded-full font-mono text-xs font-black uppercase tracking-[0.18em] ${
          theme === "classic-light"
            ? "bg-slate-100 text-slate-600"
            : "bg-white/10 text-[#a7e6bf]"
        }`}
        id="coming-soon-badge"
      >
        Em breve
      </span>
      <h2
        className={`mt-4 font-anton text-3xl md:text-4xl uppercase tracking-wider ${
          theme === "classic-light" ? "text-slate-900" : "text-white"
        }`}
        id="coming-soon-title"
      >
        {item.label}
      </h2>
      <p
        className={`mt-3 max-w-md font-archivo text-sm leading-6 ${
          theme === "classic-light" ? "text-slate-500" : "text-slate-300"
        }`}
        id="coming-soon-description"
      >
        {item.description}
      </p>
    </div>
  );
}
