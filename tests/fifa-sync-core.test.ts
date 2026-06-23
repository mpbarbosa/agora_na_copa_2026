import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTeamLineupEntry,
  buildMatchStateEntry,
  findCalendarMatch,
  getMatchStatusFromFifa,
  getOfficialFifaStatusLabel,
  getRefereeFromFifa,
  normalizeBroadcasters,
  SPORTV_URL,
  type FifaCalendarMatch,
  type FifaLiveMatch,
  type FifaLiveTeam,
} from "../fifa-sync-core";
import { Position, type Match, type Player } from "../src/types";

const createMatch = (overrides: Partial<Match> = {}): Match => ({
  id: "ger-cuw-2026",
  teamA: {
    name: "ALEMANHA",
    code: "GER",
    flagSvg: "germany",
    primaryColor: "#000000",
    secondaryColor: "#ffce00",
    group: "Grupo E",
    lineup: [],
  },
  teamB: {
    name: "CURAÇAO",
    code: "CUW",
    flagSvg: "curacao",
    primaryColor: "#002b7f",
    secondaryColor: "#f9e814",
    group: "Grupo E",
    lineup: [],
  },
  stadiumName: "Estádio de Houston",
  city: "HOUSTON",
  stageName: "Group Stage",
  kickoffTime: "14:00",
  kickoffDate: "14 Junho, 2026",
  kickoffTimestamp: "2026-06-14T14:00:00-03:00",
  status: "PRE_GAME",
  countdownTargetSeconds: 0,
  broadcasters: [],
  ...overrides,
});

const createPlayer = (overrides: Partial<Player> & Pick<Player, "id" | "name" | "number">): Player => ({
  id: overrides.id,
  name: overrides.name,
  number: overrides.number,
  position: overrides.position ?? Position.MF,
  x: overrides.x ?? 50,
  y: overrides.y ?? 50,
  club: overrides.club,
  pictureUrl: overrides.pictureUrl,
  socials: overrides.socials,
});

test("getMatchStatusFromFifa maps FIFA status codes into local match statuses", () => {
  const localMatch = createMatch({ status: "PRE_GAME" });

  assert.equal(
    getMatchStatusFromFifa(localMatch, {
      IdMatch: "1",
      Date: "2026-06-14T17:00:00Z",
      MatchStatus: 1,
    }),
    "PRE_GAME",
  );

  assert.equal(
    getMatchStatusFromFifa(localMatch, {
      IdMatch: "1",
      Date: "2026-06-14T17:00:00Z",
      MatchStatus: 3,
      HomeTeamScore: 1,
      AwayTeamScore: 0,
    }),
    "LIVE",
  );

  assert.equal(
    getMatchStatusFromFifa(localMatch, {
      IdMatch: "1",
      Date: "2026-06-14T17:00:00Z",
      MatchStatus: 0,
      HomeTeamScore: 2,
      AwayTeamScore: 1,
    }),
    "FINISHED",
  );

  // Line-ups published (12) is still pre-match, not live.
  assert.equal(
    getMatchStatusFromFifa(localMatch, {
      IdMatch: "1",
      Date: "2026-06-14T17:00:00Z",
      MatchStatus: 12,
    }),
    "PRE_GAME",
  );

  // Interrupted matches: suspended (99), abandoned (4), postponed (7),
  // cancelled (8) all collapse to SUSPENDED.
  for (const code of [99, 4, 7, 8]) {
    assert.equal(
      getMatchStatusFromFifa(localMatch, {
        IdMatch: "1",
        Date: "2026-06-14T17:00:00Z",
        MatchStatus: code,
        HomeTeamScore: 1,
        AwayTeamScore: 0,
      }),
      "SUSPENDED",
      `MatchStatus ${code} should map to SUSPENDED`,
    );
  }
});

