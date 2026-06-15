import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTeamLineupEntry,
  buildMatchStateEntry,
  findCalendarMatch,
  getMatchStatusFromFifa,
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
