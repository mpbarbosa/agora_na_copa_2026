import React from "react";
import {
  BrazilFlag,
  FranceFlag,
  ArgentinaFlag,
  GermanyFlag,
  PortugalFlag,
  SpainFlag,
  CanadaFlag,
  BosniaHerzegovinaFlag,
  MoroccoFlag,
  SenegalFlag,
  AlgeriaFlag,
  HaitiFlag,
  ScotlandFlag,
  AustraliaFlag,
  TurkeyFlag,
  MexicoFlag,
  SouthAfricaFlag,
  SouthKoreaFlag,
  CzechiaFlag,
  UnitedStatesFlag,
  ParaguayFlag,
  CuracaoFlag,
} from "./flags";

interface FlagIconProps {
  flag: string;
  className?: string;
}

const FLAGS: Record<string, React.FC<{ className?: string }>> = {
  brazil: BrazilFlag,
  france: FranceFlag,
  argentina: ArgentinaFlag,
  germany: GermanyFlag,
  portugal: PortugalFlag,
  spain: SpainFlag,
  canada: CanadaFlag,
  bosnia: BosniaHerzegovinaFlag,
  morocco: MoroccoFlag,
  senegal: SenegalFlag,
  algeria: AlgeriaFlag,
  haiti: HaitiFlag,
  scotland: ScotlandFlag,
  australia: AustraliaFlag,
  turkey: TurkeyFlag,
  mexico: MexicoFlag,
  southafrica: SouthAfricaFlag,
  southkorea: SouthKoreaFlag,
  czechia: CzechiaFlag,
  usa: UnitedStatesFlag,
  paraguay: ParaguayFlag,
  curacao: CuracaoFlag,
};

export const FlagIcon: React.FC<FlagIconProps> = ({ flag, className = "w-16 h-12" }) => {
  const Flag = FLAGS[flag.toLowerCase()];
  if (Flag) {
    return <Flag className={className} />;
  }
  return (
    <div className={`flex items-center justify-center bg-gray-500 rounded text-white text-xs ${className}`}>
      {flag}
    </div>
  );
};