test("getOfficialFifaStatusLabel prefers the live period, then the status", () => {
  // Live periods.
  assert.equal(getOfficialFifaStatusLabel(3, 3), "1º tempo");
  assert.equal(getOfficialFifaStatusLabel(3, 4), "Intervalo");
  assert.equal(getOfficialFifaStatusLabel(3, 5), "2º tempo");
  assert.equal(getOfficialFifaStatusLabel(3, 11), "Pênaltis");

  // Terminal/abnormal status wins over any period code.
  assert.equal(getOfficialFifaStatusLabel(0, 10), "Encerrado");
  assert.equal(getOfficialFifaStatusLabel(99, 5), "Paralisado");
  assert.equal(getOfficialFifaStatusLabel(4, 5), "Abandonado");
  assert.equal(getOfficialFifaStatusLabel(7, 1), "Adiado");

  // Status-only fallbacks and the unknown case.
  assert.equal(getOfficialFifaStatusLabel(12, 0), "Escalações divulgadas");
  assert.equal(getOfficialFifaStatusLabel(3, 0), "Em andamento"); // live, period unknown
  assert.equal(getOfficialFifaStatusLabel(undefined, undefined), undefined);
});

test("findCalendarMatch falls back to localized names when abbreviations are unavailable", () => {
  const localMatch = createMatch({
    id: "ned-jpn-2026",
    teamA: {
      name: "HOLANDA",
      code: "NED",
      flagSvg: "netherlands",
      primaryColor: "#ff4f00",
      secondaryColor: "#ffffff",
      group: "Grupo F",
      lineup: [],
    },
    teamB: {
      name: "JAPÃO",
      code: "JPN",
      flagSvg: "japan",
      primaryColor: "#bc002d",
      secondaryColor: "#ffffff",
      group: "Grupo F",
      lineup: [],
    },
    kickoffTimestamp: "2026-06-14T17:00:00-03:00",
  });

  const calendarMatch: FifaCalendarMatch = {
    IdMatch: "400021470",
    Date: "2026-06-14T20:00:00Z",
    Home: {
      TeamName: [{ Locale: "pt-BR", Description: "Holanda" }],
    },
    Away: {
      TeamName: [{ Locale: "pt-BR", Description: "Japão" }],
    },
  };

  assert.equal(findCalendarMatch(localMatch, [calendarMatch], "pt"), calendarMatch);
});

test("buildMatchStateEntry prefers live FIFA score and minute over calendar data", () => {
  const localMatch = createMatch({
    status: "PRE_GAME",
  });
  const calendarMatch: FifaCalendarMatch = {
    IdMatch: "400021464",
    Date: "2026-06-14T17:00:00Z",
    MatchStatus: 3,
    HomeTeamScore: 1,
    AwayTeamScore: 1,
  };
  const liveMatch: FifaLiveMatch = {
    IdMatch: "400021464",
    Date: "2026-06-14T17:00:00Z",
    MatchStatus: 3,
    MatchTime: "44'",
    HomeTeam: { Score: 2 },
    AwayTeam: { Score: 1 },
  };

  const entry = buildMatchStateEntry(localMatch, calendarMatch, liveMatch);

  assert.equal(entry.status, "LIVE");
  assert.deepEqual(entry.score, { teamA: 2, teamB: 1 });
  assert.equal(entry.matchTime, "44'");
  assert.equal(entry.source, "fifa");
  assert.equal(entry.fifaMatchId, "400021464");
});

