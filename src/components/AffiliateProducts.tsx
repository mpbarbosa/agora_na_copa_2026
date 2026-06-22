import { Tv, Volume2, Shirt, Popcorn, Snowflake, type LucideIcon } from "lucide-react";
import { AFFILIATE_PRODUCTS, withAffiliateTag } from "../config";
import type { AffiliateProduct } from "../types";

interface Props {
  theme: "classic-light" | "stadium-dark";
  products?: AffiliateProduct[];
}

/** Maps an AffiliateProduct.icon key to a lucide icon (deterministic across environments, unlike emoji). */
const ICONS: Record<string, LucideIcon> = {
  tv: Tv,
  soundbar: Volume2,
  shirt: Shirt,
  popcorn: Popcorn,
  snowflake: Snowflake,
};

/**
 * "Equipe para assistir à Copa" — an Amazon Associates gear strip shown under
 * the broadcast guide ("Onde Assistir") on the Ao Vivo view. Outbound links
 * carry rel="sponsored" per Google's affiliate-link guidance, and the required
 * Amazon disclosure is shown inline. The data-affiliate-id attribute is the
 * hook for GA4 click tracking added in Step 4.
 */
export function AffiliateProducts({ theme, products = AFFILIATE_PRODUCTS }: Props) {
  const isDark = theme !== "classic-light";
  const card = isDark
    ? "bg-[#121414]/95 border-white/10 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const tile = isDark
    ? "bg-white/5 border-white/10 hover:border-[#00e476]/50 hover:bg-white/10"
    : "bg-slate-50 border-slate-200 hover:border-[#009c3b]/50 hover:bg-white";
  const accent = isDark ? "text-[#00e476]" : "text-[#009c3b]";

  return (
    <section
      className={`w-full rounded-2xl border p-5 ${card}`}
      id="affiliate-products"
      aria-label="Equipe para assistir à Copa"
    >
      <div className="mb-4">
        <h3 className="font-anton text-lg uppercase tracking-wider">
          Equipe para assistir à Copa
        </h3>
        <p className={`mt-0.5 font-mono text-[10px] uppercase tracking-wider ${muted}`}>
          Gear pra curtir os jogos · link direto pra Amazon
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {products.map((p) => {
          const Icon = ICONS[p.icon] ?? Tv;
          return (
            <a
              key={p.id}
              href={withAffiliateTag(p.searchUrl)}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              data-affiliate-id={p.id}
              className={`flex flex-col gap-1 rounded-xl border p-3 transition ${tile}`}
            >
              <Icon size={24} strokeWidth={1.75} className={accent} aria-hidden="true" />
              <span className="mt-1 text-sm font-semibold leading-tight">{p.title}</span>
              <span className={`text-xs leading-snug ${muted}`}>{p.blurb}</span>
              <span className={`mt-1 text-xs font-bold ${accent}`}>Ver na Amazon →</span>
            </a>
          );
        })}
      </div>

      <p className={`mt-4 text-[11px] leading-snug ${muted}`}>
        Como Associado da Amazon, este site ganha com compras qualificadas. Preços e
        disponibilidade são definidos pela Amazon no momento da compra.
      </p>
    </section>
  );
}
