import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Flame,
  Hash,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Newspaper,
  Send,
  TrendingUp,
} from "lucide-react";
import type { GoogleTrendTopic, GoogleTrendsResponse } from "../types";
import { InstagramBrandIcon } from "./InstagramBrandIcon";
import { InstagramEmbed } from "./InstagramEmbed";
import { InstagramHighlightsFeed } from "./InstagramHighlightsFeed";
import { RedditPostsFeed } from "./RedditPostsFeed";

interface SocialMediasViewProps {
  theme: "classic-light" | "stadium-dark";
}

/** Google Trends "trending now" category code for Sports (Esportes). */
const SPORTS_CATEGORY_CODE = 17;

/** Reel oficial da FIFA destacado no card "FIFA World Cup" (permalink sem query params de tracking). */
const FIFA_REEL_URL = "https://www.instagram.com/reel/DZ0HLA4iZDN/";

type PostCategory = "foto" | "noticia" | "oficial";
type CategoryFilter = "tudo" | PostCategory;

interface SocialComment {
  id: string;
  author: string;
  text: string;
}

interface SocialPost {
  id: string;
  author: string;
  handle: string;
  category: PostCategory;
  time: string;
  text: string;
  tags: string[];
  likes: number;
  comments: SocialComment[];
}

const FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: "tudo", label: "Tudo" },
  { id: "foto", label: "Fotos" },
  { id: "noticia", label: "Notícias" },
  { id: "oficial", label: "Oficial" },
];

const CATEGORY_META: Record<PostCategory, { label: string; Icon: typeof ImageIcon }> = {
  foto: { label: "Foto", Icon: ImageIcon },
  noticia: { label: "Notícia", Icon: Newspaper },
  oficial: { label: "Oficial", Icon: BadgeCheck },
};

const SEED_POSTS: SocialPost[] = [
  {
    id: "post-selecao-treino",
    author: "Seleção Brasileira",
    handle: "@cbf_futebol",
    category: "oficial",
    time: "há 38 min",
    text: "Aquecimento ligado no CT! O grupo tá focado e a torcida vai sentir essa energia em campo. 💪🇧🇷 #VaiBrasil #Copa2026",
    tags: ["VaiBrasil", "Copa2026", "Selecao"],
    likes: 9210,
    comments: [],
  },
  {
    id: "post-foto-mosaico",
    author: "Marcela na Arquibancada",
    handle: "@marcela_torcedora",
    category: "foto",
    time: "há 1 h",
    text: "Mosaico GIGANTE montado pela galera antes do apito inicial. Arrepiou! 📸 #Copa2026 #MaracanaLotado",
    tags: ["Copa2026", "MaracanaLotado"],
    likes: 1530,
    comments: [
      { id: "c2", author: "@pedrofut", text: "Que imagem, hein! Bandeirão histórico." },
    ],
  },
  {
    id: "post-noticia-escalacao",
    author: "Central da Copa",
    handle: "@centraldacopa",
    category: "noticia",
    time: "há 1 h",
    text: "ESCALAÇÃO CONFIRMADA: técnico mantém base e aposta na velocidade pelos lados do campo para o duelo de hoje. 📋 #Copa2026 #Escalacao",
    tags: ["Copa2026", "Escalacao"],
    likes: 2740,
    comments: [],
  },
  {
    id: "post-foto-bastidores",
    author: "Bruno Lentes",
    handle: "@brunolentes",
    category: "foto",
    time: "há 2 h",
    text: "Bastidores do gramado minutos antes da bola rolar. A grama tá um tapete! 🌱📷 #Copa2026 #Bastidores",
    tags: ["Copa2026", "Bastidores"],
    likes: 980,
    comments: [],
  },
  {
    id: "post-noticia-recorde",
    author: "Mundo na Copa",
    handle: "@mundonacopa",
    category: "noticia",
    time: "há 3 h",
    text: "NÚMEROS: público recorde nas arquibancadas e audiência nas alturas marcam a rodada de abertura do Mundial. 📈 #Copa2026",
    tags: ["Copa2026", "Recorde"],
    likes: 3110,
    comments: [
      { id: "c3", author: "@dadosfc", text: "A Copa de 48 seleções veio com tudo!" },
    ],
  },
];

