import React from "react";

interface FlagProps {
  className?: string;
}

export const JamaicaFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="600" fill="#fed100" />
    <polygon points="60,0 840,0 450,260" fill="#009b3a" />
    <polygon points="60,600 840,600 450,340" fill="#009b3a" />
    <polygon points="0,40 0,560 260,300" fill="#000000" />
    <polygon points="900,40 900,560 640,300" fill="#000000" />
  </svg>
);
