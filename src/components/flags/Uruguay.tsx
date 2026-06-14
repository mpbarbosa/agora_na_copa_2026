import React from "react";

interface FlagProps {
  className?: string;
}

export const UruguayFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="600" fill="#ffffff" />
    <rect y="120" width="900" height="120" fill="#0038a8" />
    <rect y="360" width="900" height="120" fill="#0038a8" />
    <rect width="350" height="335" fill="#ffffff" />
    <circle cx="175" cy="167" r="80" fill="#fcd116" />
  </svg>
);
