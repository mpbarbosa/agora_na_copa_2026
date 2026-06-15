import type { StandingsRow, Stadium, BracketNode } from "../types";

// Seed tournament-wide data for the 48-team / 12-group format of the 2026
// World Cup. Standings are derived from the FINISHED matches already present
// in src/matches.json; teams that haven't played yet start at all-zero stats
// with dataSource: "seed" until a real result updates them.

function team(
  id: string,
  name: string,
  code: string,
  flagSvg: string,
  primaryColor: string,
  secondaryColor: string,
  group: string,
  stats: {
    points: number;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
  } | null
): StandingsRow {
  const zero = { points: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 };
  return {
    id,
    name,
    code,
    flagSvg,
    primaryColor,
    secondaryColor,
    group,
    ...(stats ?? zero),
    dataSource: stats ? "result" : "seed",
  };
}

export const standings: StandingsRow[] = [
  // Grupo A
  team("mex", "MÉXICO", "MEX", "mexico", "#006847", "#ce1126", "Grupo A", {
    points: 3, played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 0, goalDifference: 2,
  }),
  team("kor", "CORÉIA DO SUL", "KOR", "southkorea", "#cd2e3a", "#0047a0", "Grupo A", {
    points: 3, played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 1, goalDifference: 1,
  }),
  team("rsa", "ÁFRICA DO SUL", "RSA", "southafrica", "#007a4d", "#ffb612", "Grupo A", {
    points: 0, played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 0, goalsAgainst: 2, goalDifference: -2,
  }),
  team("cze", "TCHÉQUIA", "CZE", "czechia", "#d7141a", "#11457e", "Grupo A", {
    points: 0, played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 1, goalsAgainst: 2, goalDifference: -1,
  }),

  // Grupo B
  team("sui", "SUÍÇA", "SUI", "switzerland", "#d52b1e", "#ffffff", "Grupo B", {
    points: 1, played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 1, goalsAgainst: 1, goalDifference: 0,
  }),
  team("can", "CANADÁ", "CAN", "canada", "#ff0000", "#ffffff", "Grupo B", {
    points: 1, played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 1, goalsAgainst: 1, goalDifference: 0,
  }),
  team("qat", "CATAR", "QAT", "qatar", "#8d1b3d", "#ffffff", "Grupo B", null),
  team("bih", "BÓSNIA E HERZEGOVINA", "BIH", "bosnia", "#002395", "#fecb00", "Grupo B", {
    points: 1, played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 1, goalsAgainst: 1, goalDifference: 0,
  }),

  // Grupo C
  team("bra", "BRASIL", "BRA", "brazil", "#009c3b", "#ffdf00", "Grupo C", {
    points: 1, played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 1, goalsAgainst: 1, goalDifference: 0,
  }),
  team("sco", "ESCÓCIA", "SCO", "scotland", "#0065bd", "#ffffff", "Grupo C", {
    points: 3, played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 1, goalsAgainst: 0, goalDifference: 1,
  }),
  team("mar", "MARROCOS", "MAR", "morocco", "#c1272d", "#006233", "Grupo C", {
    points: 1, played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 1, goalsAgainst: 1, goalDifference: 0,
  }),
  team("hai", "HAITI", "HAI", "haiti", "#112e8a", "#d21034", "Grupo C", {
    points: 0, played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 0, goalsAgainst: 1, goalDifference: -1,
  }),

  // Grupo D
  team("usa", "ESTADOS UNIDOS", "USA", "usa", "#b22234", "#3c3b6e", "Grupo D", {
    points: 3, played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 4, goalsAgainst: 1, goalDifference: 3,
  }),
  team("aus", "AUSTRÁLIA", "AUS", "australia", "#012169", "#ffffff", "Grupo D", {
    points: 3, played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 0, goalDifference: 2,
  }),
  team("par", "PARAGUAI", "PAR", "paraguay", "#d52b1e", "#0038a8", "Grupo D", {
    points: 0, played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 1, goalsAgainst: 4, goalDifference: -3,
  }),
  team("tur", "TURQUIA", "TUR", "turkey", "#e30a17", "#ffffff", "Grupo D", {
    points: 0, played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 0, goalsAgainst: 2, goalDifference: -2,
  }),

  // Grupo E
  team("ger", "ALEMANHA", "GER", "germany", "#000000", "#ffce00", "Grupo E", null),
  team("cuw", "CURAÇAO", "CUW", "curacao", "#002b7f", "#f9e814", "Grupo E", null),
  team("civ", "COSTA DO MARFIM", "CIV", "ivorycoast", "#f77f00", "#009e60", "Grupo E", null),
  team("ecu", "EQUADOR", "ECU", "ecuador", "#fcd116", "#003893", "Grupo E", null),

  // Grupo F
  team("ned", "HOLANDA", "NED", "netherlands", "#ff4f00", "#ffffff", "Grupo F", null),
  team("jpn", "JAPÃO", "JPN", "japan", "#bc002d", "#ffffff", "Grupo F", null),
  team("swe", "SUÉCIA", "SWE", "sweden", "#006aa7", "#fecc00", "Grupo F", null),
  team("tun", "TUNÍSIA", "TUN", "tunisia", "#e70013", "#ffffff", "Grupo F", null),

  // Grupo G
  team("bel", "BÉLGICA", "BEL", "belgium", "#000000", "#fae042", "Grupo G", null),
  team("egy", "EGITO", "EGY", "egypt", "#ce1126", "#000000", "Grupo G", null),
  team("irn", "IRÃ", "IRN", "iran", "#239f40", "#da0000", "Grupo G", null),
  team("nzl", "NOVA ZELÂNDIA", "NZL", "newzealand", "#00247d", "#c8102e", "Grupo G", null),

  // Grupo H
  team("esp", "ESPANHA", "ESP", "spain", "#c60b1e", "#ffc400", "Grupo H", null),
  team("cpv", "CABO VERDE", "CPV", "capeverde", "#0057b8", "#cf2027", "Grupo H", null),
  team("ksa", "ARÁBIA SAUDITA", "KSA", "saudiarabia", "#006c35", "#ffffff", "Grupo H", null),
  team("uru", "URUGUAI", "URU", "uruguay", "#0038a8", "#fcd116", "Grupo H", null),

  // Grupo I
  team("fra", "FRANÇA", "FRA", "france", "#002395", "#ed2939", "Grupo I", null),
  team("sen", "SENEGAL", "SEN", "senegal", "#00853f", "#fdef42", "Grupo I", null),
  team("irq", "IRAQUE", "IRQ", "iraq", "#ce1126", "#000000", "Grupo I", null),
  team("nor", "NORUEGA", "NOR", "norway", "#ba0c2f", "#00205b", "Grupo I", null),

  // Grupo J
  team("arg", "ARGENTINA", "ARG", "argentina", "#74acdf", "#ffffff", "Grupo J", null),
  team("alg", "ARGÉLIA", "ALG", "algeria", "#006233", "#d21034", "Grupo J", null),
  team("aut", "ÁUSTRIA", "AUT", "austria", "#ed2939", "#ffffff", "Grupo J", null),
  team("jor", "JORDÂNIA", "JOR", "jordan", "#007a3d", "#ce1126", "Grupo J", null),

  // Grupo K
  team("por", "PORTUGAL", "POR", "portugal", "#006600", "#ff0000", "Grupo K", null),
  team("cod", "RD CONGO", "COD", "drcongo", "#00a3e0", "#ef3340", "Grupo K", null),
  team("uzb", "UZBEQUISTÃO", "UZB", "uzbekistan", "#0099b5", "#1eb53a", "Grupo K", null),
  team("col", "COLÔMBIA", "COL", "colombia", "#fcd116", "#003893", "Grupo K", null),

  // Grupo L
  team("eng", "INGLATERRA", "ENG", "england", "#ce1124", "#ffffff", "Grupo L", null),
  team("cro", "CROÁCIA", "CRO", "croatia", "#ff0000", "#ffffff", "Grupo L", null),
  team("gha", "GANA", "GHA", "ghana", "#006b3f", "#fcd116", "Grupo L", null),
  team("pan", "PANAMÁ", "PAN", "panama", "#db1730", "#0033a0", "Grupo L", null),
];

