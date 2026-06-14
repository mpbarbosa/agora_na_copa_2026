import React from "react";
interface FlagProps {
  className?: string;
}

export const AlgeriaFlag: React.FC<FlagProps> = ({
  className = "w-16 h-12",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="450" height="600" fill="#006233" />
    <rect x="450" width="450" height="600" fill="#ffffff" />
    {/* Crescent and star, centered on the dividing line */}
    <path
      fillRule="evenodd"
      d="M450 195a105 105 0 100 210 84 84 0 11 0-210z"
      fill="#d21034"
    />
    <polygon
      points="555,300 580,345 630,345 590,375 605,425 555,395 505,425 520,375 480,345 530,345"
      fill="#d21034"
    />
  </svg>
);
