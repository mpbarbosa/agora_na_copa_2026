import React from "react";

interface FlagProps {
  className?: string;
}

export const CzechiaFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="300" fill="#ffffff" />
    <rect y="300" width="900" height="300" fill="#d7141a" />
    <path d="M0 0 L360 300 L0 600 Z" fill="#11457e" />
  </svg>
);
