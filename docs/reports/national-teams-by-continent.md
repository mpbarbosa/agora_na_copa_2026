# National Teams by Continent — FIFA World Cup 2026

**Source:** the 48 qualified teams seeded in `src/data/tournament.ts` (the realized
tournament field). Each team is grouped by its FIFA confederation, which is the
football-standard notion of "continent." Counts reflect who actually qualified —
including the intercontinental-playoff winners — so they can exceed a confederation's
base allocation.

## Summary

| Continent (confederation) | Teams |
|---|---:|
| Europe (UEFA) | 16 |
| Africa (CAF) | 10 |
| Asia (AFC) | 9 |
| South America (CONMEBOL) | 6 |
| North/Central America & Caribbean (CONCACAF) | 6 |
| Oceania (OFC) | 1 |
| **Total** | **48** |

## Teams per continent

### Europe — UEFA (16)
Alemanha (GER), Áustria (AUT), Bélgica (BEL), Bósnia e Herzegovina (BIH), Croácia (CRO),
Escócia (SCO), Espanha (ESP), França (FRA), Holanda (NED), Inglaterra (ENG),
Noruega (NOR), Portugal (POR), Suécia (SWE), Suíça (SUI), Tchéquia (CZE), Turquia (TUR)

### Africa — CAF (10)
África do Sul (RSA), Argélia (ALG), Cabo Verde (CPV), Costa do Marfim (CIV),
Egito (EGY), Gana (GHA), Marrocos (MAR), RD Congo (COD), Senegal (SEN), Tunísia (TUN)

### Asia — AFC (9)
Arábia Saudita (KSA), Austrália (AUS), Catar (QAT), Coréia do Sul (KOR), Irã (IRN),
Iraque (IRQ), Japão (JPN), Jordânia (JOR), Uzbequistão (UZB)

### South America — CONMEBOL (6)
Argentina (ARG), Brasil (BRA), Colômbia (COL), Equador (ECU), Paraguai (PAR),
Uruguai (URU)

### North/Central America & Caribbean — CONCACAF (6)
Canadá (CAN), Curaçao (CUW), Estados Unidos (USA), Haiti (HAI), México (MEX),
Panamá (PAN)

### Oceania — OFC (1)
Nova Zelândia (NZL)

## Notes

- **Australia** plays in the AFC (Asia), not the OFC, since its 2006 move.
- **Turkey** is grouped under UEFA (Europe), as in FIFA football competition.
- Confederation membership is real-world fact, not derived from the codebase —
  `tournament.ts` carries no continent/confederation field, only group, colours and
  seed standings.
