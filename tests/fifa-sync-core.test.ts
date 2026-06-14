import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMatchStateEntry,
  findCalendarMatch,
  getMatchStatusFromFifa,
  normalizeBroadcasters,
  SPORTV_URL,
  type FifaCalendarMatch,
  type FifaLiveMatch,
} from "../fifa-sync-core";
import type { Match } from "../src/types";

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
