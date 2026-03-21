// Provider and sync utilities
export {
  getAppDoc,
  getTeamDoc,
  isAppSynced,
  isTeamSynced,
  waitForAppSync,
  waitForTeamSync,
  destroyTeamDoc,
  destroyAll,
  getActiveTeamDocs,
} from "./yjsProvider";

// App-level data access (team refs, settings)
export {
  getTeamRefs,
  addTeamRef,
  updateTeamRef,
  removeTeamRef,
  getActiveTeamId,
  setActiveTeamId,
  getAppSetting,
  setAppSetting,
} from "./appDoc";

// Team-level data access (team info, players, matches)
export {
  getTeamInfo,
  saveTeamInfo,
  getPlayers,
  addPlayer,
  updatePlayer,
  removePlayer,
  getMatches,
  getMatch,
  saveMatch,
  deleteMatch,
  getCurrentMatch,
  saveCurrentMatch,
  clearCurrentMatch,
} from "./teamDoc";

// React hooks for app-level data
export {
  useTeamRefs,
  useActiveTeamId,
  waitForAppSync as waitForApp,
} from "./useAppDoc";

// React hooks for team-level data
export {
  useTeamInfo,
  useTeamPlayers,
  waitForTeamSync as waitForTeam,
} from "./useTeamDoc";

// React hooks for match data
export { useCurrentMatch, useMatchHistory } from "./useMatchDoc";
