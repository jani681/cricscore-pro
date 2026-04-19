export type PlayerRole = 'Batsman' | 'Bowler' | 'All-rounder';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  careerStats: any;
  achievements: any[];
}

export interface Match {
  id: string;
  teamAName: string;
  teamBName: string;
  status: 'upcoming' | 'live' | 'completed';
  innings: any[];
}

export interface AppData {
  players: Player[];
  matches: Match[];
  gallery: any[];
  admin: { name: string; whatsapp: string; isLoggedIn: boolean; };
}
