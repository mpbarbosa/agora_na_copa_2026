import React from "react";

interface FlagProps {
  className?: string;
}

export const SwedenFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="600" fill="#006aa7" />
    <rect x="250" width="100" height="600" fill="#fecc00" />
    <rect y="250" width="900" height="100" fill="#fecc00" />
  </svg>
);
