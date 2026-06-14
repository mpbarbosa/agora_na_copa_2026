import React from "react";

interface FlagProps {
  className?: string;
}

export const JapanFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="600" fill="#ffffff" />
    <circle cx="450" cy="300" r="150" fill="#bc002d" />
  </svg>
);
