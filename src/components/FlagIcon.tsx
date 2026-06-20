import React from "react";

interface FlagIconProps {
  flag: string;
  className?: string;
  onClick?: () => void;
}

// Wikipedia/Wikimedia Commons is the single source of truth for all flag images.
// URLs resolve via Special:FilePath redirect → upload.wikimedia.org CDN.
const WIKIPEDIA_FLAG_FILENAMES: Record<string, string> = {
  algeria:      "Flag_of_Algeria.svg",
  argentina:    "Flag_of_Argentina.svg",
  australia:    "Flag_of_Australia_(converted).svg",
  austria:      "Flag_of_Austria.svg",
  belgium:      "Flag_of_Belgium_(civil).svg",
  bosnia:       "Flag_of_Bosnia_and_Herzegovina.svg",
  brazil:       "Flag_of_Brazil.svg",
  cameroon:     "Flag_of_Cameroon.svg",
  canada:       "Flag_of_Canada_(Pantone).svg",
  capeverde:    "Flag_of_Cape_Verde.svg",
  colombia:     "Flag_of_Colombia.svg",
  costarica:    "Flag_of_Costa_Rica_(state).svg",
  croatia:      "Flag_of_Croatia.svg",
  curacao:      "Flag_of_Curaçao.svg",
  czechia:      "Flag_of_the_Czech_Republic.svg",
  drcongo:      "Flag_of_the_Democratic_Republic_of_the_Congo.svg",
  ecuador:      "Flag_of_Ecuador.svg",
  egypt:        "Flag_of_Egypt.svg",
  england:      "Flag_of_England.svg",
  france:       "Flag_of_France.svg",
  germany:      "Flag_of_Germany.svg",
  ghana:        "Flag_of_Ghana.svg",
  haiti:        "Flag_of_Haiti.svg",
  iran:         "Flag_of_Iran.svg",
  iraq:         "Flag_of_Iraq.svg",
  italy:        "Flag_of_Italy.svg",
  ivorycoast:   "Flag_of_Côte_d'Ivoire.svg",
  jamaica:      "Flag_of_Jamaica.svg",
  japan:        "Flag_of_Japan.svg",
  jordan:       "Flag_of_Jordan.svg",
  mexico:       "Flag_of_Mexico.svg",
  morocco:      "Flag_of_Morocco.svg",
  netherlands:  "Flag_of_the_Netherlands.svg",
  newzealand:   "Flag_of_New_Zealand.svg",
  nigeria:      "Flag_of_Nigeria.svg",
  norway:       "Flag_of_Norway.svg",
  panama:       "Flag_of_Panama.svg",
  paraguay:     "Flag_of_Paraguay.svg",
  poland:       "Flag_of_Poland.svg",
  portugal:     "Flag_of_Portugal.svg",
  qatar:        "Flag_of_Qatar.svg",
  saudiarabia:  "Flag_of_Saudi_Arabia.svg",
  scotland:     "Flag_of_Scotland.svg",
  senegal:      "Flag_of_Senegal.svg",
  southafrica:  "Flag_of_South_Africa.svg",
  southkorea:   "Flag_of_South_Korea.svg",
  spain:        "Flag_of_Spain.svg",
  sweden:       "Flag_of_Sweden.svg",
  switzerland:  "Flag_of_Switzerland_(Pantone).svg",
  tunisia:      "Flag_of_Tunisia.svg",
  turkey:       "Flag_of_Turkey.svg",
  uruguay:      "Flag_of_Uruguay.svg",
  usa:          "Flag_of_the_United_States.svg",
  uzbekistan:   "Flag_of_Uzbekistan.svg",
  venezuela:    "Flag_of_Venezuela.svg",
};

const WIKIMEDIA_BASE = "https://commons.wikimedia.org/wiki/Special:FilePath/";

export const FlagIcon: React.FC<FlagIconProps> = ({ flag, className = "w-16 h-12", onClick }) => {
  const filename = WIKIPEDIA_FLAG_FILENAMES[flag.toLowerCase()];
  const src = filename ? `${WIKIMEDIA_BASE}${encodeURIComponent(filename)}` : null;

  const content = src ? (
    <img
      src={src}
      alt={flag}
      className={`object-contain ${className}`}
      loading="lazy"
    />
  ) : (
    <div className={`flex items-center justify-center bg-gray-500 rounded text-white text-xs ${className}`}>
      {flag}
    </div>
  );

  if (!onClick) return content;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver escalação de ${flag}`}
      className="cursor-pointer transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700] rounded"
    >
      {content}
    </button>
  );
};
