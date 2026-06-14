import React from "react";

interface FlagProps {
  className?: string;
}

const STAR_POINTS =
  "0,-18 4.23,-5.82 17.12,-5.56 6.85,2.22 10.58,14.56 0,7.2 -10.58,14.56 -6.85,2.22 -17.12,-5.56 -4.23,-5.82";

export const GhanaFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="200" fill="#ce1126" />
    <rect y="200" width="900" height="200" fill="#fcd116" />
    <rect y="400" width="900" height="200" fill="#006b3f" />
    <polygon points={STAR_POINTS} fill="#000000" transform="translate(450, 300) scale(2.6)" />
  </svg>
);
