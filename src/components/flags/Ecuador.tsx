import React from "react";

interface FlagProps {
  className?: string;
}

export const EcuadorFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="300" fill="#fcd116" />
    <rect y="300" width="900" height="150" fill="#003893" />
    <rect y="450" width="900" height="150" fill="#ce1126" />
  </svg>
);
