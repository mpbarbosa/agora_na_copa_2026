import { useMemo } from "react";
import { useLocale } from "../i18n";
import {
  BROADCAST_COUNTRIES,
  countryCodeToFlagEmoji,
} from "../data/broadcastCountries";

interface BroadcastCountrySelectProps {
  /** Currently selected ISO-2 country code. */
  value: string;
  /** Called with the newly picked ISO-2 code. */
  onChange: (code: string) => void;
  theme: "classic-light" | "stadium-dark";
  /** Localized accessible label ("País de transmissão"). */
  label: string;
}

// Country picker for the broadcast guide — lets the visitor see the broadcasters
// for any of the covered countries (auto-detected by IP, overridable here). Every
// option maps to a country with real FIFA watch data (see broadcastCountries.ts).
export function BroadcastCountrySelect({
  value,
  onChange,
  theme,
  label,
}: BroadcastCountrySelectProps) {
  const { locale } = useLocale();
  const isLight = theme === "classic-light";

  // Sort by localized name so the list reads naturally in the active language.
  const options = useMemo(
    () =>
      [...BROADCAST_COUNTRIES].sort((a, b) =>
        a.name[locale].localeCompare(b.name[locale], locale),
      ),
    [locale],
  );

  return (
    <select
      id="broadcast-country-select"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      title={label}
      className={`shrink-0 cursor-pointer rounded-full border px-3 py-1.5 font-archivo text-xs font-semibold tracking-wide transition focus:outline-none focus:ring-2 ${
        isLight
          ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:ring-slate-300"
          : "border-white/10 bg-[#161919] text-slate-100 hover:border-white/20 focus:ring-white/20"
      }`}
    >
      {options.map((country) => (
        <option key={country.code} value={country.code}>
          {countryCodeToFlagEmoji(country.code)} {country.name[locale]}
        </option>
      ))}
    </select>
  );
}
