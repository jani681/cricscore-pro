/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BallRecord, Innings, Player, PlayerMatchStats, TeamStanding, CareerStats, Match } from './types';

export function createEmptyCareerStats(): CareerStats {
  return {
    totalRuns: 0,
    totalBallsFaced: 0,
    totalWickets: 0,
    totalOversBowled: 0,
    totalRunsConceded: 0,
    highestScore: 0,
    bestBowling: { wickets: 0, runs: 0 },
    matchesPlayed: 0,
    fifties: 0,
    centuries: 0,
    fiveWickets: 0,
  };
}

export function calculateOvers(balls: number): string {
  const overs = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return `${overs}.${remainingBalls}`;
}

export function calculateStrikeRate(runs: number, balls: number): string {
  if (balls === 0) return '0.00';
  return ((runs / balls) * 100).toFixed(2);
}

export function calculateEconomy(runs: number, balls: number): string {
  if (balls === 0) return '0.00';
  const overs = balls / 6;
  return (runs / overs).toFixed(2);
}

export function getPlayerStats(player: Player, innings: Innings[]): PlayerMatchStats {
  const stats: PlayerMatchStats = {
    playerId: player.id,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    wickets: 0,
    oversBowled: 0,
    runsConceded: 0,
    maidens: 0,
  };

  let totalBallsBowled = 0;

  innings.forEach(inning => {
    inning.ballsList.forEach(ball => {
      // Batting stats
      if (ball.batsmanId === player.id) {
        if (!ball.isWide) {
          stats.ballsFaced++;
          stats.runs += ball.runs;
          if (ball.runs === 4) stats.fours++;
          if (ball.runs === 6) stats.sixes++;
        }
      }

      // Bowling stats
      if (ball.bowlerId === player.id) {
        if (!ball.isWide && !ball.isNoBall) {
          totalBallsBowled++;
        }
        stats.runsConceded += ball.runs;
        if (ball.isWide) stats.runsConceded += 1;
        if (ball.isNoBall) stats.runsConceded += 1;
        
        if (ball.isWicket && ball.wicketType !== 'runout') {
          stats.wickets++;
        }
      }
    });
  });

  stats.oversBowled = totalBallsBowled / 6;
  return stats;
}

export function calculateTeamStandings(matches: Match[]): TeamStanding[] {
  const standingsMap: Record<string, TeamStanding> = {};

  const getTeam = (name: string) => {
    if (!standingsMap[name]) {
      standingsMap[name] = {
        teamName: name,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        nrr: 0,
        points: 0,
      };
    }
    return standingsMap[name];
  };

  matches.filter(m => m.status === 'completed').forEach(m => {
    const teamA = getTeam(m.teamAName);
    const teamB = getTeam(m.teamBName);

    teamA.played++;
    teamB.played++;

    if (m.winnerTeamId === 'teamA') {
      teamA.won++;
      teamA.points += 2;
      teamB.lost++;
    } else if (m.winnerTeamId === 'teamB') {
      teamB.won++;
      teamB.points += 2;
      teamA.lost++;
    } else {
      teamA.tied++;
      teamA.points += 1;
      teamB.tied++;
      teamB.points += 1;
    }

    // NRR Calculation (Simplified)
    // NRR = (Total Runs Scored / Total Overs Faced) - (Total Runs Conceded / Total Overs Bowled)
    // This requires tracking balls faced/bowled per team across all matches
    // For this simple version, we'll leave it as 0 or calculate if we had team-level totals
  });

  return Object.values(standingsMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    return b.nrr - a.nrr;
  });
}

