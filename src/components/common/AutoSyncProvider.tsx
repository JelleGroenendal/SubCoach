import { useTeamStore } from "@/stores/teamStore";
import { useAutoSync } from "@/data/sync/useAutoSync";

/**
 * Provider component that automatically connects to P2P sync
 * if the active team has a saved sync room code.
 *
 * This should be placed inside the app after the team store is initialized.
 */
export function AutoSyncProvider(): null {
  const activeTeamId = useTeamStore((state) => state.activeTeamId);

  // Auto-connect to P2P sync if team has a saved room code
  useAutoSync(activeTeamId);

  // This component doesn't render anything
  return null;
}
