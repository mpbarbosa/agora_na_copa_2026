import React from "react";

interface FlagProps {
  className?: string;
}

export const EnglandFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="600" fill="#ffffff" />
    <rect x="375" width="150" height="600" fill="#ce1124" />
    <rect y="225" width="900" height="150" fill="#ce1124" />
  </svg>
);