export const stadiums: Stadium[] = [
  {
    id: "los-angeles",
    name: "Estádio de Los Angeles",
    city: "LOS ANGELES",
    country: "USA",
    capacity: 70240,
    yearBuilt: 2020,
    coordinates: { lat: 33.9535, lng: -118.3392 },
    facts: [
      "Um dos estádios mais modernos do mundo, com cobertura translúcida.",
      "Já recebeu o Super Bowl LVI em 2022.",
    ],
    image: "/images/stadiums/los-angeles.jpg",
  },
  {
    id: "cidade-do-mexico",
    name: "Estádio da Cidade do México",
    city: "CIDADE DO MÉXICO",
    country: "MEX",
    capacity: 83000,
    yearBuilt: 1966,
    coordinates: { lat: 19.3029, lng: -99.1505 },
    facts: [
      "Primeiro estádio a sediar a abertura de duas Copas do Mundo (1970 e 1986).",
      "Localizado a mais de 2.200 metros de altitude.",
    ],
    image: "/images/stadiums/cidade-do-mexico.jpg",
  },
  {
    id: "guadalajara",
    name: "Estádio de Guadalajara",
    city: "GUADALAJARA",
    country: "MEX",
    capacity: 46232,
    yearBuilt: 2010,
    coordinates: { lat: 20.6829, lng: -103.4623 },
    facts: [
      "Conhecido pela fachada coberta por painéis solares.",
      "Um dos estádios mais novos do futebol mexicano.",
    ],
    image: "/images/stadiums/guadalajara.jpg",
  },
  {
    id: "toronto",
    name: "BMO Field",
    city: "TORONTO",
    country: "CAN",
    capacity: 30000,
    yearBuilt: 2007,
    coordinates: { lat: 43.6332, lng: -79.4186 },
    facts: [
      "Principal casa do Toronto FC, passará por expansão temporária para a Copa.",
      "Uma das duas sedes canadenses do torneio.",
    ],
    image: "/images/stadiums/toronto.jpg",
  },
  {
    id: "new-york",
    name: "MetLife Stadium",
    city: "NEW YORK CITY",
    country: "USA",
    capacity: 82500,
    yearBuilt: 2010,
    coordinates: { lat: 40.8135, lng: -74.0745 },
    facts: [
      "Receberá a histórica Grande Final da Copa de 2026.",
      "Já foi palco do Super Bowl XLVIII em 2014.",
    ],
    image: "/images/stadiums/new-york.jpg",
  },
  {
    id: "boston",
    name: "Estádio de Boston",
    city: "BOSTON",
    country: "USA",
    capacity: 65878,
    yearBuilt: 2002,
    coordinates: { lat: 42.0909, lng: -71.2643 },
    facts: [
      "Localizado na região metropolitana de Boston, em Foxborough.",
      "Casa tradicional do futebol americano na Nova Inglaterra.",
    ],
    image: "/images/stadiums/boston.jpg",
  },
  {
    id: "vancouver",
    name: "BC Place de Vancouver",
    city: "VANCOUVER",
    country: "CAN",
    capacity: 54500,
    yearBuilt: 1983,
    coordinates: { lat: 49.2768, lng: -123.1118 },
    facts: [
      "Possui cobertura retrátil, rara entre as sedes da Copa.",
      "Recebeu jogos da Copa do Mundo Feminina de 2015.",
    ],
    image: "/images/stadiums/vancouver.jpg",
  },
  {
    id: "houston",
    name: "Estádio de Houston",
    city: "HOUSTON",
    country: "USA",
    capacity: 72220,
    yearBuilt: 2002,
    coordinates: { lat: 29.6847, lng: -95.4107 },
    facts: [
      "Conta com teto retrátil para proteger o público do calor texano.",
      "Já recebeu o Super Bowl por duas vezes.",
    ],
    image: "/images/stadiums/houston.jpg",
  },
  {
    id: "kansas-city",
    name: "Arrowhead Stadium",
    city: "KANSAS CITY",
    country: "USA",
    capacity: 76416,
    yearBuilt: 1972,
    coordinates: { lat: 39.0489, lng: -94.4839 },
    facts: [
      "Famoso pela torcida mais ruidosa da NFL.",
      "Um dos estádios mais antigos entre as sedes de 2026.",
    ],
    image: "/images/stadiums/kansas-city.jpg",
  },
  {
    id: "dallas",
    name: "Estádio de Dallas",
    city: "DALLAS",
    country: "USA",
    capacity: 80000,
    yearBuilt: 2009,
    coordinates: { lat: 32.7473, lng: -97.0945 },
    facts: [
      "Um dos maiores domos do mundo, com capacidade para mais de 80 mil pessoas.",
      "Telão suspenso é um dos maiores do planeta.",
    ],
    image: "/images/stadiums/dallas.jpg",
  },
  {
    id: "filadelfia",
    name: "Estádio de Filadélfia",
    city: "FILADÉLFIA",
    country: "USA",
    capacity: 69596,
    yearBuilt: 2003,
    coordinates: { lat: 39.9008, lng: -75.1675 },
    facts: [
      "Casa tradicional do futebol americano na Pensilvânia.",
      "Receberá partidas da fase de grupos e do mata-mata inicial.",
    ],
    image: "/images/stadiums/filadelfia.jpg",
  },
  {
    id: "monterrey",
    name: "Estádio de Monterrey",
    city: "MONTERREY",
    country: "MEX",
    capacity: 53500,
    yearBuilt: 2015,
    coordinates: { lat: 25.6692, lng: -100.2447 },
    facts: [
      "Desenho inspirado nas montanhas da Sierra Madre.",
      "Um dos estádios mais modernos do futebol mexicano.",
    ],
    image: "/images/stadiums/monterrey.jpg",
  },
  {
    id: "atlanta",
    name: "Estádio de Atlanta",
    city: "ATLANTA",
    country: "USA",
    capacity: 71000,
    yearBuilt: 2017,
    coordinates: { lat: 33.7554, lng: -84.4009 },
    facts: [
      "Possui cobertura retrátil em formato de íris de câmera.",
      "Tela de vídeo circular é uma das maiores do mundo.",
    ],
    image: "/images/stadiums/atlanta.jpg",
  },
  {
    id: "miami",
    name: "Estádio de Miami",
    city: "MIAMI",
    country: "USA",
    capacity: 65326,
    yearBuilt: 1987,
    coordinates: { lat: 25.958, lng: -80.2389 },
    facts: [
      "Recebeu reformas recentes para abrigar grandes eventos internacionais.",
      "Clima tropical é um fator tático considerado pelas seleções.",
    ],
    image: "/images/stadiums/miami.jpg",
  },
  {
    id: "bay-area",
    name: "Estádio da Bay Area",
    city: "SANTA CLARA",
    country: "USA",
    capacity: 68500,
    yearBuilt: 2014,
    coordinates: { lat: 37.403, lng: -121.9694 },
    facts: [
      "Localizado no coração do Vale do Silício.",
      "Já recebeu o Super Bowl 50, em 2016.",
    ],
    image: "/images/stadiums/bay-area.jpg",
  },
  {
    id: "seattle",
    name: "Estádio de Seattle",
    city: "SEATTLE",
    country: "USA",
    capacity: 69000,
    yearBuilt: 2002,
    coordinates: { lat: 47.5952, lng: -122.3316 },
    facts: [
      "Conhecido pela energia da torcida, com recordes de decibéis em jogos da NFL.",
      "Cobertura parcial protege parte do público da chuva típica da região.",
    ],
    image: "/images/stadiums/seattle.jpg",
  },
];