test("buildMatchStateEntry includes sorted FIFA incidents from live data", () => {
  const localMatch = createMatch({
    status: "LIVE",
  });
  const calendarMatch: FifaCalendarMatch = {
    IdMatch: "400021464",
    Date: "2026-06-14T17:00:00Z",
    MatchStatus: 3,
    HomeTeamScore: 2,
    AwayTeamScore: 1,
  };
  const liveMatch: FifaLiveMatch = {
    IdMatch: "400021464",
    Date: "2026-06-14T17:00:00Z",
    MatchStatus: 3,
    MatchTime: "70'",
    HomeTeam: {
      Score: 2,
      Players: [
        {
          IdPlayer: "10",
          ShortName: [{ Locale: "pt-BR", Description: "MUSIALA" }],
        },
        {
          IdPlayer: "8",
          ShortName: [{ Locale: "pt-BR", Description: "KIMMICH" }],
        },
      ],
      Goals: [
        {
          IdPlayer: "10",
          Minute: "12'",
          Period: 3,
        },
      ],
      Bookings: [
        {
          Card: 1,
          IdPlayer: "8",
          Minute: "41'",
          Period: 3,
        },
      ],
    },
    AwayTeam: {
      Score: 1,
      Players: [
        {
          IdPlayer: "9",
          ShortName: [{ Locale: "pt-BR", Description: "BACUNA" }],
        },
        {
          IdPlayer: "18",
          ShortName: [{ Locale: "pt-BR", Description: "MARGARETHA" }],
        },
      ],
      Goals: [
        {
          IdPlayer: "9",
          Minute: "33'",
          Period: 3,
        },
      ],
      Substitutions: [
        {
          IdPlayerOff: "9",
          IdPlayerOn: "18",
          PlayerOffName: [{ Locale: "en-GB", Description: "BACUNA" }],
          PlayerOnName: [{ Locale: "en-GB", Description: "MARGARETHA" }],
          Minute: "70'",
          Period: 5,
        },
      ],
    },
  };

  const entry = buildMatchStateEntry(localMatch, calendarMatch, liveMatch);

  assert.deepEqual(
    entry.incidents?.map((incident) => ({
      time: incident.time,
      type: incident.type,
      text: incident.text,
      team: incident.team,
    })),
    [
      { time: "12'", type: "GOAL", text: "MUSIALA marcou.", team: "A" },
      { time: "33'", type: "GOAL", text: "BACUNA marcou.", team: "B" },
      {
        time: "41'",
        type: "YELLOW_CARD",
        text: "KIMMICH recebeu amarelo.",
        team: "A",
      },
      {
        time: "70'",
        type: "SUBSTITUTION",
        text: "Sai BACUNA, entra MARGARETHA.",
        team: "B",
      },
    ],
  );
  assert.deepEqual(
    entry.incidents?.[3]?.playerMentions?.map((mention) => mention.name),
    ["BACUNA", "MARGARETHA"],
  );
});

test("buildMatchStateEntry recovers a goal scorer's shirt number from the registry when FIFA omits it", () => {
  // Regression: FIFA's live feed often publishes a substitute goal scorer with a
  // null ShirtNumber, which previously left the player card showing "Camisa 0".
  // The mention should recover number and position from the local squad registry
  // (Deniz Undav, FIFA id 484851 → GER #26, forward).
  const localMatch = createMatch({ status: "LIVE" });
  const calendarMatch: FifaCalendarMatch = {
    IdMatch: "400021464",
    Date: "2026-06-20T17:00:00Z",
    MatchStatus: 3,
    HomeTeamScore: 1,
    AwayTeamScore: 0,
  };
  const liveMatch: FifaLiveMatch = {
    IdMatch: "400021464",
    Date: "2026-06-20T17:00:00Z",
    MatchStatus: 3,
    MatchTime: "90'+4'",
    HomeTeam: {
      Score: 1,
      Players: [
        {
          IdPlayer: "484851",
          ShortName: [{ Locale: "pt-BR", Description: "UNDAV" }],
          ShirtNumber: null,
          Position: null,
        },
      ],
      Goals: [{ IdPlayer: "484851", Minute: "90'+4'", Period: 5 }],
    },
    AwayTeam: { Score: 0, Players: [], Goals: [] },
  };

  const entry = buildMatchStateEntry(localMatch, calendarMatch, liveMatch);
  const mention = entry.incidents?.find((i) => i.type === "GOAL")?.playerMentions?.[0];

  assert.equal(mention?.number, 26);
  assert.equal(mention?.position, "FW");
});

test("buildMatchStateEntry falls back to local match state when FIFA data is unavailable", () => {
  const localMatch = createMatch({
    status: "FINISHED",
    score: {
      teamA: 0,
      teamB: 1,
    },
  });

  const entry = buildMatchStateEntry(localMatch, undefined);

  assert.equal(entry.status, "FINISHED");
  assert.deepEqual(entry.score, { teamA: 0, teamB: 1 });
  assert.equal(entry.source, "fallback");
  assert.match(entry.note, /estado local/i);
});

