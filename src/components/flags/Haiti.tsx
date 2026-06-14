import React from "react";

interface FlagProps {
  className?: string;
}

export const HaitiFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 800 500"
    className={`${className} shadow-md rounded`}
  >
    <rect width="800" height="250" fill="#112e8a" />
    <rect y="250" width="800" height="250" fill="#d21034" />
    <rect x="260" y="145" width="280" height="210" rx="12" fill="#ffffff" />
    <rect x="360" y="210" width="80" height="70" fill="#3aa655" />
    <rect x="394" y="165" width="12" height="125" fill="#c49b3a" />
    <path d="M330 205 L470 205 L400 160 Z" fill="#d21034" />
    <circle cx="370" cy="250" r="12" fill="#f4c542" />
    <circle cx="430" cy="250" r="12" fill="#f4c542" />
  </svg>
);
