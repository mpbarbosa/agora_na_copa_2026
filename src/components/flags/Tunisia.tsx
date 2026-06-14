import React from "react";

interface FlagProps {
  className?: string;
}

export const TunisiaFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="600" fill="#e70013" />
    <circle cx="450" cy="300" r="150" fill="#ffffff" />
    <circle cx="485" cy="300" r="72" fill="#e70013" />
    <circle cx="505" cy="300" r="58" fill="#ffffff" />
    <polygon
      points="485,248 498,285 538,285 506,308 518,346 485,323 452,346 464,308 432,285 472,285"
      fill="#e70013"
    />
  </svg>
);
