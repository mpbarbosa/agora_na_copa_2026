import React from "react";

interface FlagProps {
  className?: string;
}

const STAR_POINTS =
  "0,-18 4.23,-5.82 17.12,-5.56 6.85,2.22 10.58,14.56 0,7.2 -10.58,14.56 -6.85,2.22 -17.12,-5.56 -4.23,-5.82";

export const CameroonFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="300" height="600" fill="#007a5e" />
    <rect x="300" width="300" height="600" fill="#ce1126" />
    <rect x="600" width="300" height="600" fill="#fcd116" />
    <polygon points={STAR_POINTS} fill="#fcd116" transform="translate(450, 300) scale(2.6)" />
  </svg>
);
