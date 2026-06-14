import React from "react";

interface FlagProps {
  className?: string;
}

export const CuracaoFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="600" fill="#002b7f" />
    <rect y="430" width="900" height="90" fill="#f9e814" />
    <g fill="#ffffff">
      <polygon points="165,90 175,118 204,118 181,135 190,163 165,146 140,163 149,135 126,118 155,118" />
      <polygon points="250,145 257,164 277,164 261,176 267,195 250,183 233,195 239,176 223,164 243,164" />
    </g>
  </svg>
);