let localCommentSeq = 0;

export function SocialMediasView({ theme }: SocialMediasViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("tudo");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<string, number>>(() =>
    Object.fromEntries(SEED_POSTS.map((p) => [p.id, p.likes])),
  );
  const [likedByUser, setLikedByUser] = useState<Record<string, boolean>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, SocialComment[]>>(() =>
    Object.fromEntries(SEED_POSTS.map((p) => [p.id, p.comments])),
  );
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [googleTrends, setGoogleTrends] = useState<GoogleTrendTopic[]>([]);
  const [trendsStatus, setTrendsStatus] = useState<"loading" | "ready" | "empty">("loading");
  const [sportsOnly, setSportsOnly] = useState(false);

  useEffect(() => {
    let active = true;

    const loadTrends = async () => {
      try {
        const res = await fetch("/api/google-trends");
        if (!res.ok) throw new Error("Falha ao carregar tendências do Google.");
        const data: GoogleTrendsResponse = await res.json();
        if (!active) return;
        setGoogleTrends(data.topics);
        setTrendsStatus(data.topics.length > 0 ? "ready" : "empty");
      } catch {
        if (active) setTrendsStatus("empty");
      }
    };

    void loadTrends();
    return () => {
      active = false;
    };
  }, []);

  const trending = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of SEED_POSTS) {
      for (const tag of post.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, []);

  const hasSportsTrends = useMemo(
    () => googleTrends.some((topic) => topic.categories.includes(SPORTS_CATEGORY_CODE)),
    [googleTrends],
  );

  const visibleTrends = useMemo(
    () =>
      sportsOnly
        ? googleTrends.filter((topic) => topic.categories.includes(SPORTS_CATEGORY_CODE))
        : googleTrends,
    [googleTrends, sportsOnly],
  );

  const visiblePosts = useMemo(
    () =>
      SEED_POSTS.filter((post) => {
        const categoryOk = categoryFilter === "tudo" || post.category === categoryFilter;
        const tagOk = !tagFilter || post.tags.includes(tagFilter);
        return categoryOk && tagOk;
      }),
    [categoryFilter, tagFilter],
  );

  const toggleLike = (postId: string) => {
    const alreadyLiked = likedByUser[postId] ?? false;
    setLikedByUser((prev) => ({ ...prev, [postId]: !alreadyLiked }));
    setLikes((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + (alreadyLiked ? -1 : 1) }));
  };

  const toggleComments = (postId: string) => {
    setOpenComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const submitComment = (postId: string) => {
    const draft = (commentDrafts[postId] ?? "").trim();
    if (!draft) return;
    const newComment: SocialComment = {
      id: `local-${postId}-${localCommentSeq++}`,
      author: "@voce",
      text: draft,
    };
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] ?? []), newComment],
    }));
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
  };

  const toggleTagFilter = (tag: string) => {
    setTagFilter((prev) => (prev === tag ? null : tag));
  };

  const shellClasses =
    theme === "classic-light"
      ? "bg-white border-slate-200 shadow-sm"
      : "bg-[#121414] border-white/10";
  const cardClasses =
    theme === "classic-light"
      ? "bg-slate-50 border-slate-200"
      : "bg-white/5 border-white/10";
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";
  const subtleClasses = theme === "classic-light" ? "text-slate-500" : "text-slate-400";
  const idleChipClasses =
    theme === "classic-light"
      ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      : "border-white/10 bg-[#161919] text-slate-100 hover:border-white/20";
  const activeChipClasses =
    theme === "classic-light"
      ? "border-[#009c3b] bg-[#009c3b]/10 text-[#065f2c]"
      : "border-[#00e476] bg-[#00e476]/10 text-[#a7e6bf]";
  const accentText = theme === "classic-light" ? "text-[#009c3b]" : "text-[#00e476]";

  const avatarClasses =
    theme === "classic-light"
      ? "bg-slate-200 text-slate-700"
      : "bg-white/10 text-slate-100";

  return (
    <div className="max-w-7xl mx-auto px-4 mt-8" id="social-medias-view">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2
            className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`}
            id="social-medias-title"
          >
            Redes Sociais
          </h2>
          <p className={`mt-1 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
            Mundo na Copa • feed social com filtros, curtidas e comentários em tempo real
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
            theme === "classic-light"
              ? "border-slate-200 bg-slate-50 text-slate-600"
              : "border-white/10 bg-white/5 text-slate-200"
          }`}
          id="social-medias-scope-note"
        >
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${theme === "classic-light" ? "bg-[#009c3b]" : "bg-[#00e476]"}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${theme === "classic-light" ? "bg-[#009c3b]" : "bg-[#00e476]"}`} />
          </span>
          Multiview ao vivo
        </span>
      </div>

      {/* Official FIFA World Cup profile card */}
      <section
        id="social-medias-fifa-profile-card"
        aria-label="Card oficial da Copa do Mundo FIFA"
        className={`mt-6 rounded-3xl border p-5 ${shellClasses}`}
      >
        <a
          href="https://www.instagram.com/fifaworldcup"
          target="_blank"
          rel="noopener noreferrer"
          id="social-medias-fifa-profile"
          data-testid="social-fifa-profile"
          aria-label="Perfil oficial da Copa do Mundo FIFA no Instagram"
          className="flex items-center gap-4 transition hover:opacity-80"
        >
          <span className="shrink-0">
            <InstagramBrandIcon size={52} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className={`truncate font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
                FIFA World Cup
              </span>
              <BadgeCheck size={16} className="shrink-0 text-[#3897f0]" />
            </span>
            <span className={`block font-mono text-[11px] uppercase tracking-wider ${subtleClasses}`}>
              @fifaworldcup • Perfil oficial
            </span>
            <span className={`mt-1 block font-archivo text-sm leading-5 ${mutedClasses}`}>
              Siga a conta oficial da Copa do Mundo FIFA 2026 e acompanhe tudo do Mundial em primeira mão.
            </span>
          </span>
          <span
            className={`hidden shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider sm:inline-flex ${activeChipClasses}`}
          >
            <InstagramBrandIcon size={14} />
            Seguir
          </span>
        </a>

        {/* Reel oficial em destaque, embutido via embed.js da Instagram */}
        <div className="mt-4" id="social-medias-fifa-reel" data-testid="social-fifa-reel">
          <InstagramEmbed permalink={FIFA_REEL_URL} />
        </div>
      </section>

      {/* Destaques de jogadores no Instagram (dados reais de squads.json) */}
      <InstagramHighlightsFeed theme={theme} />

      {/* Repercussão no Reddit (posts curados enriquecidos via /api/reddit) */}
      <RedditPostsFeed theme={theme} />

      {/* Google Trends card */}
      {trendsStatus !== "empty" && (
        <section
          className={`mt-6 rounded-3xl border p-5 ${shellClasses}`}
          id="social-medias-google-trends"
          aria-label="Buscas em alta no Google"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Flame size={16} className={accentText} />
            <p className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
              Em alta no Google
            </p>
            {trendsStatus === "ready" && hasSportsTrends && (
              <button
                type="button"
                aria-pressed={sportsOnly}
                onClick={() => setSportsOnly((prev) => !prev)}
                data-testid="social-trend-sports-toggle"
                className={`min-h-8 rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                  sportsOnly ? activeChipClasses : idleChipClasses
                }`}
              >
                Só esportes
              </button>
            )}
            <span className={`ml-auto font-mono text-[9px] uppercase tracking-wider ${subtleClasses}`}>
              Google Trends • Brasil
            </span>
          </div>

          {trendsStatus === "loading" ? (
            <p className={`mt-3 font-archivo text-sm leading-6 ${mutedClasses}`}>
              Carregando buscas em alta…
            </p>
          ) : visibleTrends.length === 0 ? (
            <p className={`mt-3 font-archivo text-sm leading-6 ${mutedClasses}`} data-testid="social-trend-vazio">
              Nenhuma busca de esportes em alta agora.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTrends.map((topic, index) => {
                const href = topic.news?.url
                  ? topic.news.url
                  : `https://www.google.com/search?q=${encodeURIComponent(topic.title)}`;
                return (
                  <a
                    key={`${topic.title}-${index}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`social-trend-${index}`}
                    className={`flex items-start gap-3 rounded-2xl border px-3 py-2.5 transition ${idleChipClasses}`}
                  >
                    <span className={`mt-0.5 font-anton text-base leading-none ${accentText}`}>
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-archivo text-sm font-semibold capitalize ${headingClasses}`}>
                        {topic.title}
                      </span>
                      <span className={`mt-0.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
                        {topic.traffic && <span>{topic.traffic} buscas</span>}
                        {topic.traffic && topic.news?.source && <span>•</span>}
                        {topic.news?.source && <span className="truncate">{topic.news.source}</span>}
                      </span>
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Filter chips */}
      <div className="mt-6 flex flex-wrap items-center gap-2" id="social-medias-filtros" role="tablist" aria-label="Filtrar publicações">
        {FILTERS.map((filter) => {
          const isActive = categoryFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setCategoryFilter(filter.id)}
              data-testid={`social-filtro-${filter.id}`}
              className={`min-h-9 rounded-full border px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition ${
                isActive ? activeChipClasses : idleChipClasses
              }`}
            >
              {filter.label}
            </button>
          );
        })}
        {tagFilter && (
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            data-testid="social-limpar-tag"
            className={`min-h-9 inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition ${activeChipClasses}`}
          >
            <Hash size={12} />
            {tagFilter}
            <span className="ml-1 opacity-70">✕</span>
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        {/* Feed */}
        <section className="flex flex-col gap-4" id="social-medias-feed" aria-label="Feed social">
          {visiblePosts.length === 0 ? (
            <div className={`rounded-3xl border p-8 text-center ${shellClasses}`} data-testid="social-feed-vazio">
              <p className={`font-archivo text-sm leading-6 ${mutedClasses}`}>
                Nenhuma publicação para esse filtro agora. Tente outra tag ou volte para{" "}
                <span className={accentText}>Tudo</span>.
              </p>
            </div>
          ) : (
            visiblePosts.map((post) => {
              const { Icon: CategoryIcon, label: categoryLabel } = CATEGORY_META[post.category];
              const isLiked = likedByUser[post.id] ?? false;
              const postComments = commentsByPost[post.id] ?? [];
              const commentsOpen = openComments[post.id] ?? false;
              const initials = post.author
                .split(" ")
                .slice(0, 2)
                .map((word) => word[0])
                .join("")
                .toUpperCase();

              return (
                <article
                  key={post.id}
                  className={`rounded-3xl border p-5 ${shellClasses}`}
                  data-testid={`social-post-${post.id}`}
                >
                  <header className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-anton text-sm uppercase ${avatarClasses}`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={`truncate font-archivo font-semibold ${headingClasses}`}>
                          {post.author}
                        </p>
                        {post.category === "oficial" && (
                          <BadgeCheck size={15} className={accentText} aria-label="Conta oficial" />
                        )}
                      </div>
                      <p className={`font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
                        {post.handle} • {post.time}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider ${cardClasses} ${mutedClasses}`}
                    >
                      <CategoryIcon size={11} />
                      {categoryLabel}
                    </span>
                  </header>

                  <p className={`mt-3 font-archivo text-sm leading-6 ${mutedClasses}`}>{post.text}</p>

                  {post.category === "foto" && (
                    <div
                      className={`mt-3 flex h-40 items-center justify-center rounded-2xl border ${
                        theme === "classic-light"
                          ? "border-slate-200 bg-gradient-to-br from-[#009c3b]/15 via-[#ffd84d]/15 to-[#002776]/15"
                          : "border-white/10 bg-gradient-to-br from-[#00e476]/15 via-[#ffd84d]/10 to-[#002776]/25"
                      }`}
                      aria-hidden="true"
                    >
                      <ImageIcon size={28} className={subtleClasses} />
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTagFilter(tag)}
                        data-testid={`social-post-tag-${tag}`}
                        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                          tagFilter === tag
                            ? activeChipClasses
                            : `${accentText} hover:underline underline-offset-2`
                        }`}
                      >
                        <Hash size={10} />
                        {tag}
                      </button>
                    ))}
                  </div>

                  <div className={`mt-4 flex items-center gap-4 border-t pt-3 ${theme === "classic-light" ? "border-slate-100" : "border-white/5"}`}>
                    <button
                      type="button"
                      onClick={() => toggleLike(post.id)}
                      aria-pressed={isLiked}
                      data-testid={`social-curtir-${post.id}`}
                      className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition ${
                        isLiked
                          ? "text-[#ed2939]"
                          : `${mutedClasses} hover:${theme === "classic-light" ? "text-slate-900" : "text-white"}`
                      }`}
                    >
                      <Heart
                        size={15}
                        className={`transition-transform ${isLiked ? "scale-110 fill-current" : ""}`}
                      />
                      <span data-testid={`social-curtidas-${post.id}`}>
                        {(likes[post.id] ?? 0).toLocaleString("pt-BR")}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleComments(post.id)}
                      aria-expanded={commentsOpen}
                      data-testid={`social-comentar-${post.id}`}
                      className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition ${mutedClasses} hover:${theme === "classic-light" ? "text-slate-900" : "text-white"}`}
                    >
                      <MessageCircle size={15} />
                      {postComments.length}
                    </button>
                  </div>

                  {commentsOpen && (
                    <div className="mt-3 flex flex-col gap-2" data-testid={`social-comentarios-${post.id}`}>
                      {postComments.length === 0 ? (
                        <p className={`font-archivo text-xs leading-5 ${subtleClasses}`}>
                          Seja o primeiro a comentar essa publicação.
                        </p>
                      ) : (
                        postComments.map((comment) => (
                          <div key={comment.id} className={`rounded-2xl border px-3 py-2 ${cardClasses}`}>
                            <p className={`font-mono text-[10px] uppercase tracking-wider ${accentText}`}>
                              {comment.author}
                            </p>
                            <p className={`mt-0.5 font-archivo text-sm leading-5 ${mutedClasses}`}>
                              {comment.text}
                            </p>
                          </div>
                        ))
                      )}

                      <form
                        className="mt-1 flex items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitComment(post.id);
                        }}
                      >
                        <input
                          type="text"
                          value={commentDrafts[post.id] ?? ""}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          placeholder="Manda a real…"
                          data-testid={`social-comentario-input-${post.id}`}
                          className={`min-h-10 flex-1 rounded-full border px-4 font-archivo text-sm outline-none transition ${
                            theme === "classic-light"
                              ? "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-[#009c3b]"
                              : "border-white/10 bg-[#161919] text-slate-100 placeholder:text-slate-500 focus:border-[#00e476]"
                          }`}
                        />
                        <button
                          type="submit"
                          aria-label="Enviar comentário"
                          data-testid={`social-comentario-enviar-${post.id}`}
                          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${idleChipClasses}`}
                        >
                          <Send size={15} />
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>

        {/* Trending sidebar */}
        <aside className="xl:sticky xl:top-28 xl:self-start" id="social-medias-tendencias">
          <div className={`rounded-3xl border p-5 ${shellClasses}`}>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className={accentText} />
              <p className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
                Tendências
              </p>
            </div>
            <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
              Toque numa hashtag para filtrar o feed
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {trending.map(([tag, count]) => {
                const isActive = tagFilter === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTagFilter(tag)}
                    data-testid={`social-tendencia-${tag}`}
                    className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left transition ${
                      isActive ? activeChipClasses : idleChipClasses
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-wider">
                      <Hash size={12} />
                      {tag}
                    </span>
                    <span className={`font-mono text-[10px] ${subtleClasses}`}>
                      {count} {count === 1 ? "post" : "posts"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
