import React from "react";

interface FlagProps {
  className?: string;
}

export const AustriaFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" className={`${className} rounded shadow-md`}>
    <rect width="900" height="200" fill="#ed2939" />
    <rect y="200" width="900" height="200" fill="#ffffff" />
    <rect y="400" width="900" height="200" fill="#ed2939" />
  </svg>
);

