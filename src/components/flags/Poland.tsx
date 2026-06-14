import React from "react";

interface FlagProps {
  className?: string;
}

export const PolandFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="300" fill="#ffffff" />
    <rect y="300" width="900" height="300" fill="#dc143c" />
  </svg>
);
