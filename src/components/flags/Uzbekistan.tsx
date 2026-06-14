import React from "react";

interface FlagProps {
  className?: string;
}

const STAR_X = [250, 320, 390, 460, 530, 600, 670];

export const UzbekistanFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="200" fill="#0099b5" />
    <rect y="200" width="900" height="200" fill="#ffffff" />
    <rect y="400" width="900" height="200" fill="#1eb53a" />
    <rect y="190" width="900" height="10" fill="#ce1126" />
    <rect y="400" width="900" height="10" fill="#ce1126" />
    <circle cx="150" cy="100" r="60" fill="#ffffff" />
    <circle cx="172" cy="90" r="54" fill="#0099b5" />
    {STAR_X.map((x, i) => (
      <circle key={i} cx={x} cy="100" r="10" fill="#ffffff" />
    ))}
  </svg>
);