export function updatePlayerCareerStats(player: Player, match: Match): Player {
  const matchStats = getPlayerStats(player, match.innings);
  const career = { ...player.careerStats };

  career.matchesPlayed++;
  career.totalRuns += matchStats.runs;
  career.totalBallsFaced += matchStats.ballsFaced;
  career.totalWickets += matchStats.wickets;
  career.totalOversBowled += matchStats.oversBowled;
  career.totalRunsConceded += matchStats.runsConceded;

  if (matchStats.runs > career.highestScore) {
    career.highestScore = matchStats.runs;
  }

  if (matchStats.wickets > career.bestBowling.wickets || 
     (matchStats.wickets === career.bestBowling.wickets && matchStats.runsConceded < career.bestBowling.runs)) {
    career.bestBowling = { wickets: matchStats.wickets, runs: matchStats.runsConceded };
  }

  if (matchStats.runs >= 100) career.centuries++;
  else if (matchStats.runs >= 50) career.fifties++;

  if (matchStats.wickets >= 5) career.fiveWickets++;

  // Add auto-achievements
  const newAchievements = [...player.achievements];
  const oppositionName = match.teamAName === (match.teamAPlayerIds.includes(player.id) ? match.teamAName : match.teamBName) ? match.teamBName : match.teamAName;

  if (matchStats.runs >= 100) {
    newAchievements.push({
      id: crypto.randomUUID(),
      title: '💯 Century Badge',
      description: `Spectacular century! Scored ${matchStats.runs} runs against ${oppositionName}.`,
      date: Date.now()
    });
  } else if (matchStats.runs >= 50) {
    newAchievements.push({
      id: crypto.randomUUID(),
      title: '🏏 Half-Century Badge',
      description: `Solid performance! Scored ${matchStats.runs} runs against ${oppositionName}.`,
      date: Date.now()
    });
  }

  if (matchStats.wickets >= 5) {
    newAchievements.push({
      id: crypto.randomUUID(),
      title: '🖐️ 5-Wicket Haul Badge',
      description: `Bowling Masterclass! Took ${matchStats.wickets} wickets against ${oppositionName}.`,
      date: Date.now()
    });
  }

  // Hat-trick detection
  match.innings.forEach(inn => {
    const bowlerBalls = inn.ballsList.filter(b => b.bowlerId === player.id && !b.isWide && !b.isNoBall);
    for (let i = 0; i <= bowlerBalls.length - 3; i++) {
      if (bowlerBalls[i].isWicket && bowlerBalls[i+1].isWicket && bowlerBalls[i+2].isWicket) {
        newAchievements.push({
          id: crypto.randomUUID(),
          title: '🎩 Hat-trick Badge',
          description: `UNBELIEVABLE! 3 wickets in 3 balls against ${oppositionName}.`,
          date: Date.now()
        });
        break; // Only award once per bowler per innings for simplicity
      }
    }
  });

  return { ...player, careerStats: career, achievements: newAchievements };
}

export function formatOvers(balls: number): string {
  const overs = Math.floor(balls / 6);
  const rem = balls % 6;
  return `${overs}.${rem}`;
}

export function generateMatchSummary(match: Match, players: Player[]): string {
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';
  
  let summary = `🏏 *Match: ${match.teamAName} vs ${match.teamBName}*\n`;
  if (match.leagueName) summary += `🏆 League: ${match.leagueName}\n`;
  if (match.umpireName) summary += `👮 Umpire: ${match.umpireName}\n`;
  summary += `Status: ${match.status.toUpperCase()}\n`;
  summary += `📅 Date: ${new Date(match.createdAt).toLocaleString()}\n\n`;

  match.innings.forEach((inning: any, index: number) => {
    const batTeam = index === 0 ? match.teamAName : match.teamBName;
    summary += `*${batTeam} Innings:*\n`;
    summary += `Score: ${inning.score}/${inning.wickets} (${formatOvers(inning.balls)} ov)\n`;
  });

  if (match.winnerTeamId) {
    const winnerName = match.winnerTeamId === 'teamA' ? match.teamAName : match.teamBName;
    summary += `\n🎯 *Winner:* ${winnerName}\n`;
  }

  if (match.manOfTheMatch) {
    summary += `🌟 *Man of the Match:* ${getPlayerName(match.manOfTheMatch)}\n`;
  }

  return summary;
}

export function generateWhatsAppReminder(match: Match, players: Player[]): string {
  let text = `📢 *Match Reminder!* 🏏\n\n`;
  text += `🏟️ *${match.teamAName}* vs *${match.teamBName}*\n`;
  if (match.leagueName) text += `🏆 Tournament: ${match.leagueName}\n`;
  if (match.umpireName) text += `👮 Umpire: ${match.umpireName}\n`;
  text += `⏰ Time: ${new Date(match.scheduledTime || match.createdAt).toLocaleString()}\n\n`;
  text += `Be there on time! 🚀`;
  return encodeURIComponent(text);
}

export function speak(text: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

export function getCommentary(ball: BallRecord, players: Player[]): string {
  const batsman = players.find(p => p.id === ball.batsmanId)?.name || 'The batsman';
  const bowler = players.find(p => p.id === ball.bowlerId)?.name || 'The bowler';

  if (ball.isWicket) return `Out! ${bowler} strikes! ${batsman} has to walk back. What a massive result!`;
  if (ball.runs === 6) return `Boom! That is a huge six! ${batsman} smashes it out of the ground!`;
  if (ball.runs === 4) return `Shot! That is a boundary for four! ${batsman} finding the gap perfectly.`;
  if (ball.isWide) return `Wide ball! Bowler missing the line there.`;
  if (ball.isNoBall) return `No ball! That's a mistake from the bowler.`;
  if (ball.runs === 0) return `${bowler} bowls a dot ball. Good delivery.`;
  
  return `${batsman} takes ${ball.runs} ${ball.runs === 1 ? 'run' : 'runs'}.`;
}