test("getRefereeFromFifa extracts the main referee from the Officials list", () => {
  const calendarMatch: FifaCalendarMatch = {
    IdMatch: "400021492",
    Date: "2026-06-22T18:00:00Z",
    Officials: [
      {
        OfficialId: "372930",
        IdCountry: "CAN",
        OfficialType: 1,
        Name: [{ Locale: "en-GB", Description: "Drew Fischer" }],
      },
      {
        OfficialId: "999001",
        IdCountry: "USA",
        OfficialType: 2,
        Name: [{ Locale: "en-GB", Description: "Some Assistant" }],
      },
    ],
  };

  assert.deepEqual(getRefereeFromFifa(calendarMatch), {
    name: "Drew Fischer",
    country: "CAN",
    fifaOfficialId: "372930",
  });
});

test("getRefereeFromFifa returns undefined when no referee has been assigned", () => {
  assert.equal(getRefereeFromFifa(undefined), undefined);
  assert.equal(getRefereeFromFifa({ IdMatch: "1", Date: "2026-06-22T18:00:00Z" }), undefined);
  assert.equal(
    getRefereeFromFifa({
      IdMatch: "1",
      Date: "2026-06-22T18:00:00Z",
      Officials: [{ OfficialId: "x", IdCountry: "USA", OfficialType: 4 }],
    }),
    undefined,
  );
});

test("buildMatchStateEntry surfaces the FIFA referee on the match state", () => {
  const localMatch = createMatch({ status: "FINISHED" });
  const calendarMatch: FifaCalendarMatch = {
    IdMatch: "400021492",
    Date: "2026-06-22T18:00:00Z",
    MatchStatus: 0,
    HomeTeamScore: 3,
    AwayTeamScore: 0,
    Officials: [
      {
        OfficialId: "372930",
        IdCountry: "CAN",
        OfficialType: 1,
        Name: [{ Locale: "en-GB", Description: "Drew Fischer" }],
      },
    ],
  };

  const entry = buildMatchStateEntry(localMatch, calendarMatch);

  assert.deepEqual(entry.referee, {
    name: "Drew Fischer",
    country: "CAN",
    fifaOfficialId: "372930",
  });
});

test("normalizeBroadcasters normalizes sportv URLs and deduplicates repeated channels", () => {
  const broadcasters = normalizeBroadcasters([
    {
      IdChannel: "26",
      Name: "sportv",
      Url: "https://canaisglobo.globo.com/c/sportv/",
    },
    {
      IdChannel: "26b",
      Name: "sportv",
      TvChannelUrl: "https://canaisglobo.globo.com/c/sportv/",
    },
    {
      IdChannel: "451",
      Name: "Cazé TV",
      Url: "https://www.youtube.com/@CazeTV",
      Logo: "https://extranets.fifa.com/TvStationPhotos/451.png",
    },
  ]);

  assert.equal(broadcasters.length, 2);
  assert.equal(broadcasters[0]?.link, SPORTV_URL);
  assert.equal(broadcasters[0]?.type, "TV PAGA");
  assert.equal(broadcasters[1]?.type, "YOUTUBE");
});

