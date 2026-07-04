import { Users } from "lucide-react";
import { useOnlineCount } from "../hooks/useOnlineCount";
import { useT } from "../i18n";

interface OnlineCountBadgeProps {
  theme: "classic-light" | "stadium-dark";
}

/**
 * Live count of fans online right now, shown beside the header title. Driven by
 * `useOnlineCount` (heartbeats `/api/presence`). Renders nothing until the first
 * count arrives, so it never flashes a placeholder.
 */
export function OnlineCountBadge({ theme }: OnlineCountBadgeProps) {
  const t = useT();
  const count = useOnlineCount();
  if (count === null) return null;

  const isLight = theme === "classic-light";

  return (
    <span
      id="online-count-badge"
      data-testid="online-count-badge"
      title={count === 1
        ? t("banners.online.titleOne", { count })
        : t("banners.online.titleMany", { count })}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
        isLight
          ? "border-[#009c3b]/30 bg-[#009c3b]/5 text-[#009c3b]"
          : "border-[#00e476]/25 bg-[#00e476]/10 text-[#00e476]"
      }`}
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      <Users size={11} aria-hidden="true" />
      <span data-testid="online-count-value">{count}</span>
      <span className="font-normal normal-case tracking-normal">{t("banners.online.label")}</span>
    </span>
  );
}
