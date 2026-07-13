export interface NavItem {
  id: string;
  label: string;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Painel em construção.",
  },
  {
    id: "ao-vivo",
    label: "Ao Vivo",
    description: "Acompanhe o cronômetro, transmissões e lances de cada jogo.",
  },
  {
    id: "partidas",
    label: "Partidas",
    description: "Veja todos os jogos encerrados, ao vivo e agendados da Copa.",
  },
  {
    id: "chaveamento",
    label: "Mata-mata",
    description: "Mata-mata interativo até a grande final.",
  },
  {
    id: "social-medias",
    label: "Redes Sociais",
    description: "Feed social do Mundo na Copa com filtros, tendências, curtidas e comentários.",
  },
  {
    id: "grupos",
    label: "Grupos",
    description: "Tabelas de classificação dos 12 grupos do torneio.",
  },
  {
    id: "selecoes",
    label: "Seleções",
    description: "Lista completa das seleções classificadas para a Copa com acesso ao painel de cada time.",
  },
  {
    id: "jogadores",
    label: "Jogadores",
    description: "Perfis individuais dos atletas classificados para a Copa.",
  },
  {
    id: "lideres",
    label: "Líderes",
    description: "Artilharia, disciplina e destaques coletivos da Copa.",
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
