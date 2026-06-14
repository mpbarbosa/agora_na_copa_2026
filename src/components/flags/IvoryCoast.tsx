import React from "react";

interface FlagProps {
  className?: string;
}

export const IvoryCoastFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="300" height="600" fill="#f77f00" />
    <rect x="300" width="300" height="600" fill="#ffffff" />
    <rect x="600" width="300" height="600" fill="#009e60" />
  </svg>
);
