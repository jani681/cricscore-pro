export function formatOvers(balls: number): string {
  const overs = Math.floor(balls / 6);
  const rem = balls % 6;
  return `${overs}.${rem}`;
}

export function generateMatchSummary(match: any, players: any[]): string {
  return `Match summary for ${match.teamAName} vs ${match.teamBName}`;
}

// ... Additional helpers as needed
