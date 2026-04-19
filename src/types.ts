/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlayerRole = 'Batsman' | 'Bowler' | 'All-rounder';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: number;
}

export interface CareerStats {
  totalRuns: number;
  totalBallsFaced: number;
  totalWickets: number;
  totalOversBowled: number;
  totalRunsConceded: number;
  highestScore: number;
  bestBowling: {
    wickets: number;
    runs: number;
  };
  matchesPlayed: number;
  fifties: number;
  centuries: number;
  fiveWickets: number;
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  imageUrl?: string;
  whatsapp?: string;
  careerStats: CareerStats;
  achievements: Achievement[];
}

export interface TeamStanding {
  teamName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  nrr: number;
  points: number;
}

export interface PlayerMatchStats {
  playerId: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  wickets: number;
  oversBowled: number;
  runsConceded: number;
  maidens: number;
}

export interface BallRecord {
  batsmanId: string;
  bowlerId: string;
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isWicket: boolean;
  wicketType?: 'bowled' | 'caught' | 'lbw' | 'runout' | 'stumped';
  timestamp: number;
}

export interface Innings {
  battingTeamId: string;
  bowlingTeamId: string;
  score: number;
  wickets: number;
  balls: number;
  maxOvers: number;
  ballsList: BallRecord[];
  extras: {
    wides: number;
    noBalls: number;
    legByes: number;
    byes: number;
  };
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
}

export interface Match {
  id: string;
  teamAName: string;
  teamBName: string;
  teamALogo?: string;
  teamBLogo?: string;
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  maxOvers: number;
  status: 'upcoming' | 'live' | 'completed';
  innings: Innings[];
  currentInningsIndex: number;
  manOfTheMatch?: string;
  winnerTeamId?: string;
  umpireName?: string;
  leagueName?: string;
  scheduledTime?: number;
  createdAt: number;
}

export interface GalleryMoment {
  id: string;
  matchId?: string;
  imageUrl: string; 
  type: 'image' | 'video';
  title: string;
  description: string;
  timestamp: number;
}

export interface Admin {
  name: string;
  whatsapp: string;
  imageUrl?: string;
  isLoggedIn: boolean;
}

export interface AppData {
  players: Player[];
  matches: Match[];
  gallery: GalleryMoment[];
  admin: Admin;
}
