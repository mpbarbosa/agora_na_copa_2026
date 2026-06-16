// Maps each 2026 WC FIFA team code to the Portuguese Wikipedia article title
// and the Wikidata Q-id for structured data (population, area, capital).
// Source: https://pt.wikipedia.org & https://www.wikidata.org
export interface WikipediaCountryEntry {
  /** Portuguese Wikipedia article title (used for REST summary API) */
  ptArticle: string;
  /** Wikidata entity Q-id (used for structured facts) */
  wikidataId: string;
}

const WIKIPEDIA_COUNTRIES: Record<string, WikipediaCountryEntry> = {
  ALG: { ptArticle: "Argélia",                           wikidataId: "Q262"   },
  ARG: { ptArticle: "Argentina",                         wikidataId: "Q414"   },
  AUS: { ptArticle: "Austrália",                         wikidataId: "Q408"   },
  AUT: { ptArticle: "Áustria",                           wikidataId: "Q40"    },
  BEL: { ptArticle: "Bélgica",                           wikidataId: "Q31"    },
  BIH: { ptArticle: "Bósnia e Herzegovina",              wikidataId: "Q225"   },
  BRA: { ptArticle: "Brasil",                            wikidataId: "Q155"   },
  CAN: { ptArticle: "Canadá",                            wikidataId: "Q16"    },
  CIV: { ptArticle: "Costa do Marfim",                   wikidataId: "Q1008"  },
  COD: { ptArticle: "República Democrática do Congo",    wikidataId: "Q974"   },
  COL: { ptArticle: "Colômbia",                          wikidataId: "Q739"   },
  CPV: { ptArticle: "Cabo Verde",                        wikidataId: "Q1011"  },
  CRO: { ptArticle: "Croácia",                           wikidataId: "Q224"   },
  CUW: { ptArticle: "Curaçao",                           wikidataId: "Q25279" },
  CZE: { ptArticle: "Chéquia",                           wikidataId: "Q213"   },
  ECU: { ptArticle: "Equador",                           wikidataId: "Q736"   },
  EGY: { ptArticle: "Egito",                             wikidataId: "Q79"    },
  ENG: { ptArticle: "Inglaterra",                        wikidataId: "Q21"    },
  ESP: { ptArticle: "Espanha",                           wikidataId: "Q29"    },
  FRA: { ptArticle: "França",                            wikidataId: "Q142"   },
  GER: { ptArticle: "Alemanha",                          wikidataId: "Q183"   },
  GHA: { ptArticle: "Gana",                              wikidataId: "Q117"   },
  HAI: { ptArticle: "Haiti",                             wikidataId: "Q790"   },
  IRN: { ptArticle: "Irã",                               wikidataId: "Q794"   },
  IRQ: { ptArticle: "Iraque",                            wikidataId: "Q796"   },
  JOR: { ptArticle: "Jordânia",                          wikidataId: "Q810"   },
  JPN: { ptArticle: "Japão",                             wikidataId: "Q17"    },
  KOR: { ptArticle: "Coreia do Sul",                     wikidataId: "Q884"   },
  KSA: { ptArticle: "Arábia Saudita",                    wikidataId: "Q851"   },
  MAR: { ptArticle: "Marrocos",                          wikidataId: "Q1028"  },
  MEX: { ptArticle: "México",                            wikidataId: "Q96"    },
  NED: { ptArticle: "Países Baixos",                     wikidataId: "Q55"    },
  NOR: { ptArticle: "Noruega",                           wikidataId: "Q20"    },
  NZL: { ptArticle: "Nova Zelândia",                     wikidataId: "Q664"   },
  PAN: { ptArticle: "Panamá",                            wikidataId: "Q804"   },
  PAR: { ptArticle: "Paraguai",                          wikidataId: "Q733"   },
  POR: { ptArticle: "Portugal",                          wikidataId: "Q45"    },
  QAT: { ptArticle: "Catar",                             wikidataId: "Q846"   },
  RSA: { ptArticle: "África do Sul",                     wikidataId: "Q258"   },
  SCO: { ptArticle: "Escócia",                           wikidataId: "Q22"    },
  SEN: { ptArticle: "Senegal",                           wikidataId: "Q1041"  },
  SUI: { ptArticle: "Suíça",                             wikidataId: "Q39"    },
  SWE: { ptArticle: "Suécia",                            wikidataId: "Q34"    },
  TUN: { ptArticle: "Tunísia",                           wikidataId: "Q948"   },
  TUR: { ptArticle: "Turquia",                           wikidataId: "Q43"    },
  URU: { ptArticle: "Uruguai",                           wikidataId: "Q77"    },
  USA: { ptArticle: "Estados Unidos",                    wikidataId: "Q30"    },
  UZB: { ptArticle: "Uzbequistão",                       wikidataId: "Q265"   },
};

export default WIKIPEDIA_COUNTRIES;
