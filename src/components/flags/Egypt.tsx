import React from "react";

interface FlagProps {
  className?: string;
}

export const EgyptFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="200" fill="#ce1126" />
    <rect y="200" width="900" height="200" fill="#ffffff" />
    <rect y="400" width="900" height="200" fill="#000000" />
    <circle cx="450" cy="300" r="42" fill="#c09300" />
  </svg>
);
