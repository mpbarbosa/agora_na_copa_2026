import React from "react";

interface FlagProps {
  className?: string;
}

export const SouthAfricaFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="300" fill="#de3831" />
    <rect y="300" width="900" height="300" fill="#002395" />
    <path d="M0 0 L420 220 L900 220 L900 380 L420 380 L0 600 Z" fill="#ffffff" />
    <path d="M0 40 L390 240 L900 240 L900 360 L390 360 L0 560 Z" fill="#007a4d" />
    <path d="M0 0 L250 150 L250 450 L0 600 Z" fill="#000000" />
    <path d="M0 70 L175 170 L175 430 L0 530 Z" fill="#ffb612" />
  </svg>
);
