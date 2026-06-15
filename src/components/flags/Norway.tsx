import React from "react";

interface FlagProps {
  className?: string;
}

export const NorwayFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 480" className={`${className} rounded shadow-md`}>
    <rect width="660" height="480" fill="#ba0c2f" />
    <rect x="180" width="90" height="480" fill="#ffffff" />
    <rect y="195" width="660" height="90" fill="#ffffff" />
    <rect x="205" width="40" height="480" fill="#00205b" />
    <rect y="220" width="660" height="40" fill="#00205b" />
  </svg>
);

