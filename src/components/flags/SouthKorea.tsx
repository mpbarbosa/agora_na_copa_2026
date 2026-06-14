import React from "react";

interface FlagProps {
  className?: string;
}

export const SouthKoreaFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="600" fill="#ffffff" />
    <g transform="translate(450 300)">
      <path d="M0 -90 A90 90 0 0 1 0 90 A45 45 0 0 0 0 -90" fill="#cd2e3a" />
      <path d="M0 90 A90 90 0 0 1 0 -90 A45 45 0 0 0 0 90" fill="#0047a0" />
      <circle cx="0" cy="-45" r="45" fill="#0047a0" />
      <circle cx="0" cy="45" r="45" fill="#cd2e3a" />
    </g>
    <g fill="#000000" transform="rotate(-28 210 160)">
      <rect x="165" y="130" width="90" height="12" rx="3" />
      <rect x="165" y="150" width="90" height="12" rx="3" />
      <rect x="165" y="170" width="90" height="12" rx="3" />
    </g>
    <g fill="#000000" transform="rotate(28 690 160)">
      <rect x="645" y="130" width="90" height="12" rx="3" />
      <rect x="645" y="150" width="36" height="12" rx="3" />
      <rect x="699" y="150" width="36" height="12" rx="3" />
      <rect x="645" y="170" width="90" height="12" rx="3" />
    </g>
    <g fill="#000000" transform="rotate(28 210 440)">
      <rect x="165" y="410" width="36" height="12" rx="3" />
      <rect x="219" y="410" width="36" height="12" rx="3" />
      <rect x="165" y="430" width="90" height="12" rx="3" />
      <rect x="165" y="450" width="36" height="12" rx="3" />
      <rect x="219" y="450" width="36" height="12" rx="3" />
    </g>
    <g fill="#000000" transform="rotate(-28 690 440)">
      <rect x="645" y="410" width="90" height="12" rx="3" />
      <rect x="645" y="430" width="36" height="12" rx="3" />
      <rect x="699" y="430" width="36" height="12" rx="3" />
      <rect x="645" y="450" width="90" height="12" rx="3" />
    </g>
  </svg>
);
