import React from "react";

interface FlagProps {
  className?: string;
}

export const SpainFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 750 500"
    className={`${className} shadow-md rounded`}
  >
    <rect width="750" height="125" fill="#c60b1e" />
    <rect y="125" width="750" height="250" fill="#ffc400" />
    <rect y="375" width="750" height="125" fill="#c60b1e" />
    {/* Coat of arms representation */}
    <rect x="150" y="200" width="40" height="60" fill="#c60b1e" rx="10" />
    <circle cx="170" cy="180" r="12" fill="#ffc400" stroke="#c60b1e" strokeWidth="3" />
  </svg>
);
