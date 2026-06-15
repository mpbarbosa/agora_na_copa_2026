export interface NavItem {
  id: string;
  label: string;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "partidas",
    label: "Partidas",
    description: "Acompanhe o cronômetro, transmissões e lances de cada jogo.",
  },
  {
    id: "grupos",
    label: "Grupos",
    description: "Tabelas de classificação dos 12 grupos do torneio.",
  },
  {
    id: "chaveamento",
    label: "Chaveamento",
    description: "Mata-mata interativo até a grande final.",
  },
  {
    id: "estadios",
    label: "Estádios",
    description: "Mapa e curiosidades das 16 sedes do Mundial.",
  },
  {
    id: "noticias",
    label: "Notícias",
    description: "Feed de novidades sobre seleções, sedes e ingressos.",
  },
  {
    id: "fanzone",
    label: "Fan Zone",
    description: "Quiz e minijogos para o torcedor acompanhar a Copa em clima de resenha.",
  },
];