test("buildTeamLineupEntry matches fallback players by name before shirt number only", () => {
  const fallbackLineup = [
    createPlayer({
      id: "bel-10",
      name: "Romelu Lukaku",
      number: 10,
    }),
    createPlayer({
      id: "bel-11",
      name: "Leandro Trossard",
      number: 11,
    }),
    createPlayer({
      id: "bel-22",
      name: "Jérémy Doku",
      number: 22,
    }),
    createPlayer({
      id: "bel-1",
      name: "Koen Casteels",
      number: 1,
    }),
    createPlayer({
      id: "bel-4",
      name: "Wout Faes",
      number: 4,
    }),
  ];

  const fifaTeam: FifaLiveTeam = {
    Tactics: "4-2-3-1",
    Players: [
      {
        IdPlayer: "358112",
        PlayerName: [{ Locale: "en", Description: "Romelu LUKAKU" }],
        ShortName: [{ Locale: "en", Description: "LUKAKU" }],
        ShirtNumber: 9,
        Position: 3,
        PlayerPicture: { PictureUrl: "https://digitalhub.fifa.com/LUKAKU-Romelu_358112" },
      },
      {
        IdPlayer: "448355",
        PlayerName: [{ Locale: "en", Description: "Leandro TROSSARD" }],
        ShortName: [{ Locale: "en", Description: "TROSSARD" }],
        ShirtNumber: 10,
        Position: 2,
        PlayerPicture: { PictureUrl: "https://digitalhub.fifa.com/TROSSARD-Leandro_448355" },
      },
      {
        IdPlayer: "448341",
        PlayerName: [{ Locale: "en", Description: "Jeremy DOKU" }],
        ShortName: [{ Locale: "en", Description: "DOKU" }],
        ShirtNumber: 11,
        Position: 3,
        PlayerPicture: { PictureUrl: "https://digitalhub.fifa.com/DOKU-Jeremy_448341" },
      },
      {
        IdPlayer: "courtois",
        PlayerName: [{ Locale: "en", Description: "Thibaut COURTOIS" }],
        ShortName: [{ Locale: "en", Description: "COURTOIS" }],
        ShirtNumber: 1,
        Position: 0,
        PlayerPicture: { PictureUrl: "https://digitalhub.fifa.com/COURTOIS-Thibaut" },
      },
      {
        IdPlayer: "mechele",
        PlayerName: [{ Locale: "en", Description: "Brandon MECHELE" }],
        ShortName: [{ Locale: "en", Description: "MECHELE" }],
        ShirtNumber: 4,
        Position: 1,
        PlayerPicture: { PictureUrl: "https://digitalhub.fifa.com/MECHELE-Brandon" },
      },
    ],
  };

  const entry = buildTeamLineupEntry(
    "BEL",
    fallbackLineup,
    { IdMatch: "400021478", Date: "2026-06-15T20:00:00Z" },
    fifaTeam,
  );

  assert.equal(entry.source, "fallback");

  const lukaku = entry.players.find((player) => player.name === "Romelu Lukaku");
  const trossard = entry.players.find((player) => player.name === "Leandro Trossard");
  const doku = entry.players.find((player) => player.name === "Jérémy Doku");
  const casteels = entry.players.find((player) => player.name === "Koen Casteels");
  const faes = entry.players.find((player) => player.name === "Wout Faes");

  assert.deepEqual(
    {
      number: lukaku?.number,
      pictureUrl: lukaku?.pictureUrl,
    },
    {
      number: 9,
      pictureUrl: "https://digitalhub.fifa.com/LUKAKU-Romelu_358112",
    },
  );
  assert.deepEqual(
    {
      number: trossard?.number,
      pictureUrl: trossard?.pictureUrl,
    },
    {
      number: 10,
      pictureUrl: "https://digitalhub.fifa.com/TROSSARD-Leandro_448355",
    },
  );
  assert.deepEqual(
    {
      number: doku?.number,
      pictureUrl: doku?.pictureUrl,
    },
    {
      number: 11,
      pictureUrl: "https://digitalhub.fifa.com/DOKU-Jeremy_448341",
    },
  );
  assert.equal(casteels?.pictureUrl, undefined);
  assert.equal(faes?.pictureUrl, undefined);
});

