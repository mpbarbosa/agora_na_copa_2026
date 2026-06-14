import React from "react";

interface FlagProps {
  className?: string;
}

export const IranFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="200" fill="#239f40" />
    <rect y="200" width="900" height="200" fill="#ffffff" />
    <rect y="400" width="900" height="200" fill="#da0000" />
    <circle cx="450" cy="300" r="50" fill="#239f40" />
  </svg>
);
