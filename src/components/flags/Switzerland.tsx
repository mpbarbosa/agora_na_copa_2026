import React from "react";

interface FlagProps {
  className?: string;
}

export const SwitzerlandFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className={`${className} rounded shadow-md`}>
    <rect width="640" height="480" fill="#d52b1e" />
    <rect x="260" y="100" width="120" height="280" fill="#ffffff" />
    <rect x="180" y="180" width="280" height="120" fill="#ffffff" />
  </svg>
);