test("buildTeamLineupEntry preserves local socials when FIFA starters replace fallback players", () => {
  const fallbackLineup = [
    createPlayer({
      id: "cv1",
      name: "Vozinha",
      number: 1,
      position: Position.GK,
      club: "Gil Vicente",
      socials: {
        instagram: "https://instagram.com/vozinha1",
      },
    }),
    createPlayer({
      id: "cv2",
      name: "Stopira",
      number: 5,
      position: Position.DF,
    }),
    createPlayer({
      id: "cv3",
      name: "Kevin Pina",
      number: 8,
      position: Position.MF,
    }),
    createPlayer({
      id: "cv4",
      name: "Bebé",
      number: 21,
      position: Position.FW,
    }),
    createPlayer({
      id: "cv5",
      name: "Roberto Lopes",
      number: 4,
      position: Position.DF,
    }),
    createPlayer({
      id: "cv6",
      name: "Logan Costa",
      number: 3,
      position: Position.DF,
    }),
    createPlayer({
      id: "cv7",
      name: "João Paulo",
      number: 2,
      position: Position.DF,
    }),
    createPlayer({
      id: "cv8",
      name: "Deroy Duarte",
      number: 6,
      position: Position.MF,
    }),
    createPlayer({
      id: "cv9",
      name: "Jovane Cabral",
      number: 10,
      position: Position.MF,
    }),
    createPlayer({
      id: "cv10",
      name: "Ryan Mendes",
      number: 7,
      position: Position.FW,
    }),
    createPlayer({
      id: "cv11",
      name: "Willy Semedo",
      number: 11,
      position: Position.FW,
    }),
  ];

  const fifaTeam: FifaLiveTeam = {
    Tactics: "4-3-3",
    Players: [
      {
        IdPlayer: "vozinha-fifa",
        PlayerName: [{ Locale: "en", Description: "Josimar Dias Vozinha" }],
        ShortName: [{ Locale: "en", Description: "VOZINHA" }],
        ShirtNumber: 1,
        Position: 0,
        PlayerPicture: { PictureUrl: "https://digitalhub.fifa.com/VOZINHA" },
      },
      {
        IdPlayer: "stopira-fifa",
        PlayerName: [{ Locale: "en", Description: "Stopira" }],
        ShortName: [{ Locale: "en", Description: "STOPIRA" }],
        ShirtNumber: 5,
        Position: 1,
      },
      {
        IdPlayer: "pina-fifa",
        PlayerName: [{ Locale: "en", Description: "Kevin Pina" }],
        ShortName: [{ Locale: "en", Description: "K PINA" }],
        ShirtNumber: 8,
        Position: 2,
      },
      {
        IdPlayer: "bebe-fifa",
        PlayerName: [{ Locale: "en", Description: "Bebe" }],
        ShortName: [{ Locale: "en", Description: "BEBE" }],
        ShirtNumber: 21,
        Position: 3,
      },
      {
        IdPlayer: "lopes-fifa",
        PlayerName: [{ Locale: "en", Description: "Roberto Lopes" }],
        ShortName: [{ Locale: "en", Description: "R LOPES" }],
        ShirtNumber: 4,
        Position: 1,
      },
      {
        IdPlayer: "costa-fifa",
        PlayerName: [{ Locale: "en", Description: "Logan Costa" }],
        ShortName: [{ Locale: "en", Description: "L COSTA" }],
        ShirtNumber: 3,
        Position: 1,
      },
      {
        IdPlayer: "joaopaulo-fifa",
        PlayerName: [{ Locale: "en", Description: "Joao Paulo" }],
        ShortName: [{ Locale: "en", Description: "J PAULO" }],
        ShirtNumber: 2,
        Position: 1,
      },
      {
        IdPlayer: "duarte-fifa",
        PlayerName: [{ Locale: "en", Description: "Deroy Duarte" }],
        ShortName: [{ Locale: "en", Description: "D DUARTE" }],
        ShirtNumber: 6,
        Position: 2,
      },
      {
        IdPlayer: "cabral-fifa",
        PlayerName: [{ Locale: "en", Description: "Jovane Cabral" }],
        ShortName: [{ Locale: "en", Description: "J CABRAL" }],
        ShirtNumber: 10,
        Position: 2,
      },
      {
        IdPlayer: "mendes-fifa",
        PlayerName: [{ Locale: "en", Description: "Ryan Mendes" }],
        ShortName: [{ Locale: "en", Description: "R MENDES" }],
        ShirtNumber: 7,
        Position: 3,
      },
      {
        IdPlayer: "semedo-fifa",
        PlayerName: [{ Locale: "en", Description: "Willy Semedo" }],
        ShortName: [{ Locale: "en", Description: "W SEMEDO" }],
        ShirtNumber: 11,
        Position: 3,
      },
    ],
  };

  const entry = buildTeamLineupEntry(
    "CPV",
    fallbackLineup,
    { IdMatch: "400021999", Date: "2026-06-15T20:00:00Z" },
    fifaTeam,
  );

  assert.equal(entry.source, "fifa");

  const vozinha = entry.players.find((player) => player.name === "VOZINHA");
  assert.equal(vozinha?.club, "Gil Vicente");
  assert.deepEqual(vozinha?.socials, {
    instagram: "https://instagram.com/vozinha1",
  });
  assert.equal(vozinha?.pictureUrl, "https://digitalhub.fifa.com/VOZINHA");
});

