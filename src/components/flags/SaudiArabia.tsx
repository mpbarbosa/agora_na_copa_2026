import React from "react";

interface FlagProps {
  className?: string;
}

export const SaudiArabiaFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="600" fill="#006c35" />
    {/* simplified palm tree */}
    <rect x="430" y="220" width="40" height="110" fill="#ffffff" />
    <path d="M450 220 L370 175 L450 195 L530 175 Z" fill="#ffffff" />
    {/* simplified crossed sword */}
    <rect x="250" y="410" width="400" height="22" fill="#ffffff" />
    <path d="M650 399 L700 421 L650 443 Z" fill="#ffffff" />
  </svg>
);
