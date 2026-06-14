import React from "react";

interface FlagProps {
  className?: string;
}

export const MexicoFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="300" height="600" fill="#006847" />
    <rect x="300" width="300" height="600" fill="#ffffff" />
    <rect x="600" width="300" height="600" fill="#ce1126" />
    <circle cx="450" cy="300" r="48" fill="#b38b4d" opacity="0.9" />
    <circle cx="450" cy="300" r="24" fill="#ffffff" />
  </svg>
);