test("buildTeamLineupEntry recovers a missing FIFA shirt number from the local lineup", () => {
  const roster: Array<[string, Position]> = [
    ["Vozinha", Position.GK],
    ["Stopira", Position.DF],
    ["Roberto Lopes", Position.DF],
    ["Logan Costa", Position.DF],
    ["João Paulo", Position.DF],
    ["Kevin Pina", Position.MF],
    ["Deroy Duarte", Position.MF],
    ["Jovane Cabral", Position.MF],
    ["Ryan Mendes", Position.FW],
    ["Bebé", Position.FW],
    ["Willy Semedo", Position.FW],
  ];
  const fallbackLineup = roster.map(([name, position], i) =>
    createPlayer({ id: `cv${i + 1}`, name, number: i + 1, position }),
  );

  const fifaPositionFor = (position: Position) =>
    position === Position.GK ? 0 : position === Position.DF ? 1 : position === Position.MF ? 2 : 3;
  const fifaTeam: FifaLiveTeam = {
    Tactics: "4-3-3",
    Players: roster.map(([name, position], i) => ({
      IdPlayer: `${name}-fifa`,
      PlayerName: [{ Locale: "en", Description: name }],
      ShortName: [{ Locale: "en", Description: name }],
      // Vozinha (the GK) is published by FIFA without a shirt number.
      ShirtNumber: name === "Vozinha" ? undefined : i + 1,
      Position: fifaPositionFor(position),
    })),
  };

  const entry = buildTeamLineupEntry(
    "CPV",
    fallbackLineup,
    { IdMatch: "400021999", Date: "2026-06-15T20:00:00Z" },
    fifaTeam,
  );

  assert.equal(entry.source, "fifa");
  const vozinha = entry.players.find((player) => player.name === "Vozinha");
  // Without recovery this would render as 0; the local lineup supplies 1.
  assert.equal(vozinha?.number, 1);
});

