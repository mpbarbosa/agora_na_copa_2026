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
  NetherlandsFlag,
  JapanFlag,
  IvoryCoastFlag,
  EcuadorFlag,
  SwedenFlag,
  TunisiaFlag,
  EnglandFlag,
  ItalyFlag,
  BelgiumFlag,
  CroatiaFlag,
  PolandFlag,
  UruguayFlag,
  ColombiaFlag,
  VenezuelaFlag,
  PanamaFlag,
  CostaRicaFlag,
  JamaicaFlag,
  NewZealandFlag,
  EgyptFlag,
  GhanaFlag,
  NigeriaFlag,
  CameroonFlag,
  CapeVerdeFlag,
  SaudiArabiaFlag,
  IranFlag,
  QatarFlag,
  UzbekistanFlag,
  SwitzerlandFlag,
  IraqFlag,
  NorwayFlag,
  AustriaFlag,
  JordanFlag,
  DrCongoFlag,
} from "./flags";

interface FlagIconProps {
  flag: string;
  className?: string;
  onClick?: () => void;
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
  netherlands: NetherlandsFlag,
  japan: JapanFlag,
  ivorycoast: IvoryCoastFlag,
  ecuador: EcuadorFlag,
  sweden: SwedenFlag,
  tunisia: TunisiaFlag,
  england: EnglandFlag,
  italy: ItalyFlag,
  belgium: BelgiumFlag,
  croatia: CroatiaFlag,
  poland: PolandFlag,
  uruguay: UruguayFlag,
  colombia: ColombiaFlag,
  venezuela: VenezuelaFlag,
  panama: PanamaFlag,
  costarica: CostaRicaFlag,
  jamaica: JamaicaFlag,
  newzealand: NewZealandFlag,
  egypt: EgyptFlag,
  ghana: GhanaFlag,
  nigeria: NigeriaFlag,
  cameroon: CameroonFlag,
  capeverde: CapeVerdeFlag,
  saudiarabia: SaudiArabiaFlag,
  iran: IranFlag,
  qatar: QatarFlag,
  uzbekistan: UzbekistanFlag,
  switzerland: SwitzerlandFlag,
  iraq: IraqFlag,
  norway: NorwayFlag,
  austria: AustriaFlag,
  jordan: JordanFlag,
  drcongo: DrCongoFlag,
};

export const FlagIcon: React.FC<FlagIconProps> = ({ flag, className = "w-16 h-12", onClick }) => {
  const Flag = FLAGS[flag.toLowerCase()];
  const content = Flag ? (
    <Flag className={className} />
  ) : (
    <div className={`flex items-center justify-center bg-gray-500 rounded text-white text-xs ${className}`}>
      {flag}
    </div>
  );

  if (!onClick) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver escalação de ${flag}`}
      className="cursor-pointer transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700] rounded"
    >
      {content}
    </button>
  );
};
