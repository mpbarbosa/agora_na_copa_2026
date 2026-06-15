import React from "react";

interface FlagProps {
  className?: string;
}

export const DrCongoFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" className={`${className} rounded shadow-md`}>
    <rect width="900" height="600" fill="#00a3e0" />
    <polygon points="0,600 120,600 900,0 780,0" fill="#f7d117" />
    <polygon points="0,600 80,600 900,40 900,0 820,0" fill="#ef3340" />
    <polygon points="120,0 145,78 228,78 160,126 185,204 120,156 55,204 80,126 12,78 95,78" fill="#f7d117" />
  </svg>
);