test("buildTeamLineupEntry adds supplemental metadata for FIFA starters missing from local lineup", () => {
  const fallbackLineup = [
    createPlayer({
      id: "sau1",
      name: "Mohammed Al-Owais",
      number: 21,
      position: Position.GK,
    }),
    createPlayer({
      id: "sau2",
      name: "Saud Abdulhamid",
      number: 12,
      position: Position.DF,
    }),
    createPlayer({
      id: "sau3",
      name: "Hassan Kadesh",
      number: 14,
      position: Position.DF,
    }),
    createPlayer({
      id: "sau4",
      name: "Ali Al-Bulaihi",
      number: 5,
      position: Position.DF,
    }),
    createPlayer({
      id: "sau5",
      name: "Yasser Al-Shahrani",
      number: 13,
      position: Position.DF,
    }),
    createPlayer({
      id: "sau6",
      name: "Mohamed Kanno",
      number: 23,
      position: Position.MF,
    }),
    createPlayer({
      id: "sau7",
      name: "Nasser Al-Dawsari",
      number: 8,
      position: Position.MF,
    }),
    createPlayer({
      id: "sau8",
      name: "Salem Al-Dawsari",
      number: 10,
      position: Position.MF,
    }),
    createPlayer({
      id: "sau9",
      name: "Firas Al-Buraikan",
      number: 9,
      position: Position.FW,
    }),
    createPlayer({
      id: "sau10",
      name: "Saleh Al-Shehri",
      number: 11,
      position: Position.FW,
    }),
    createPlayer({
      id: "sau11",
      name: "Abdulrahman Ghareeb",
      number: 7,
      position: Position.FW,
    }),
  ];

  const fifaTeam: FifaLiveTeam = {
    Tactics: "4-3-3",
    Players: [
      { IdPlayer: "sau-gk", PlayerName: [{ Locale: "en", Description: "Mohammed Al-Owais" }], ShortName: [{ Locale: "en", Description: "AL-OWAIS" }], ShirtNumber: 21, Position: 0 },
      { IdPlayer: "sau-rb", PlayerName: [{ Locale: "en", Description: "Saud Abdulhamid" }], ShortName: [{ Locale: "en", Description: "ABDULHAMID" }], ShirtNumber: 12, Position: 1 },
      { IdPlayer: "sau-cb1", PlayerName: [{ Locale: "en", Description: "Abdulilah Alamri" }], ShortName: [{ Locale: "en", Description: "ALAMRI" }], ShirtNumber: 4, Position: 1, PlayerPicture: { PictureUrl: "https://images.fifa.test/alamri.png" } },
      { IdPlayer: "sau-cb2", PlayerName: [{ Locale: "en", Description: "Ali Al-Bulaihi" }], ShortName: [{ Locale: "en", Description: "AL-BULAIHI" }], ShirtNumber: 5, Position: 1 },
      { IdPlayer: "sau-lb", PlayerName: [{ Locale: "en", Description: "Yasser Al-Shahrani" }], ShortName: [{ Locale: "en", Description: "AL-SHAHRANI" }], ShirtNumber: 13, Position: 1 },
      { IdPlayer: "sau-mf1", PlayerName: [{ Locale: "en", Description: "Mohamed Kanno" }], ShortName: [{ Locale: "en", Description: "KANNO" }], ShirtNumber: 23, Position: 2 },
      { IdPlayer: "sau-mf2", PlayerName: [{ Locale: "en", Description: "Nasser Al-Dawsari" }], ShortName: [{ Locale: "en", Description: "AL-DAWSARI" }], ShirtNumber: 8, Position: 2 },
      { IdPlayer: "sau-mf3", PlayerName: [{ Locale: "en", Description: "Salem Al-Dawsari" }], ShortName: [{ Locale: "en", Description: "AL-DAWSARI" }], ShirtNumber: 10, Position: 2 },
      { IdPlayer: "sau-fw1", PlayerName: [{ Locale: "en", Description: "Firas Al-Buraikan" }], ShortName: [{ Locale: "en", Description: "AL-BURAIKAN" }], ShirtNumber: 9, Position: 3 },
      { IdPlayer: "sau-fw2", PlayerName: [{ Locale: "en", Description: "Saleh Al-Shehri" }], ShortName: [{ Locale: "en", Description: "AL-SHEHRI" }], ShirtNumber: 11, Position: 3 },
      { IdPlayer: "sau-fw3", PlayerName: [{ Locale: "en", Description: "Abdulrahman Ghareeb" }], ShortName: [{ Locale: "en", Description: "GHAREEB" }], ShirtNumber: 7, Position: 3 },
    ],
  };

  const entry = buildTeamLineupEntry(
    "KSA",
    fallbackLineup,
    { IdMatch: "400021600", Date: "2026-06-15T20:00:00Z" },
    fifaTeam,
  );

  assert.equal(entry.source, "fifa");
  const alamri = entry.players.find((player) => player.name === "ALAMRI");
  assert.ok(alamri, "ALAMRI should be present in the merged lineup");
  // pictureUrl from the FIFA live player object
  assert.equal(alamri?.pictureUrl, "https://images.fifa.test/alamri.png");
  // fullName, dateOfBirth, height enriched from squads.json via resolvePlayerEntry
  // (ALAMRI is absent from the fallback lineup, so enrichment comes from the registry alone)
  assert.equal(alamri?.fullName, "Abdulelah Alamri");
  assert.equal(alamri?.dateOfBirth, "1997-01-15");
  assert.equal(alamri?.height, 185);
});
