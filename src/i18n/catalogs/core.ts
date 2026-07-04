// Core catalog: the app shell (header, banners, controls, footer) and the
// navigation labels/descriptions. Keys are dotted by surface (`shell.*`,
// `footer.*`, `nav.<id>.*`). Keep broadcast voice in both languages.
import type { CatalogModule } from "./types";

export const coreCatalog: CatalogModule = {
  pt: {
    // App shell — header, banners, controls
    "shell.brandName": "Agora na Copa",
    "shell.newVersion": "Nova versão disponível",
    "shell.updateNow": "Atualizar agora",
    "shell.editClock": "Mudar Relógio",
    "shell.howToUse": "Como usar o app",
    "shell.toggleTheme": "Alternar estilo visual",
    "shell.switchLanguage": "Mudar idioma",

    // Footer
    "footer.rights":
      "© 2026 Agora na Copa 26. Todos os direitos reservados. FIFA World Cup, marcas e logos são de propriedade de seus respectivos donos.",
    "footer.madeWith": "Desenvolvido com carinho para o fanático por dados esportivos.",
    "footer.credits": "Créditos:",
    "footer.privacy": "Política de Privacidade",
    "footer.pageVersion": "Versão da página:",

    // Navigation (mirrors NAV_ITEMS ids)
    "nav.dashboard.label": "Dashboard",
    "nav.dashboard.desc": "Painel em construção.",
    "nav.ao-vivo.label": "Ao Vivo",
    "nav.ao-vivo.desc": "Acompanhe o cronômetro, transmissões e lances de cada jogo.",
    "nav.partidas.label": "Partidas",
    "nav.partidas.desc": "Veja todos os jogos encerrados, ao vivo e agendados da Copa.",
    "nav.grupos.label": "Grupos",
    "nav.grupos.desc": "Tabelas de classificação dos 12 grupos do torneio.",
    "nav.chaveamento.label": "Mata-mata",
    "nav.chaveamento.desc": "Mata-mata interativo até a grande final.",
    "nav.selecoes.label": "Seleções",
    "nav.selecoes.desc":
      "Lista completa das seleções classificadas para a Copa com acesso ao painel de cada time.",
    "nav.jogadores.label": "Jogadores",
    "nav.jogadores.desc": "Perfis individuais dos atletas classificados para a Copa.",
    "nav.lideres.label": "Líderes",
    "nav.lideres.desc": "Artilharia, disciplina e destaques coletivos da Copa.",
    "nav.estadios.label": "Estádios",
    "nav.estadios.desc": "Mapa e curiosidades das 16 sedes do Mundial.",
    "nav.social-medias.label": "Redes Sociais",
    "nav.social-medias.desc":
      "Feed social do Mundo na Copa com filtros, tendências, curtidas e comentários.",
    "nav.noticias.label": "Notícias",
    "nav.noticias.desc": "Feed de novidades sobre seleções, sedes e ingressos.",
    "nav.fanzone.label": "Fan Zone",
    "nav.fanzone.desc":
      "Quiz e minijogos para o torcedor acompanhar a Copa em clima de resenha.",
  },
  es: {
    // App shell
    "shell.brandName": "Ahora en el Mundial",
    "shell.newVersion": "Actualización disponible",
    "shell.updateNow": "Actualizar ahora",
    "shell.editClock": "Cambiar reloj",
    "shell.howToUse": "Cómo usar la app",
    "shell.toggleTheme": "Cambiar estilo visual",
    "shell.switchLanguage": "Cambiar idioma",

    // Footer
    "footer.rights":
      "© 2026 Ahora en el Mundial 26. Todos los derechos reservados. FIFA World Cup, marcas y logos son propiedad de sus respectivos dueños.",
    "footer.madeWith": "Hecho con cariño para el fanático de los datos deportivos.",
    "footer.credits": "Créditos:",
    "footer.privacy": "Política de Privacidad",
    "footer.pageVersion": "Versión de la página:",

    // Navigation
    "nav.dashboard.label": "Panel",
    "nav.dashboard.desc": "Panel en construcción.",
    "nav.ao-vivo.label": "En Vivo",
    "nav.ao-vivo.desc": "Sigue el cronómetro, las transmisiones y las jugadas de cada partido.",
    "nav.partidas.label": "Partidos",
    "nav.partidas.desc": "Mira todos los partidos finalizados, en vivo y programados del Mundial.",
    "nav.grupos.label": "Grupos",
    "nav.grupos.desc": "Tablas de posiciones de los 12 grupos del torneo.",
    "nav.chaveamento.label": "Eliminatorias",
    "nav.chaveamento.desc": "Llave interactiva hasta la gran final.",
    "nav.selecoes.label": "Selecciones",
    "nav.selecoes.desc":
      "Lista completa de las selecciones clasificadas al Mundial con acceso al panel de cada equipo.",
    "nav.jogadores.label": "Jugadores",
    "nav.jogadores.desc": "Perfiles individuales de los atletas clasificados al Mundial.",
    "nav.lideres.label": "Líderes",
    "nav.lideres.desc": "Goleo, disciplina y destacados colectivos del Mundial.",
    "nav.estadios.label": "Estadios",
    "nav.estadios.desc": "Mapa y curiosidades de las 16 sedes del Mundial.",
    "nav.social-medias.label": "Redes Sociales",
    "nav.social-medias.desc":
      "Feed social del Mundial con filtros, tendencias, me gusta y comentarios.",
    "nav.noticias.label": "Noticias",
    "nav.noticias.desc": "Feed de novedades sobre selecciones, sedes y entradas.",
    "nav.fanzone.label": "Fan Zone",
    "nav.fanzone.desc":
      "Quiz y minijuegos para que el hincha siga el Mundial en clima de charla.",
  },
};
