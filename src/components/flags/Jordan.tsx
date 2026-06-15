import React from "react";

interface FlagProps {
  className?: string;
}

export const JordanFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" className={`${className} rounded shadow-md`}>
    <rect width="900" height="200" fill="#000000" />
    <rect y="200" width="900" height="200" fill="#ffffff" />
    <rect y="400" width="900" height="200" fill="#007a3d" />
    <polygon points="0,0 320,300 0,600" fill="#ce1126" />
    <circle cx="110" cy="300" r="24" fill="#ffffff" />
  </svg>
);

