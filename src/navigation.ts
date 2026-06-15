export type NavStatus = "live" | "comingSoon";

export interface NavItem {
  id: string;
  label: string;
  status: NavStatus;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "partidas",
    label: "Partidas",
    status: "live",
    description: "Acompanhe o cronômetro, transmissões e lances de cada jogo.",
  },
  {
    id: "grupos",
    label: "Grupos",
    status: "live",
    description: "Tabelas de classificação dos 12 grupos do torneio.",
  },
  {
    id: "chaveamento",
    label: "Chaveamento",
    status: "live",
    description: "Mata-mata interativo até a grande final.",
  },
  {
    id: "estadios",
    label: "Estádios",
    status: "live",
    description: "Mapa e curiosidades das 16 sedes do Mundial.",
  },
  {
    id: "noticias",
    label: "Notícias",
    status: "live",
    description: "Feed de novidades sobre seleções, sedes e ingressos.",
  },
  {
    id: "fanzone",
    label: "Fan Zone",
    status: "live",
    description: "Quiz e minijogos para o torcedor acompanhar a Copa em clima de resenha.",
  },
];
