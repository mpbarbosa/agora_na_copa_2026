import React from "react";

interface FlagProps {
  className?: string;
}

const STAR_POINTS =
  "0,-18 4.23,-5.82 17.12,-5.56 6.85,2.22 10.58,14.56 0,7.2 -10.58,14.56 -6.85,2.22 -17.12,-5.56 -4.23,-5.82";

export const PanamaFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="600" fill="#ffffff" />
    <rect x="450" width="450" height="300" fill="#db1730" />
    <rect y="300" width="450" height="300" fill="#0033a0" />
    <polygon points={STAR_POINTS} fill="#0033a0" transform="translate(225, 150) scale(2.6)" />
    <polygon points={STAR_POINTS} fill="#db1730" transform="translate(675, 450) scale(2.6)" />
  </svg>
);
