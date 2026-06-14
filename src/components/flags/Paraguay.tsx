import React from "react";

interface FlagProps {
  className?: string;
}

export const ParaguayFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="200" fill="#d52b1e" />
    <rect y="200" width="900" height="200" fill="#ffffff" />
    <rect y="400" width="900" height="200" fill="#0038a8" />
    <circle cx="450" cy="300" r="52" fill="#ffffff" stroke="#d4af37" strokeWidth="10" />
    <circle cx="450" cy="300" r="24" fill="#2e8b57" />
  </svg>
);
