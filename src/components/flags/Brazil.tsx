import React from "react";

interface FlagProps {
  className?: string;
}

// Stars loosely arranged like the night sky on the real flag: Crux (Southern Cross)
// lower-left, Canis Major / Scorpius upper band, Hydra and scattered minor stars filling
// out the celestial globe, with varied radii suggesting star magnitude.
const STARS: [number, number, number][] = [
  // Crux (Southern Cross)
  [315, 310, 5.5],
  [300, 275, 4.5],
  [330, 245, 4],
  [348, 280, 3.5],
  [322, 278, 2.5],
  // Canis Major (Sirius)
  [425, 200, 6],
  [405, 185, 3],
  [440, 215, 3],
  [450, 195, 2.5],
  // Scorpius
  [370, 175, 3.5],
  [390, 165, 3],
  [410, 170, 3],
  [430, 180, 2.5],
  // Hydra
  [290, 330, 3],
  [380, 335, 3.5],
  [400, 315, 3],
  [270, 300, 2.5],
  // Scattered minor stars
  [260, 240, 2.5],
  [450, 260, 2.5],
  [340, 350, 2],
  [420, 330, 2],
  [280, 200, 2],
  [390, 300, 2],
  [310, 200, 2],
];

export const BrazilFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 720 504"
    className={`${className} shadow-md rounded`}
  >
    <rect width="720" height="504" fill="#009c3b" />
    <path d="M360 54L666 252L360 450L54 252Z" fill="#ffdf00" />
    <circle cx="360" cy="252" r="113.4" fill="#002776" />
    <path
      d="M246.6 252c0-62.6 50.8-113.4 113.4-113.4s113.4 50.8 113.4 113.4"
      fill="none"
      stroke="#ffffff"
      strokeWidth="15"
    />
    {/* Star field (Crux + surrounding constellations) */}
    {STARS.map(([cx, cy, r], i) => (
      <circle key={i} cx={cx} cy={cy} r={r} fill="#ffffff" />
    ))}
  </svg>
);
