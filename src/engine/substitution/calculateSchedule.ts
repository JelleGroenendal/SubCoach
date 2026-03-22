import type {
  ScheduleInput,
  SubstitutionPlan,
  SubstitutionSuggestion,
} from "./types";

/**
 * Calculate substitution suggestions based on play time fairness.
 *
 * The algorithm:
 * 1. Calculate LIVE play time for each player (including current session)
 * 2. Find the field player with MOST play time (should come off)
 * 3. Find the bench player with LEAST play time (should go on)
 * 4. If the difference exceeds a threshold, suggest a swap
 *
 * Pure function: same input always produces same output.
 * Time is passed as parameter, never read from Date.now().
 */
export function calculateSchedule(input: ScheduleInput): SubstitutionPlan {
  const {
    roster,
    totalMatchSeconds,
    currentTimeSeconds,
    playersOnField,
    hasKeeper,
  } = input;

  const fieldSlots = hasKeeper ? playersOnField - 1 : playersOnField;
  const outfieldPlayers = roster.filter((p) => !p.isKeeper);
  const totalOutfield = outfieldPlayers.length;

  // If everyone fits on the field, no subs needed
  if (totalOutfield <= fieldSlots) {
    return { suggestions: [], warnings: [] };
  }

  const remainingSeconds = totalMatchSeconds - currentTimeSeconds;
  if (remainingSeconds <= 0) {
    return { suggestions: [], warnings: [] };
  }

  // Separate field and bench players
  const benchPlayers = outfieldPlayers.filter((p) => p.status === "bench");
  const fieldPlayersOutfield = outfieldPlayers.filter(
    (p) => p.status === "field",
  );

  if (benchPlayers.length === 0 || fieldPlayersOutfield.length === 0) {
    return { suggestions: [], warnings: [] };
  }

  const suggestions: SubstitutionSuggestion[] = [];
  const warnings: string[] = [];

  // Calculate what % of ideal time each player has
  // Field player with highest play time should come off
  // Bench player with lowest play time should go on

  // Sort field players by play time (highest first - should come off)
  const sortedField = [...fieldPlayersOutfield].sort(
    (a, b) => b.totalPlayTimeSeconds - a.totalPlayTimeSeconds,
  );

  // Sort bench players by play time (lowest first - should go on)
  const sortedBench = [...benchPlayers].sort(
    (a, b) => a.totalPlayTimeSeconds - b.totalPlayTimeSeconds,
  );

  // Get the player who should come off (most play time on field)
  const playerOut = sortedField[0];
  // Get the player who should go on (least play time on bench)
  const playerIn = sortedBench[0];

  if (playerOut && playerIn) {
    // Calculate the play time difference
    const playTimeDiff =
      playerOut.totalPlayTimeSeconds - playerIn.totalPlayTimeSeconds;

    // Calculate threshold for when a sub is "due"
    // A sub is due when the difference exceeds the rotation interval
    // Rotation interval = remaining time / number of rotation groups
    const rotationGroups = Math.ceil(totalOutfield / fieldSlots);
    const rotationIntervalSeconds = Math.floor(
      remainingSeconds / rotationGroups,
    );

    // Minimum threshold: at least 60 seconds difference, or rotation interval
    const threshold = Math.max(60, Math.min(rotationIntervalSeconds, 180));

    // If there's a significant imbalance, suggest a substitution
    if (playTimeDiff >= threshold || remainingSeconds < 120) {
      // When there's less than 2 min left, suggest if ANY imbalance exists
      const urgencyCheck = remainingSeconds < 120 ? playTimeDiff > 30 : true;

      if (urgencyCheck) {
        suggestions.push({
          timestamp: currentTimeSeconds, // Suggest NOW, not a future time
          playerInId: playerIn.playerId,
          playerOutId: playerOut.playerId,
          reason: "fairness",
        });
      }
    }

    // Also generate the next few suggestions for visibility
    // (who would sub after this one)
    if (
      suggestions.length > 0 &&
      sortedField.length > 1 &&
      sortedBench.length > 1
    ) {
      const nextFieldOut = sortedField[1];
      const nextBenchIn = sortedBench[1];
      if (nextFieldOut && nextBenchIn) {
        const nextDiff =
          nextFieldOut.totalPlayTimeSeconds - nextBenchIn.totalPlayTimeSeconds;
        if (nextDiff > threshold / 2) {
          suggestions.push({
            timestamp: currentTimeSeconds + rotationIntervalSeconds,
            playerInId: nextBenchIn.playerId,
            playerOutId: nextFieldOut.playerId,
            reason: "scheduled",
          });
        }
      }
    }
  }

  // Check for rotation interval being too short (too many players)
  const rotationGroups = Math.ceil(totalOutfield / fieldSlots);
  const rotationIntervalSeconds = Math.floor(remainingSeconds / rotationGroups);

  if (rotationIntervalSeconds < 30) {
    warnings.push("match.warnings.tooManyPlayersForTime");
  }

  // Check for players who will get very little play time
  const minExpectedPlayTime = remainingSeconds / rotationGroups;
  for (const player of benchPlayers) {
    const projectedTime = player.totalPlayTimeSeconds + minExpectedPlayTime;
    if (projectedTime < 60) {
      // Less than 1 minute total
      warnings.push("match.warnings.lowPlayTime");
      break;
    }
  }

  return { suggestions, warnings };
}