// Round-of-32 skeleton. Placeholders follow the group-stage qualification
// pattern (1st/2nd of each group, plus the 8 best third-placed teams) and
// are replaced with real teams once the group stage concludes.
const r32Pairs: [string, string][] = [
  ["1º Grupo A", "2º Grupo G"],
  ["1º Grupo B", "2º Grupo H"],
  ["1º Grupo C", "2º Grupo I"],
  ["1º Grupo D", "2º Grupo J"],
  ["1º Grupo E", "2º Grupo K"],
  ["1º Grupo F", "2º Grupo L"],
  ["1º Grupo G", "2º Grupo A"],
  ["1º Grupo H", "2º Grupo B"],
  ["1º Grupo I", "2º Grupo C"],
  ["1º Grupo J", "2º Grupo D"],
  ["1º Grupo K", "2º Grupo E"],
  ["1º Grupo L", "2º Grupo F"],
  ["Melhor 3º colocado #1", "Melhor 3º colocado #2"],
  ["Melhor 3º colocado #3", "Melhor 3º colocado #4"],
  ["Melhor 3º colocado #5", "Melhor 3º colocado #6"],
  ["Melhor 3º colocado #7", "Melhor 3º colocado #8"],
];

const r32: BracketNode[] = r32Pairs.map(([placeholderA, placeholderB], i) => ({
  id: `R32-${i + 1}`,
  stage: "R32",
  nextMatchId: `R16-${Math.ceil((i + 1) / 2)}`,
  placeholderA,
  placeholderB,
}));

const r16: BracketNode[] = Array.from({ length: 8 }, (_, i) => ({
  id: `R16-${i + 1}`,
  stage: "R16",
  nextMatchId: `QF-${Math.ceil((i + 1) / 2)}`,
}));

const qf: BracketNode[] = Array.from({ length: 4 }, (_, i) => ({
  id: `QF-${i + 1}`,
  stage: "QF",
  nextMatchId: `SF-${Math.ceil((i + 1) / 2)}`,
}));

const sf: BracketNode[] = Array.from({ length: 2 }, (_, i) => ({
  id: `SF-${i + 1}`,
  stage: "SF",
  nextMatchId: "F-1",
}));

const final: BracketNode[] = [{ id: "F-1", stage: "F" }];

export const bracket: BracketNode[] = [...r32, ...r16, ...qf, ...sf, ...final];
