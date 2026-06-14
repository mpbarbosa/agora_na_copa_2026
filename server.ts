import express from "express";
import { createServer as createHttpServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import matchesData from "./src/matches.json";
import type { Broadcaster, BroadcastGuideEntry, Match } from "./src/types";

dotenv.config();

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
const STRICT_PORT = process.env.STRICT_PORT === "true";
const FIFA_API_BASE_URL = "https://api.fifa.com/api/v3";
const FIFA_COMPETITION_ID = "17";
const FIFA_SEASON_ID = "285023";
const DEFAULT_BROADCAST_COUNTRY = "BR";
const DEFAULT_BROADCAST_LANGUAGE = "pt";
const BROADCAST_GUIDE_CACHE_TTL_MS = 5 * 60 * 1000;
const APP_MATCHES = matchesData as Match[];

app.use(express.json());

interface FifaLocalizedText {
  Locale?: string;
  Description?: string;
}

interface FifaCalendarTeam {
  TeamName?: FifaLocalizedText[];
  Abbreviation?: string;
}

interface FifaCalendarMatch {
  IdMatch: string;
  Date: string;
  Home?: FifaCalendarTeam;
  Away?: FifaCalendarTeam;
}

interface FifaCalendarResponse {
  Results?: FifaCalendarMatch[];
}

interface FifaWatchSource {
  IdChannel: string;
  Name: string;
  Logo?: string;
  TvChannelUrl?: string;
  IOsUrl?: string;
  AndroidUrl?: string;
  Url?: string;
  Language?: string;
}

interface FifaWatchMatch {
  IdMatch: string;
  Date: string;
  Sources?: FifaWatchSource[];
}

interface FifaWatchSeasonResponse {
  Matches?: FifaWatchMatch[];
}

interface BroadcastGuideResponse {
  country: string;
  language: string;
  guides: Record<string, BroadcastGuideEntry>;
}

let broadcastGuideCache:
  | {
      key: string;
      expiresAt: number;
      payload: BroadcastGuideResponse;
    }
  | null = null;

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();

const getLocalizedDescription = (entries: FifaLocalizedText[] | undefined, language: string) => {
  if (!entries || entries.length === 0) return "";

  const normalizedLanguage = language.toLowerCase();
  return (
    entries.find((entry) => entry.Locale?.toLowerCase().startsWith(normalizedLanguage))?.Description ||
    entries[0]?.Description ||
    ""
  );
};

const SPORTV_URL = "https://ge.globo.com/sportv/";

const getWatchSourceUrl = (source: FifaWatchSource) =>
  source.Url || source.TvChannelUrl || source.IOsUrl || source.AndroidUrl || "";

const getNormalizedWatchSourceUrl = (source: FifaWatchSource) => {
  const link = getWatchSourceUrl(source);
  const haystack = `${source.Name} ${link}`.toLowerCase();

  if (haystack.includes("sportv")) {
    return SPORTV_URL;
  }

  return link;
};

const classifyBroadcasterType = (source: FifaWatchSource): Broadcaster["type"] => {
  const haystack = `${source.Name} ${getWatchSourceUrl(source)}`.toLowerCase();

  if (haystack.includes("youtube") || haystack.includes("caze")) {
    return "YOUTUBE";
  }

  if (
    haystack.includes("globoplay") ||
    haystack.includes("getv") ||
    haystack.includes("ge-tv") ||
    haystack.includes("nsports") ||
    haystack.includes("fifa+")
  ) {
    return "STREAM";
  }

  if (haystack.includes("sportv")) {
    return "TV PAGA";
  }

  if (haystack.includes("globo") || haystack.includes("sbt")) {
    return "TV ABERTA";
  }

  return "STREAM";
};

const getBroadcasterColor = (type: Broadcaster["type"]) => {
  switch (type) {
    case "TV ABERTA":
      return "#00e476";
    case "TV PAGA":
      return "#ffd700";
    case "YOUTUBE":
      return "#ed2939";
    case "STREAM":
    case "STREAM PAGO":
      return "#38bdf8";
    default:
      return "#94a3b8";
  }
};

const normalizeBroadcasters = (sources: FifaWatchSource[] | undefined): Broadcaster[] => {
  if (!sources || sources.length === 0) return [];

  const seen = new Set<string>();
  const broadcasters: Broadcaster[] = [];

  for (const source of sources) {
    const link = getNormalizedWatchSourceUrl(source);
    if (!source.Name || !link) continue;

    const dedupeKey = `${normalizeText(source.Name)}::${link}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const type = classifyBroadcasterType(source);
    broadcasters.push({
      id: source.IdChannel,
      name: source.Name,
      type,
      logoUrl: source.Logo || undefined,
      iconColor: getBroadcasterColor(type),
      link,
    });
  }

  return broadcasters;
};

const findCalendarMatch = (localMatch: Match, calendarMatches: FifaCalendarMatch[], language: string) => {
  const localKickoff = new Date(localMatch.kickoffTimestamp).getTime();
  const localHomeCode = normalizeText(localMatch.teamA.code);
  const localAwayCode = normalizeText(localMatch.teamB.code);
  const localHomeName = normalizeText(localMatch.teamA.name);
  const localAwayName = normalizeText(localMatch.teamB.name);

  const exactMatch = calendarMatches.find((calendarMatch) => {
    const fifaKickoff = new Date(calendarMatch.Date).getTime();
    const homeCode = normalizeText(calendarMatch.Home?.Abbreviation || "");
    const awayCode = normalizeText(calendarMatch.Away?.Abbreviation || "");

    return fifaKickoff === localKickoff && homeCode === localHomeCode && awayCode === localAwayCode;
  });

  if (exactMatch) return exactMatch;

  const nameAndDateMatch = calendarMatches.find((calendarMatch) => {
    const fifaKickoff = new Date(calendarMatch.Date).getTime();
    const homeName = normalizeText(getLocalizedDescription(calendarMatch.Home?.TeamName, language));
    const awayName = normalizeText(getLocalizedDescription(calendarMatch.Away?.TeamName, language));

    return fifaKickoff === localKickoff && homeName === localHomeName && awayName === localAwayName;
  });

  if (nameAndDateMatch) return nameAndDateMatch;

  return calendarMatches.find((calendarMatch) => {
    const homeCode = normalizeText(calendarMatch.Home?.Abbreviation || "");
    const awayCode = normalizeText(calendarMatch.Away?.Abbreviation || "");
    return homeCode === localHomeCode && awayCode === localAwayCode;
  });
};

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "agora-na-copa-2026/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`FIFA API request failed (${response.status}) for ${url}`);
  }

  return (await response.json()) as T;
};

const isPortAvailable = async (port: number, host: string) =>
  new Promise<boolean>((resolve, reject) => {
    const probe = createNetServer();

    probe.once("error", (error: NodeJS.ErrnoException) => {
      probe.close();
      if (error.code === "EADDRINUSE") {
        resolve(false);
        return;
      }

      reject(error);
    });

    probe.once("listening", () => {
      probe.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(true);
      });
    });

    probe.listen(port, host);
  });

const resolveAppPort = async () => {
  let candidatePort = DEFAULT_PORT;

  while (!(await isPortAvailable(candidatePort, HOST))) {
    if (STRICT_PORT) {
      throw new Error(`Port ${candidatePort} is already in use.`);
    }

    candidatePort += 1;
  }

  return candidatePort;
};

app.get("/api/broadcast-guide", async (req, res) => {
  try {
    const country =
      typeof req.query.country === "string" && req.query.country.trim()
        ? req.query.country.trim().toUpperCase()
        : DEFAULT_BROADCAST_COUNTRY;
    const language =
      typeof req.query.language === "string" && req.query.language.trim()
        ? req.query.language.trim()
        : DEFAULT_BROADCAST_LANGUAGE;
    const cacheKey = `${country}:${language}`;

    if (broadcastGuideCache && broadcastGuideCache.key === cacheKey && broadcastGuideCache.expiresAt > Date.now()) {
      return res.json(broadcastGuideCache.payload);
    }

    const [calendarData, watchData] = await Promise.all([
      fetchJson<FifaCalendarResponse>(
        `${FIFA_API_BASE_URL}/calendar/matches?language=${encodeURIComponent(language)}&idCompetition=${FIFA_COMPETITION_ID}&idSeason=${FIFA_SEASON_ID}&count=400`
      ),
      fetchJson<FifaWatchSeasonResponse>(
        `${FIFA_API_BASE_URL}/watch/season/${FIFA_SEASON_ID}/${encodeURIComponent(country)}?language=${encodeURIComponent(language)}`
      ),
    ]);

    const calendarMatches = calendarData.Results || [];
    const watchByMatchId = new Map((watchData.Matches || []).map((match) => [match.IdMatch, match]));

    const guides = Object.fromEntries(
      APP_MATCHES.map((match) => {
        const fifaMatch = findCalendarMatch(match, calendarMatches, language);
        const fifaWatchMatch = fifaMatch ? watchByMatchId.get(fifaMatch.IdMatch) : undefined;
        const fifaBroadcasters = normalizeBroadcasters(fifaWatchMatch?.Sources);
        const hasOfficialGuide = fifaBroadcasters.length > 0;

        return [
          match.id,
          {
            broadcasters: hasOfficialGuide ? fifaBroadcasters : match.broadcasters,
            source: hasOfficialGuide ? "fifa" : "fallback",
            note: hasOfficialGuide
              ? "Dados oficiais do Onde Assistir da FIFA para o Brasil."
              : "Dados oficiais da FIFA indisponíveis para esta partida no momento; exibindo a lista local.",
            fifaMatchId: fifaMatch?.IdMatch,
            updatedAt: new Date().toISOString(),
          } satisfies BroadcastGuideEntry,
        ];
      })
    );

    const payload: BroadcastGuideResponse = {
      country,
      language,
      guides,
    };

    broadcastGuideCache = {
      key: cacheKey,
      expiresAt: Date.now() + BROADCAST_GUIDE_CACHE_TTL_MS,
      payload,
    };

    res.json(payload);
  } catch (error: any) {
    console.error("FIFA API Error in /api/broadcast-guide:", error);
    res.status(502).json({ error: error?.message || "Erro ao carregar guia de transmissão da FIFA" });
  }
});

// Serve frontend build files in production or proxy to Vite in development
async function startServer() {
  const port = await resolveAppPort();
  const httpServer = createHttpServer(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(port, HOST, () => {
    if (port !== DEFAULT_PORT) {
      console.warn(`Port ${DEFAULT_PORT} was busy, using ${port} instead.`);
    }

    console.log(`Server is running on port ${port}`);
  });
}

startServer();
