import type {
  ScheduleInput,
  SubstitutionPlan,
  SubstitutionSuggestion,
} from "./types";

/**
 * Calculate a substitution schedule that distributes play time equally.
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

  // Calculate ideal play time per player for the remaining match time
  const totalFieldMinutesRemaining = (remainingSeconds * fieldSlots) / 60;
  const idealMinutesPerPlayer = totalFieldMinutesRemaining / totalOutfield;
  const idealSecondsPerPlayer = idealMinutesPerPlayer * 60;

  // Calculate rotation interval: how often should we substitute?
  const benchPlayers = outfieldPlayers.filter((p) => p.status === "bench");
  const fieldPlayersOutfield = outfieldPlayers.filter(
    (p) => p.status === "field",
  );

  if (benchPlayers.length === 0 || fieldPlayersOutfield.length === 0) {
    return { suggestions: [], warnings: [] };
  }

  // Number of rotation groups: ceil(totalOutfield / fieldSlots)
  const rotationGroups = Math.ceil(totalOutfield / fieldSlots);
  const rotationIntervalSeconds = Math.floor(remainingSeconds / rotationGroups);

  if (rotationIntervalSeconds < 30) {
    return {
      suggestions: [],
      warnings: ["match.warnings.tooManyPlayersForTime"],
    };
  }

  // Sort by play time ascending (least play time first for bench, most for field)
  const sortedBench = [...benchPlayers].sort(
    (a, b) => a.totalPlayTimeSeconds - b.totalPlayTimeSeconds,
  );
  const sortedField = [...fieldPlayersOutfield].sort(
    (a, b) => b.totalPlayTimeSeconds - a.totalPlayTimeSeconds,
  );

  const suggestions: SubstitutionSuggestion[] = [];
  const warnings: string[] = [];

  // Generate substitution suggestions at regular intervals
  let subTime = currentTimeSeconds + rotationIntervalSeconds;
  let benchIndex = 0;
  let fieldIndex = 0;

  while (subTime < totalMatchSeconds - 30) {
    // Don't suggest subs in last 30s
    const subsThisRound = Math.min(
      benchPlayers.length,
      sortedField.length - fieldIndex,
      sortedBench.length - benchIndex,
    );

    for (let i = 0; i < subsThisRound; i++) {
      const benchPlayer = sortedBench[benchIndex % sortedBench.length];
      const fieldPlayer = sortedField[fieldIndex % sortedField.length];

      if (benchPlayer && fieldPlayer) {
        suggestions.push({
          timestamp: subTime,
          playerInId: benchPlayer.playerId,
          playerOutId: fieldPlayer.playerId,
          reason: "scheduled",
        });
      }

      benchIndex++;
      fieldIndex++;
    }

    subTime += rotationIntervalSeconds;
  }

  // Check for players with very little play time
  for (const player of outfieldPlayers) {
    const projectedTime = player.totalPlayTimeSeconds + idealSecondsPerPlayer;
    if (projectedTime < 120) {
      // Less than 2 minutes
      warnings.push(`match.warnings.lowPlayTime`);
      break;
    }
  }

  return { suggestions, warnings };
}
