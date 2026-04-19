/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { 
  Users, 
  Trophy, 
  PlusCircle, 
  History, 
  ChevronLeft, 
  Share2, 
  UserPlus,
  Play,
  User,
  Trash2,
  CheckCircle2,
  Camera,
  Image as ImageIcon,
  Video,
  Video as VideoIcon,
  MessageCircle,
  Clock,
  Heart,
  ShieldCheck,
  Settings,
  Lock,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, Match, AppData, Innings, BallRecord, PlayerRole, GalleryMoment } from './types';
import { 
  calculateOvers, 
  generateMatchSummary, 
  generateWhatsAppReminder,
  getPlayerStats, 
  calculateStrikeRate, 
  calculateEconomy, 
  formatOvers, 
  calculateTeamStandings, 
  createEmptyCareerStats, 
  updatePlayerCareerStats, 
  speak, 
  getCommentary 
} from './utils';

const STORAGE_KEY = 'cric_score_pro_data';

export default function App() {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure existing players have new fields
      parsed.players = (parsed.players || []).map((p: any) => ({
        ...p,
        careerStats: p.careerStats || createEmptyCareerStats(),
        achievements: p.achievements || []
      }));
      parsed.gallery = parsed.gallery || [];
      parsed.admin = parsed.admin || { 
        name: 'Touqeer Iqbal Baghoor', 
        whatsapp: '03015800630', 
        isLoggedIn: false 
      };
      return parsed;
    }
    return { 
      players: [], 
      matches: [], 
      gallery: [],
      admin: { 
        name: 'Touqeer Iqbal Baghoor', 
        whatsapp: '03015800630', 
        isLoggedIn: false 
      }
    };
  });

  const [view, setView] = useState<'home' | 'players' | 'setup' | 'live' | 'records' | 'standings' | 'gallery' | 'admin'>('home');
  const [matchEvent, setMatchEvent] = useState<{ type: string; text: string } | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const activeMatch = useMemo(() => 
    data.matches.find(m => m.id === activeMatchId), 
    [data.matches, activeMatchId]
  );

  // --- Actions ---
  const addPlayer = (name: string, role: PlayerRole, imageUrl?: string, whatsapp?: string) => {
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name,
      role,
      imageUrl,
      whatsapp,
      careerStats: createEmptyCareerStats(),
      achievements: []
    };
    setData(prev => ({ ...prev, players: [...prev.players, newPlayer] }));
  };

  const deletePlayer = (id: string) => {
    setData(prev => ({
      ...prev,
      players: prev.players.filter(p => p.id !== id)
    }));
  };

  const startMatch = (setup: { 
    teamA: string[], 
    teamB: string[], 
    teamAName: string, 
    teamBName: string, 
    teamALogo?: string,
    teamBLogo?: string,
    overs: number,
    umpireName?: string,
    leagueName?: string,
    scheduledTime?: number
  }) => {
    const newMatch: Match = {
      id: crypto.randomUUID(),
      teamAName: setup.teamAName,
      teamBName: setup.teamBName,
      teamALogo: setup.teamALogo,
      teamBLogo: setup.teamBLogo,
      teamAPlayerIds: setup.teamA,
      teamBPlayerIds: setup.teamB,
      maxOvers: setup.overs,
      umpireName: setup.umpireName,
      leagueName: setup.leagueName,
      scheduledTime: setup.scheduledTime,
      status: 'live',
      innings: [{
        battingTeamId: 'teamA',
        bowlingTeamId: 'teamB',
        score: 0,
        wickets: 0,
        balls: 0,
        maxOvers: setup.overs,
        ballsList: [],
        extras: { wides: 0, noBalls: 0, legByes: 0, byes: 0 },
        strikerId: setup.teamA[0],
        nonStrikerId: setup.teamA[1],
        bowlerId: setup.teamB[setup.teamB.length - 1]
      }],
      currentInningsIndex: 0,
      createdAt: Date.now()
    };
    setData(prev => ({ ...prev, matches: [newMatch, ...prev.matches] }));
    setActiveMatchId(newMatch.id);
    setView('live');
  };

  const updateMatch = (matchId: string, updatedMatch: Partial<Match>) => {
    setData(prev => ({
      ...prev,
      matches: prev.matches.map(m => m.id === matchId ? { ...m, ...updatedMatch } : m)
    }));
  };

  const recordBall = (matchId: string, ball: BallRecord, nextBatsmanId?: string, nextBowlerId?: string) => {
    setData(prev => {
      const match = prev.matches.find(m => m.id === matchId);
      if (!match || match.status !== 'live') return prev;

      const currentInning = match.innings[match.currentInningsIndex];
      const newBallsList = [...currentInning.ballsList, ball];
      
      let newScore = currentInning.score + ball.runs;
      let newWickets = currentInning.wickets + (ball.isWicket ? 1 : 0);
      let newBalls = currentInning.balls + (!ball.isWide && !ball.isNoBall ? 1 : 0);
      
      const newExtras = { ...currentInning.extras };
      if (ball.isWide) {
        newExtras.wides++;
        newScore += 1;
      }
      if (ball.isNoBall) {
        newExtras.noBalls++;
        newScore += 1;
      }

      let strikerId = currentInning.strikerId || ball.batsmanId;
      let nonStrikerId = currentInning.nonStrikerId;
      let bowlerId = currentInning.bowlerId || ball.bowlerId;

      if (!ball.isWicket && ball.runs % 2 !== 0 && nonStrikerId) {
        [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
      }

      if (newBalls > 0 && newBalls % 6 === 0 && !ball.isWide && !ball.isNoBall && nonStrikerId) {
        [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
        if (nextBowlerId) bowlerId = nextBowlerId;
      }

      if (ball.isWicket && nextBatsmanId) {
        strikerId = nextBatsmanId;
      }

      const updatedInning: Innings = {
        ...currentInning,
        score: newScore,
        wickets: newWickets,
        balls: newBalls,
        ballsList: newBallsList,
        extras: newExtras,
        strikerId,
        nonStrikerId,
        bowlerId
      };

      const updatedInnings = [...match.innings];
      updatedInnings[match.currentInningsIndex] = updatedInning;

      let newStatus = match.status;
      let newCurrentInningsIndex = match.currentInningsIndex;

      const currentBattingTeamIds = currentInning.battingTeamId === 'teamA' ? match.teamAPlayerIds : match.teamBPlayerIds;
      const maxWickets = Math.max(1, currentBattingTeamIds.length - 1);

      if (newWickets >= maxWickets || newBalls >= match.maxOvers * 6) {
        if (newCurrentInningsIndex === 0) {
          newCurrentInningsIndex = 1;
          const battingTeamIds = match.teamBPlayerIds;
          const bowlingTeamIds = match.teamAPlayerIds;
          updatedInnings.push({
            battingTeamId: 'teamB',
            bowlingTeamId: 'teamA',
            score: 0,
            wickets: 0,
            balls: 0,
            maxOvers: match.maxOvers,
            ballsList: [],
            extras: { wides: 0, noBalls: 0, legByes: 0, byes: 0 },
            strikerId: battingTeamIds[0],
            nonStrikerId: battingTeamIds[1],
            bowlerId: bowlingTeamIds[bowlingTeamIds.length - 1]
          });
        } else {
          newStatus = 'completed';
        }
      }

      const target = updatedInnings[0].score;
      if (newCurrentInningsIndex === 1 && newStatus === 'live' && newScore > target) {
        newStatus = 'completed';
      }

      let winnerTeamId = match.winnerTeamId;
      let playersToUpdate = prev.players;

      if (newStatus === 'completed' && match.status !== 'completed') {
        const inn0 = updatedInnings[0];
        const inn1 = updatedInnings[1];
        if (inn1) {
          if (inn1.score > inn0.score) winnerTeamId = 'teamB';
          else if (inn0.score > inn1.score) winnerTeamId = 'teamA';
          else winnerTeamId = undefined; // Tie
        } else {
          winnerTeamId = 'teamA'; // Edge case
        }

        // Update Career Stats
        const finalMatch: Match = { ...match, status: newStatus, innings: updatedInnings, winnerTeamId };
        const involvedPlayerIds = [...match.teamAPlayerIds, ...match.teamBPlayerIds];
        playersToUpdate = prev.players.map(p => {
          if (involvedPlayerIds.includes(p.id)) {
            return updatePlayerCareerStats(p, finalMatch);
          }
          return p;
        });

        const winnerLabel = winnerTeamId ? (winnerTeamId === 'teamA' ? match.teamAName : match.teamBName) : 'It\'s a Tie';
        speak(`Match finished. ${winnerLabel} wins!`);
      } else {
        // Voice commentary for normal ball
        const comm = getCommentary(ball, prev.players);
        speak(comm);
      }

      // Handle Event Overlays
      if (ball.runs === 6) setMatchEvent({ type: 'SIX', text: 'MAXIMUM!' });
      else if (ball.runs === 4) setMatchEvent({ type: 'FOUR', text: 'BOUNDARY!' });
      else if (ball.isWicket) setMatchEvent({ type: 'WICKET', text: 'OUT!' });

      setTimeout(() => setMatchEvent(null), 2500);

      const updatedMatch: Match = {
        ...match,
        status: newStatus,
        innings: updatedInnings,
        currentInningsIndex: newCurrentInningsIndex,
        winnerTeamId
      };

      return {
        ...prev,
        players: playersToUpdate,
        matches: prev.matches.map(m => m.id === matchId ? updatedMatch : m)
      };
    });
  };

  // --- UI Components ---

  const Header = () => (
    <header className="px-6 py-4 flex items-center justify-between border-b border-white/5">
      <div className="flex flex-col">
        <div className="text-[10px] uppercase tracking-[2px] text-text-secondary">Cricket Live Pro</div>
        <h1 className="text-sm font-bold tracking-[2px] text-gold uppercase">
          {view === 'live' && activeMatch ? `${activeMatch.teamAName} vs ${activeMatch.teamBName}` : 'Main Dashboard'}
        </h1>
      </div>
      {view !== 'home' && (
        <button onClick={() => setView('home')} className="p-2 bg-white/5 rounded-full text-gold cursor-pointer">
          <ChevronLeft size={20} />
        </button>
      )}
    </header>
  );

  const Home = () => (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto pb-24">
      <div className="text-center py-8">
        <h2 className="text-4xl font-extrabold tracking-tighter text-white">
          ARENA<span className="text-gold">.</span>
        </h2>
        <p className="text-xs text-text-secondary uppercase tracking-widest mt-1">Local Match Management</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setView('setup')}
          className="col-span-2 h-40 bg-surface border border-gold/20 rounded-3xl flex flex-col items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-black/20 cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-accent-green flex items-center justify-center text-white shadow-lg shadow-accent-green/20">
            <Play size={32} fill="currentColor" />
          </div>
          <span className="font-bold text-sm text-gold uppercase tracking-widest">Start New Match</span>
        </button>

        <button 
          onClick={() => setView('players')}
          className="h-32 bg-white/3 border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <Users className="text-gold" size={24} />
          <span className="font-bold text-xs text-white uppercase tracking-wider">Players</span>
        </button>

        <button 
          onClick={() => setView('standings')}
          className="h-32 bg-white/3 border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <Trophy className="text-gold" size={24} />
          <span className="font-bold text-xs text-white uppercase tracking-wider">Standings</span>
        </button>

        <button 
          onClick={() => setView('records')}
          className="h-32 bg-white/3 border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <History className="text-gold" size={24} />
          <span className="font-bold text-xs text-white uppercase tracking-wider">Records</span>
        </button>

        <button 
          onClick={() => setView('gallery')}
          className="h-32 bg-white/3 border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <Camera className="text-gold" size={24} />
          <span className="font-bold text-xs text-white uppercase tracking-wider">Gallery</span>
        </button>
      </div>

      {data.matches.filter(m => m.status === 'live').length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[2px] text-gold/60 border-b border-white/5 pb-2">Ongoing Battles</h3>
          {data.matches.filter(m => m.status === 'live').map(m => (
            <div key={m.id} onClick={() => { setActiveMatchId(m.id); setView('live'); }} className="bg-white/3 border border-white/5 rounded-2xl p-4 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-all active:scale-98">
              <div>
                <p className="font-bold text-sm text-white">{m.teamAName} <span className="text-text-secondary text-[10px]">vs</span> {m.teamBName}</p>
                <p className="text-[10px] text-text-secondary uppercase mt-1">{formatOvers(m.innings[m.currentInningsIndex].balls)} Overs bowled</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xl font-bold text-accent-green">{m.innings[m.currentInningsIndex].score}/{m.innings[m.currentInningsIndex].wickets}</p>
                <div className="flex items-center gap-1 justify-end mt-1">
                   <span className="w-1.5 h-1.5 rounded-full bg-red animate-pulse"></span>
                   <span className="text-[9px] uppercase font-bold text-red tracking-widest">Live</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const PlayerManagement = () => {
    const [name, setName] = useState('');
    const [role, setRole] = useState<PlayerRole>('Batsman');
    const [imageUrl, setImageUrl] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };

    const CareerModal = () => {
      if (!selectedPlayer) return null;
      const stats = selectedPlayer.careerStats;
      const achievements = selectedPlayer.achievements;

      return (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-bg-deep/98 flex flex-col p-6 overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gold shadow-lg">
                {selectedPlayer.imageUrl ? (
                  <img src={selectedPlayer.imageUrl} alt={selectedPlayer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-gold/10 flex items-center justify-center text-gold">
                    <User size={32} />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-text-secondary tracking-widest">Player Profile</span>
                <h2 className="text-xl font-extrabold text-gold uppercase">{selectedPlayer.name}</h2>
                <span className="text-[9px] uppercase text-accent-green tracking-[2px]">{selectedPlayer.role}</span>
              </div>
            </div>
            <button onClick={() => setSelectedPlayer(null)} className="p-3 bg-white/5 rounded-full text-white cursor-pointer">
              <ChevronLeft className="rotate-180" size={24} />
            </button>
          </div>

          <div className="space-y-8">
            <section className="bg-white/3 border border-white/5 rounded-[32px] p-6 grid grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-[9px] text-text-secondary uppercase tracking-widest font-bold">Matches</p>
                <p className="text-2xl font-black text-white">{stats.matchesPlayed}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-text-secondary uppercase tracking-widest font-bold">Total Runs</p>
                <p className="text-2xl font-black text-white">{stats.totalRuns}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-text-secondary uppercase tracking-widest font-bold">Wickets</p>
                <p className="text-2xl font-black text-accent-green">{stats.totalWickets}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-text-secondary uppercase tracking-widest font-bold">High Score</p>
                <p className="text-2xl font-black text-gold">{stats.highestScore}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-text-secondary uppercase tracking-widest font-bold">Avg / SR</p>
                <p className="text-sm font-bold text-white">{(stats.totalRuns / Math.max(1, stats.matchesPlayed)).toFixed(1)} / {calculateStrikeRate(stats.totalRuns, stats.totalBallsFaced)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-text-secondary uppercase tracking-widest font-bold">Best Bowl</p>
                <p className="text-sm font-bold text-white">{stats.bestBowling.wickets}-{stats.bestBowling.runs}</p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-[2px] border-b border-white/10 pb-2">Milestones & Badges</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/3 p-3 rounded-2xl text-center border border-white/5">
                  <p className="text-[9px] text-text-secondary uppercase font-bold">100s</p>
                  <p className="text-lg font-black text-gold">{stats.centuries}</p>
                </div>
                <div className="bg-white/3 p-3 rounded-2xl text-center border border-white/5">
                  <p className="text-[9px] text-text-secondary uppercase font-bold">50s</p>
                  <p className="text-lg font-black text-white">{stats.fifties}</p>
                </div>
                <div className="bg-white/3 p-3 rounded-2xl text-center border border-white/5">
                  <p className="text-[9px] text-text-secondary uppercase font-bold">5W</p>
                  <p className="text-lg font-black text-accent-green">{stats.fiveWickets}</p>
                </div>
              </div>

              {achievements.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[8px] font-bold text-gold uppercase tracking-[2px]">Earned Badges</p>
                  <div className="space-y-2">
                    {achievements.slice(-5).map(a => (
                      <div key={a.id} className="bg-gradient-to-r from-gold/10 to-transparent p-3 rounded-xl border-l-2 border-gold flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-white">{a.title}</p>
                          <p className="text-[8px] text-text-secondary">{a.description}</p>
                        </div>
                        <span className="text-[10px] text-white/20 font-mono">{new Date(a.date).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-[2px] border-b border-white/10 pb-2">Achievements</h3>
              <div className="space-y-3">
                {achievements.length === 0 && <p className="text-center text-[10px] text-text-secondary py-4 uppercase">No achievements yet</p>}
                {achievements.slice().reverse().map(a => (
                  <div key={a.id} className="bg-gold/5 border border-gold/10 p-4 rounded-2xl flex items-start gap-3">
                    <Trophy className="text-gold flex-shrink-0" size={18} />
                    <div>
                      <p className="text-xs font-bold text-white">{a.title}</p>
                      <p className="text-[9px] text-text-secondary mt-1">{a.description}</p>
                      <p className="text-[8px] text-gold/50 mt-1 uppercase tracking-tighter">{new Date(a.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </motion.div>
      );
    };

    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-24 relative">
        <AnimatePresence>
          {selectedPlayer && <CareerModal />}
        </AnimatePresence>

        <div className="flex flex-col">
          <span className="text-[10px] uppercase text-text-secondary tracking-[2px] font-bold">Pool</span>
          <h2 className="text-xl font-extrabold text-white tracking-widest uppercase italic">Player <span className="text-gold">Roster</span></h2>
        </div>

        <div className="bg-white/3 border border-white/5 p-6 rounded-[32px] space-y-6">
          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase mb-2 block tracking-widest">Player Details</label>
            <div className="space-y-3">
              <input 
                id="player-name-input"
                value={name} onChange={e => setName(e.target.value)} 
                className="input-field w-full" 
                placeholder="Full Name (e.g. MS Dhoni)" 
              />
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center relative group">
                  {imageUrl ? (
                    <>
                      <img src={imageUrl} className="w-full h-full object-cover" alt="Preview" />
                      <button onClick={() => setImageUrl('')} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] uppercase font-bold">Remove</button>
                    </>
                  ) : (
                    <Camera className="text-white/20" size={24} />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="btn-secondary w-full py-2 flex items-center justify-center gap-2 cursor-pointer text-xs">
                    <PlusCircle size={14} />
                    {imageUrl ? 'Change Photo' : 'Upload Photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <p className="text-[8px] text-text-secondary uppercase tracking-widest text-center">PNG, JPG up to 1MB</p>
                </div>
              </div>
              <input 
                id="player-whatsapp-input"
                value={whatsapp} onChange={e => setWhatsapp(e.target.value)} 
                className="input-field w-full text-xs" 
                placeholder="WhatsApp Number (e.g. 919876543210)" 
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['Batsman', 'Bowler', 'All-rounder'] as const).map(r => (
              <button 
                key={r} 
                onClick={() => setRole(r)}
                className={`py-3 rounded-xl text-[9px] font-bold uppercase transition-all border cursor-pointer ${role === r ? 'bg-gold border-gold text-bg-deep' : 'bg-surface border-white/5 text-text-secondary'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <button 
            id="btn-add-player"
            disabled={!name}
            onClick={() => { addPlayer(name, role, imageUrl, whatsapp); setName(''); setImageUrl(''); setWhatsapp(''); }}
            className={`btn-primary w-full cursor-pointer ${!name ? 'opacity-30' : ''}`}
          >
            ADD PLAYER
          </button>
        </div>

        <div className="space-y-4">
          {data.players.length === 0 && <p className="text-center text-text-secondary py-10 uppercase text-[10px] tracking-widest font-bold">No players added yet.</p>}
          {data.players.map(p => (
            <div key={p.id} className="bg-white/3 border border-white/5 p-5 rounded-[28px] flex justify-between items-center group active:scale-98 transition-all hover:bg-white/5">
              <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setSelectedPlayer(p)}>
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gold/10 flex items-center justify-center text-gold border border-gold/10">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm text-white group-hover:text-gold transition-colors">{p.name}</p>
                  <p className="text-[9px] text-text-secondary uppercase tracking-[1px] flex items-center gap-2">
                    {p.role} 
                    {p.whatsapp && <span className="text-[8px] text-accent-green font-mono">📱 {p.whatsapp}</span>}
                  </p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[8px] text-accent-green font-bold uppercase tracking-tighter">{p.careerStats.totalRuns} Runs</span>
                    <span className="text-[8px] text-gold font-bold uppercase tracking-tighter">{p.careerStats.totalWickets} Wickets</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.whatsapp && (
                  <button 
                    onClick={() => {
                       const link = `https://wa.me/${p.whatsapp.replace(/\D/g, '')}?text=Hi ${p.name}, greeting from Cricket Pro! 🏏`;
                       window.open(link, '_blank');
                    }}
                    className="p-3 text-accent-green hover:text-white transition-colors cursor-pointer"
                  >
                    <MessageCircle size={20} />
                  </button>
                )}
                <button 
                  onClick={() => deletePlayer(p.id)}
                  className="p-3 text-white/10 hover:text-red transition-colors cursor-pointer"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const MatchSetup = () => {
    const [teamAName, setTeamAName] = useState('');
    const [teamBName, setTeamBName] = useState('');
    const [teamALogo, setTeamALogo] = useState('');
    const [teamBLogo, setTeamBLogo] = useState('');
    const [umpireName, setUmpireName] = useState('');
    const [leagueName, setLeagueName] = useState('');
    const [scheduledTime, setScheduledTime] = useState(new Date().toISOString().slice(0, 16));
    const [overs, setOvers] = useState(5);
    const [selectedA, setSelectedA] = useState<string[]>([]);
    const [selectedB, setSelectedB] = useState<string[]>([]);
    const [tab, setTab] = useState<'info' | 'teamA' | 'teamB'>('info');

    const handleToggle = (id: string, team: 'A' | 'B') => {
      if (team === 'A') {
        if (selectedA.includes(id)) setSelectedA(selectedA.filter(x => x !== id));
        else if (selectedA.length < 11 && !selectedB.includes(id)) setSelectedA([...selectedA, id]);
      } else {
        if (selectedB.includes(id)) setSelectedB(selectedB.filter(x => x !== id));
        else if (selectedB.length < 11 && !selectedA.includes(id)) setSelectedB([...selectedB, id]);
      }
    };

    const canStart = teamAName && teamBName && selectedA.length >= 1 && selectedB.length >= 1;

    const handleTeamLogoUpload = (e: ChangeEvent<HTMLInputElement>, side: 'A' | 'B') => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (side === 'A') setTeamALogo(reader.result as string);
          else setTeamBLogo(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
        <h2 className="text-xl font-bold uppercase tracking-wider text-white">Match <span className="text-gold">Setup</span></h2>

        <div className="flex gap-1 p-1 bg-white/5 rounded-2xl">
          {(['info', 'teamA', 'teamB'] as const).map(t => (
            <button 
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 rounded-xl text-[9px] font-bold transition-all cursor-pointer uppercase tracking-widest ${tab === t ? 'bg-gold text-bg-deep' : 'text-text-secondary hover:text-white'}`}
            >
              {t === 'info' ? 'Info' : t === 'teamA' ? 'Squad A' : 'Squad B'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'info' && (
            <motion.div 
              key="info" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-6"
            >
              <div className="bg-white/3 border border-white/5 rounded-[32px] p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="w-16 h-16 rounded-full bg-surface border border-white/10 overflow-hidden flex items-center justify-center relative group">
                        {teamALogo ? (
                           <>
                             <img src={teamALogo} className="w-full h-full object-cover" alt="Team A" />
                             <button onClick={() => setTeamALogo('')} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[8px] uppercase font-bold">Clear</button>
                           </>
                        ) : (
                          <Trophy className="text-white/10" size={24} />
                        )}
                        <input type="file" accept="image/*" className="hidden" id="teamA-logo" onChange={(e) => handleTeamLogoUpload(e, 'A')} />
                        {!teamALogo && <label htmlFor="teamA-logo" className="absolute inset-0 cursor-pointer" />}
                      </div>
                      <input 
                        value={teamAName} 
                        onChange={e => setTeamAName(e.target.value)} 
                        className="bg-transparent text-center border-b border-white/10 focus:border-gold outline-none w-full text-xs font-bold uppercase tracking-widest py-1" 
                        placeholder="TEAM A NAME" 
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="w-16 h-16 rounded-full bg-surface border border-white/10 overflow-hidden flex items-center justify-center relative group">
                        {teamBLogo ? (
                           <>
                             <img src={teamBLogo} className="w-full h-full object-cover" alt="Team B" />
                             <button onClick={() => setTeamBLogo('')} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[8px] uppercase font-bold">Clear</button>
                           </>
                        ) : (
                          <Trophy className="text-white/10" size={24} />
                        )}
                        <input type="file" accept="image/*" className="hidden" id="teamB-logo" onChange={(e) => handleTeamLogoUpload(e, 'B')} />
                        {!teamBLogo && <label htmlFor="teamB-logo" className="absolute inset-0 cursor-pointer" />}
                      </div>
                      <input 
                        value={teamBName} 
                        onChange={e => setTeamBName(e.target.value)} 
                        className="bg-transparent text-center border-b border-white/10 focus:border-gold outline-none w-full text-xs font-bold uppercase tracking-widest py-1" 
                        placeholder="TEAM B NAME" 
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase mb-2 block tracking-widest">League Name</label>
                    <input value={leagueName} onChange={e => setLeagueName(e.target.value)} className="input-field w-full text-xs" placeholder="e.g. Premier League" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase mb-2 block tracking-widest">Umpire</label>
                    <input value={umpireName} onChange={e => setUmpireName(e.target.value)} className="input-field w-full text-xs" placeholder="Name" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase mb-2 block tracking-widest">Date & Time</label>
                  <input 
                    type="datetime-local"
                    value={scheduledTime} 
                    onChange={e => setScheduledTime(e.target.value)} 
                    className="input-field w-full text-xs" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white uppercase mb-4 flex justify-between tracking-widest">
                    <span>Overs: <span className="text-gold">{overs}</span></span>
                    <span className="text-text-secondary">T20 Model</span>
                  </label>
                  <input type="range" min="1" max="50" value={overs} onChange={e => setOvers(parseInt(e.target.value))} className="w-full accent-accent-green h-1.5 bg-bg-deep rounded-full cursor-pointer appearance-none" />
                </div>
              </div>
              <button disabled={!teamAName || !teamBName} onClick={() => setTab('teamA')} className="btn-primary w-full border border-gold/30 !bg-transparent text-gold">NEXT: Select Squad A</button>
            </motion.div>
          )}

          {tab === 'teamA' || tab === 'teamB' ? (
            <motion.div key={tab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Available Players</p>
                <p className="text-[10px] font-bold text-gold uppercase tracking-widest">Selected: {tab === 'teamA' ? selectedA.length : selectedB.length}/11</p>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {data.players.map(p => {
                  const isSelected = tab === 'teamA' ? selectedA.includes(p.id) : selectedB.includes(p.id);
                  const isOtherTeam = tab === 'teamA' ? selectedB.includes(p.id) : selectedA.includes(p.id);
                  return (
                    <button 
                      key={p.id} onClick={() => handleToggle(p.id, tab === 'teamA' ? 'A' : 'B')}
                      disabled={isOtherTeam}
                      className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all cursor-pointer ${isSelected ? 'bg-gold/10 border-gold shadow-lg shadow-gold/5' : 'bg-white/3 border-white/5 opacity-80'} ${isOtherTeam ? 'opacity-20 cursor-not-allowed grayscale' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gold/10 flex items-center justify-center text-gold border border-gold/10">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User size={18} />
                        )}
                      </div>
                      <div className="text-left flex-1">
                        <p className={`font-bold text-sm ${isSelected ? 'text-gold' : 'text-white'}`}>{p.name}</p>
                        <p className="text-[9px] uppercase text-text-secondary tracking-widest">{p.role}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {isSelected && p.whatsapp && (
                          <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               const matchObj: any = { teamAName, teamBName, leagueName, umpireName, scheduledTime: new Date(scheduledTime).getTime() };
                               const link = `https://wa.me/${p.whatsapp.replace(/\D/g, '')}?text=${generateWhatsAppReminder(matchObj, data.players)}`;
                               window.open(link, '_blank');
                             }}
                             className="p-2 bg-accent-green/20 text-accent-green rounded-lg hover:bg-accent-green hover:text-white transition-all shadow-sm"
                          >
                            <MessageCircle size={14} />
                          </button>
                        )}
                        {isSelected && <CheckCircle2 className="text-gold" size={18} />}
                      </div>
                    </button>
                  );
                })}
              </div>
              {tab === 'teamA' ? (
                <button disabled={selectedA.length < 2} onClick={() => setTab('teamB')} className="btn-primary w-full">Squad B Selection</button>
              ) : (
                <button 
                  disabled={!canStart}
                  onClick={() => startMatch({ 
                    teamA: selectedA, 
                    teamB: selectedB, 
                    teamAName, 
                    teamBName, 
                    teamALogo,
                    teamBLogo,
                    overs, 
                    umpireName, 
                    leagueName,
                    scheduledTime: new Date(scheduledTime).getTime()
                  })} 
                  className="btn-primary w-full !bg-gold !text-bg-deep shadow-xl shadow-gold/10"
                >
                  Confirm & Toss
                </button>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  };

  const LiveScoring = () => {
    if (!activeMatch) return null;
    const inning = activeMatch.innings[activeMatch.currentInningsIndex];
    const isCompleted = activeMatch.status === 'completed';

    const strikerId = inning.strikerId;
    const nonStrikerId = inning.nonStrikerId;
    const bowlerId = inning.bowlerId;

    const [showNextBatsmanSelector, setShowNextBatsmanSelector] = useState(false);
    const [showNextBowlerSelector, setShowNextBowlerSelector] = useState(false);
    const [showFullScorecard, setShowFullScorecard] = useState(false);
    const [editingMatch, setEditingMatch] = useState<Match | null>(null);
    const [pendingBall, setPendingBall] = useState<BallRecord | null>(null);
    const [selectedMotm, setSelectedMotm] = useState<string | null>(null);

    const MatchEditModal = ({ match, onSave, onClose }: { match: Match, onSave: (updated: Partial<Match>) => void, onClose: () => void }) => {
      const [editData, setEditData] = useState({
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        umpireName: match.umpireName || '',
        leagueName: match.leagueName || '',
        scheduledTime: match.scheduledTime ? new Date(match.scheduledTime).toISOString().slice(0, 16) : ''
      });

      const handleSave = () => {
        onSave({
          ...editData,
          scheduledTime: editData.scheduledTime ? new Date(editData.scheduledTime).getTime() : undefined
        });
        onClose();
      };

      return (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] bg-bg-deep/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-white uppercase tracking-widest italic">Edit <span className="text-gold">Match</span></h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white">
              <ChevronLeft className="rotate-180" size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-white/3 border border-white/5 p-6 rounded-[32px] space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase mb-2 block tracking-widest">Teams</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      value={editData.teamAName} 
                      onChange={e => setEditData({ ...editData, teamAName: e.target.value })}
                      className="input-field w-full text-xs font-bold uppercase" 
                      placeholder="Team A" 
                    />
                    <input 
                      value={editData.teamBName} 
                      onChange={e => setEditData({ ...editData, teamBName: e.target.value })}
                      className="input-field w-full text-xs font-bold uppercase" 
                      placeholder="Team B" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase mb-2 block tracking-widest">League</label>
                    <input 
                      value={editData.leagueName} 
                      onChange={e => setEditData({ ...editData, leagueName: e.target.value })}
                      className="input-field w-full text-xs" 
                      placeholder="Tournament" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase mb-2 block tracking-widest">Umpire</label>
                    <input 
                      value={editData.umpireName} 
                      onChange={e => setEditData({ ...editData, umpireName: e.target.value })}
                      className="input-field w-full text-xs" 
                      placeholder="Name" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase mb-2 block tracking-widest">Match Date</label>
                  <input 
                    type="datetime-local"
                    value={editData.scheduledTime} 
                    onChange={e => setEditData({ ...editData, scheduledTime: e.target.value })} 
                    className="input-field w-full text-xs" 
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleSave}
              className="btn-primary w-full shadow-lg shadow-gold/20"
            >
              SAVE CHANGES
            </button>
          </div>
        </motion.div>
      );
    };

    const handleAction = (runs: number, extra: 'wide' | 'nb' | 'wk' | 'none') => {
      const ball: BallRecord = {
        batsmanId: strikerId!,
        bowlerId: bowlerId!,
        runs: extra === 'none' ? runs : 0,
        isWide: extra === 'wide',
        isNoBall: extra === 'nb',
        isWicket: extra === 'wk',
        timestamp: Date.now()
      };

      if (extra === 'wk') {
        const battingTeamIds = inning.battingTeamId === 'teamA' ? activeMatch.teamAPlayerIds : activeMatch.teamBPlayerIds;
        const maxWickets = Math.max(1, battingTeamIds.length - 1);

        if (inning.wickets >= maxWickets - 1) {
          recordBall(activeMatch.id, ball);
        } else {
          setPendingBall(ball);
          setShowNextBatsmanSelector(true);
        }
        return;
      }

      const currentBalls = (inning.balls || 0) + (!ball.isWide && !ball.isNoBall ? 1 : 0);
      if (currentBalls > 0 && currentBalls % 6 === 0 && !ball.isWide && !ball.isNoBall) {
        if (currentBalls >= activeMatch.maxOvers * 6) {
           recordBall(activeMatch.id, ball);
        } else {
           setPendingBall(ball);
           setShowNextBowlerSelector(true);
        }
        return;
      }

      recordBall(activeMatch.id, ball);
    };

    const handleBatsmanSelect = (id: string) => {
      if (pendingBall) {
        recordBall(activeMatch.id, pendingBall, id);
        setPendingBall(null);
        setShowNextBatsmanSelector(false);
      }
    };

    const handleBowlerSelect = (id: string) => {
       if (pendingBall) {
         recordBall(activeMatch.id, pendingBall, undefined, id);
         setPendingBall(null);
         setShowNextBowlerSelector(false);
       }
    };

    const getPlayerName = (id: string | undefined) => data.players.find(p => p.id === id)?.name || 'Guest';

    const share = () => {
      const summary = generateMatchSummary(activeMatch, data.players);
      navigator.clipboard.writeText(summary);
      alert('Scorecard summary copied to clipboard!');
    };

    const Selector = ({ title, options, onSelect }: { title: string, options: string[], onSelect: (id: string) => void }) => (
      <div className="fixed inset-0 z-[110] bg-bg-deep/95 flex flex-col p-6 overflow-y-auto">
        <h2 className="text-xl font-bold mb-6 text-gold uppercase tracking-widest">{title}</h2>
        <div className="grid gap-3">
          {options.map(id => {
            const p = data.players.find(x => x.id === id);
            return (
              <button 
                key={id} onClick={() => onSelect(id)}
                className="p-4 bg-surface border border-white/5 rounded-[24px] font-bold text-left hover:border-gold transition-all cursor-pointer text-white flex justify-between items-center"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gold/10 flex items-center justify-center text-gold border border-gold/10">
                    {p?.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={20} />
                    )}
                  </div>
                  <div>
                    <span className="block">{getPlayerName(id)}</span>
                    <span className="text-[9px] text-text-secondary uppercase tracking-[1px]">{p?.role}</span>
                  </div>
                </div>
                <ChevronLeft className="rotate-180 text-gold/30" size={16} />
              </button>
            );
          })}
        </div>
      </div>
    );

    const FullScorecard = () => {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
          className="fixed inset-0 z-[100] bg-bg-deep p-6 overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-8">
             <div className="flex flex-col">
               <span className="text-[10px] uppercase text-text-secondary tracking-widest">Match Record</span>
               <h2 className="text-xl font-extrabold text-gold tracking-tight uppercase">SCORECARD</h2>
             </div>
            <button onClick={() => setShowFullScorecard(false)} className="p-3 bg-white/5 rounded-full cursor-pointer text-white">
               <ChevronLeft className="rotate-180" size={24} />
            </button>
          </div>

          <div className="space-y-10">
            {activeMatch.innings.map((inn, idx) => (
              <section key={idx} className="space-y-4">
                <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-[2px] border-b border-white/10 pb-2">
                  {idx === 0 ? activeMatch.teamAName : activeMatch.teamBName} <span className="text-gold">INN.</span>
                </h3>
                
                <div className="space-y-4">
                   <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-3 text-[9px] uppercase font-bold text-text-secondary tracking-widest">
                     <div>Batsman</div>
                     <div className="text-center">R</div>
                     <div className="text-center">B</div>
                     <div className="text-center">SR</div>
                   </div>

                  {(idx === 0 ? activeMatch.teamAPlayerIds : activeMatch.teamBPlayerIds).map(pid => {
                    const p = data.players.find(x => x.id === pid)!;
                    const stats = getPlayerStats(p, [inn]);
                    if (stats.ballsFaced === 0 && pid !== inning.strikerId && pid !== inning.nonStrikerId) return null;
                    const isActive = (inn === inning) && (pid === strikerId || pid === nonStrikerId);
                    return (
                      <div key={pid} className={`stat-row bg-white/3 ${isActive ? 'stat-row-active' : ''}`}>
                         <div className="font-bold flex items-center gap-3">
                           <div className="w-6 h-6 rounded-full overflow-hidden bg-gold/10 flex items-center justify-center text-gold border border-gold/10 scale-90">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <User size={12} />
                              )}
                           </div>
                           <div className="flex items-center gap-1">
                             {isActive && <span className="text-accent-green">🏏</span>}
                             {p.name}
                           </div>
                         </div>
                         <div className="text-center font-mono font-bold text-white">{stats.runs}</div>
                         <div className="text-center font-mono text-text-secondary">{stats.ballsFaced}</div>
                         <div className="text-center font-mono text-text-secondary">{calculateStrikeRate(stats.runs, stats.ballsFaced)}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-4 pt-4">
                   <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-3 text-[9px] uppercase font-bold text-text-secondary tracking-widest">
                     <div>Bowler</div>
                     <div className="text-center">O</div>
                     <div className="text-center">W</div>
                     <div className="text-center">EC</div>
                   </div>
                   {(idx === 0 ? activeMatch.teamBPlayerIds : activeMatch.teamAPlayerIds).map(pid => {
                    const p = data.players.find(x => x.id === pid)!;
                    const stats = getPlayerStats(p, [inn]);
                    if (stats.oversBowled === 0 && pid !== inning.bowlerId) return null;
                    const isActive = (inn === inning) && (pid === bowlerId);
                    return (
                      <div key={pid} className={`stat-row bg-white/3 ${isActive ? 'stat-row-active' : ''}`}>
                         <div className="font-bold flex items-center gap-3">
                           <div className="w-6 h-6 rounded-full overflow-hidden bg-gold/10 flex items-center justify-center text-gold border border-gold/10 scale-90">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <User size={12} />
                              )}
                           </div>
                           {p.name}
                         </div>
                         <div className="text-center font-mono text-white">{stats.oversBowled.toFixed(1)}</div>
                         <div className="text-center font-mono font-bold text-accent-green">{stats.wickets}</div>
                         <div className="text-center font-mono text-text-secondary">{calculateEconomy(stats.runsConceded, Math.round(stats.oversBowled * 6))}</div>
                      </div>
                    );
                   })}
                </div>
              </section>
            ))}
          </div>
        </motion.div>
      );
    };

    return (
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {showNextBatsmanSelector && (
          <Selector 
            title="Next Batsman" 
            options={(inning.battingTeamId === 'teamA' ? activeMatch.teamAPlayerIds : activeMatch.teamBPlayerIds).filter(id => id !== strikerId && id !== nonStrikerId && !inning.ballsList.some(b => b.isWicket && b.batsmanId === id))} 
            onSelect={handleBatsmanSelect} 
          />
        )}
        {showNextBowlerSelector && (
          <Selector 
            title="Next Bowler" 
            options={(inning.bowlingTeamId === 'teamA' ? activeMatch.teamAPlayerIds : activeMatch.teamBPlayerIds).filter(id => id !== bowlerId)} 
            onSelect={handleBowlerSelect} 
          />
        )}
        <AnimatePresence>
          {showFullScorecard && <FullScorecard />}
          {editingMatch && (
            <MatchEditModal 
              match={editingMatch} 
              onSave={(updated) => setData(prev => ({
                ...prev,
                matches: prev.matches.map(mm => mm.id === editingMatch.id ? { ...mm, ...updated } : mm)
              }))}
              onClose={() => setEditingMatch(null)}
            />
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
          {/* Main Scoreboard */}
          <div className="scoreboard-radial space-y-4 relative">
               <div className="absolute top-4 right-4 flex gap-4">
                  <button onClick={() => setEditingMatch(activeMatch)} className="p-2 bg-white/5 rounded-full text-gold hover:bg-white/10 transition-all"><Edit3 size={18} /></button>
                  <button 
                    onClick={() => {
                      if (window.confirm('Delete this match?')) {
                        setData(prev => ({ ...prev, matches: prev.matches.filter(m => m.id !== activeMatch.id) }));
                        setView('home');
                      }
                    }} 
                    className="p-2 bg-white/5 rounded-full text-red-500 hover:bg-white/10 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button onClick={() => setShowFullScorecard(true)} className="p-2 bg-white/5 rounded-full text-gold hover:bg-white/10 transition-all"><History size={18} /></button>
                  <button onClick={share} className="p-2 bg-white/10 rounded-full text-gold hover:bg-white/20 transition-all"><Share2 size={18} /></button>
               </div>

          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                  {(inning.battingTeamId === 'teamA' ? activeMatch.teamALogo : activeMatch.teamBLogo) ? (
                    <img src={inning.battingTeamId === 'teamA' ? activeMatch.teamALogo : activeMatch.teamBLogo} className="w-full h-full object-cover" alt="Batting Team" />
                  ) : (
                    <Trophy size={16} className="text-gold/30" />
                  )}
                </div>
                <div>
                  <div className="main-score text-white tracking-tighter">
                    {inning.score}<span className="text-gold text-4xl">/{inning.wickets}</span>
                  </div>
                </div>
              </div>
              <div className="text-xl font-bold text-text-secondary uppercase tracking-widest mt-2">
                {formatOvers(inning.balls)} <span className="text-[10px] opacity-60">Overs</span>
              </div>
              <div className="run-rate bg-white/5 text-[9px] font-bold uppercase tracking-widest text-text-secondary px-3 py-1 rounded-full inline-block mt-3 border border-white/5">
                CRR: {(inning.score / (Math.max(1, inning.balls)/6)).toFixed(2)}
                {activeMatch.currentInningsIndex === 1 && (
                  <span className="ml-3 border-l border-white/10 pl-3">Target: {activeMatch.innings[0].score + 1}</span>
                )}
              </div>
            </div>
            <div className="text-right flex flex-col justify-end space-y-1 pb-1">
              {activeMatch.leagueName && (
                <div className="flex items-center justify-end gap-1.5 text-gold/80 uppercase text-[9px] font-bold tracking-widest">
                  <Trophy size={10} /> {activeMatch.leagueName}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 mb-1">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">vs</span>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                  {(inning.bowlingTeamId === 'teamA' ? activeMatch.teamALogo : activeMatch.teamBLogo) ? (
                    <img src={inning.bowlingTeamId === 'teamA' ? activeMatch.teamALogo : activeMatch.teamBLogo} className="w-full h-full object-cover" alt="Bowling Team" />
                  ) : (
                    <Trophy size={12} className="text-white/20" />
                  )}
                </div>
              </div>
              {activeMatch.umpireName && (
                <div className="flex items-center justify-end gap-1.5 text-text-secondary uppercase text-[8px] font-bold tracking-widest">
                  <User size={10} /> Umpire: {activeMatch.umpireName}
                </div>
              )}
               <div className="text-text-secondary/50 uppercase text-[7px] font-bold tracking-widest flex items-center justify-end gap-1">
                <Clock size={8} /> {new Date(activeMatch.createdAt).toLocaleDateString()}
              </div>
              <button 
                onClick={() => {
                  const link = `https://wa.me/?text=${generateWhatsAppReminder(activeMatch, data.players)}`;
                  window.open(link, '_blank');
                }}
                className="flex items-center justify-end gap-1.5 text-accent-green uppercase text-[8px] font-bold tracking-widest hover:text-white transition-colors cursor-pointer mt-1"
              >
                <MessageCircle size={10} /> Send Reminder
              </button>
            </div>
          </div>
          </div>

          <div className="px-6 space-y-6">
            <div className="space-y-2">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-3 text-[9px] uppercase font-bold text-text-secondary tracking-widest">
                <div>Batsman</div>
                <div className="text-center">R</div>
                <div className="text-center">B</div>
                <div className="text-center">SR</div>
              </div>
              
              <div className="stat-row stat-row-active">
                <div className="font-bold flex items-center gap-3 text-white">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gold/10 flex items-center justify-center text-gold border border-gold/10">
                    {data.players.find(p => p.id === strikerId)?.imageUrl ? (
                      <img src={data.players.find(p => p.id === strikerId)?.imageUrl} alt="striker" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <div className="flex items-center gap-1"><span className="text-accent-green">🏏</span>{getPlayerName(strikerId)}</div>
                </div>
                <div className="text-center font-mono font-bold text-white">{getPlayerStats(data.players.find(p => p.id === strikerId)!, [inning]).runs}</div>
                <div className="text-center font-mono text-text-secondary">{getPlayerStats(data.players.find(p => p.id === strikerId)!, [inning]).ballsFaced}</div>
                <div className="text-center font-mono text-[10px] text-text-secondary">{calculateStrikeRate(getPlayerStats(data.players.find(p => p.id === strikerId)!, [inning]).runs, getPlayerStats(data.players.find(p => p.id === strikerId)!, [inning]).ballsFaced)}</div>
              </div>

              <div className="stat-row">
                <div className="font-bold flex items-center gap-3 text-white">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gold/10 flex items-center justify-center text-gold border border-gold/10 opacity-70">
                    {data.players.find(p => p.id === nonStrikerId)?.imageUrl ? (
                      <img src={data.players.find(p => p.id === nonStrikerId)?.imageUrl} alt="non-striker" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <div className="pl-0">{getPlayerName(nonStrikerId)}</div>
                </div>
                <div className="text-center font-mono font-bold text-white">{getPlayerStats(data.players.find(p => p.id === nonStrikerId)!, [inning]).runs}</div>
                <div className="text-center font-mono text-text-secondary">{getPlayerStats(data.players.find(p => p.id === nonStrikerId)!, [inning]).ballsFaced}</div>
                <div className="text-center font-mono text-[10px] text-text-secondary">{calculateStrikeRate(getPlayerStats(data.players.find(p => p.id === nonStrikerId)!, [inning]).runs, getPlayerStats(data.players.find(p => p.id === nonStrikerId)!, [inning]).ballsFaced)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-3 text-[9px] uppercase font-bold text-text-secondary tracking-widest">
                <div>Current Bowler</div>
                <div className="text-center">O</div>
                <div className="text-center">W</div>
                <div className="text-center">EC</div>
              </div>
              <div className="stat-row stat-row-active">
                <div className="font-bold text-white">{getPlayerName(bowlerId)}</div>
                <div className="text-center font-mono text-white">{getPlayerStats(data.players.find(p => p.id === bowlerId)!, [inning]).oversBowled.toFixed(1)}</div>
                <div className="text-center font-mono font-bold text-accent-green text-lg">{getPlayerStats(data.players.find(p => p.id === bowlerId)!, [inning]).wickets}</div>
                <div className="text-center font-mono text-text-secondary">{calculateEconomy(getPlayerStats(data.players.find(p => p.id === bowlerId)!, [inning]).runsConceded, Math.round(getPlayerStats(data.players.find(p => p.id === bowlerId)!, [inning]).oversBowled * 6))}</div>
              </div>
            </div>

            {/* Recent Balls */}
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
              {inning.ballsList.slice(-12).map((b, i) => (
                <div key={i} className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold border ${b.isWicket ? 'bg-red text-white border-red shadow-lg shadow-red/20' : b.runs === 4 || b.runs === 6 ? 'bg-accent-green text-white border-accent-green shadow-lg shadow-accent-green/20' : 'border-white/10 text-text-secondary bg-white/3'}`}>
                  {b.isWicket ? 'W' : b.isWide ? 'Wd' : b.isNoBall ? 'Nb' : b.runs}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white/5 rounded-t-[32px] p-5 shadow-inner">
           {isCompleted ? (
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-2">
                <Trophy className="mx-auto text-gold" size={40} />
                <h2 className="text-xl font-extrabold text-white tracking-widest uppercase">MATCH COMPLETE</h2>
                
                <div className="space-y-4">
                  <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Award Man of the Match</p>
                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                    {[...activeMatch.teamAPlayerIds, ...activeMatch.teamBPlayerIds].map(pid => {
                      const p = data.players.find(x => x.id === pid);
                      return (
                        <button 
                          key={pid} onClick={() => setSelectedMotm(pid)}
                          className={`p-2 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${selectedMotm === pid ? 'bg-gold border-gold' : 'bg-surface border-white/5 hover:border-gold/30'}`}
                        >
                          <div className={`w-10 h-10 rounded-full overflow-hidden border ${selectedMotm === pid ? 'border-bg-deep/20' : 'border-white/10'}`}>
                            {p?.imageUrl ? (
                              <img src={p.imageUrl} alt={p?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${selectedMotm === pid ? 'text-bg-deep' : 'text-gold'}`}>
                                <User size={20} />
                              </div>
                            )}
                          </div>
                          <div className="text-left overflow-hidden">
                            <p className={`text-[10px] font-bold truncate ${selectedMotm === pid ? 'text-bg-deep' : 'text-white'}`}>{p?.name}</p>
                            <p className={`text-[8px] uppercase tracking-tighter ${selectedMotm === pid ? 'text-bg-deep/60' : 'text-text-secondary'}`}>{p?.role}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    updateMatch(activeMatch.id, { manOfTheMatch: selectedMotm || undefined });
                    setView('records');
                  }}
                  className="btn-primary w-full shadow-gold/20"
                >
                  Save Results
                </button>
             </motion.div>
           ) : (
             <div className="grid grid-cols-4 gap-2.5">
                {[0, 1, 2, 3].map(r => (
                  <button key={r} onClick={() => handleAction(r, 'none')} className="btn-base btn-run text-xl">{r}</button>
                ))}
                <button onClick={() => handleAction(4, 'none')} className="btn-base btn-run !border-accent-green/50 text-accent-green text-2xl">4</button>
                <button onClick={() => handleAction(6, 'none')} className="btn-base !bg-accent-green !text-white text-2xl shadow-lg shadow-accent-green/20">6</button>
                <button onClick={() => handleAction(0, 'wide')} className="btn-base btn-extra text-[10px]">WIDE</button>
                <button onClick={() => handleAction(0, 'nb')} className="btn-base btn-extra text-[10px]">NB</button>
                <button onClick={() => handleAction(0, 'wk')} className="col-span-2 btn-base btn-wicket text-sm tracking-[2px] h-auto aspect-auto py-4">WICKET</button>
                <button onClick={share} className="col-span-2 btn-primary h-auto aspect-auto !py-4">Share Score</button>
             </div>
           )}
        </div>
      </div>
    );
  };

  const MatchEventOverlay = () => {
    if (!matchEvent) return null;
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
        animate={{ opacity: 1, scale: 1.2, rotate: 0 }}
        exit={{ opacity: 0, scale: 2 }}
        className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
      >
        <div className="text-center">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }} 
            transition={{ repeat: Infinity, duration: 0.5 }}
            className={`text-6xl md:text-9xl font-black italic tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${matchEvent.type === 'WICKET' ? 'text-red' : 'text-gold'}`}
          >
            {matchEvent.type}
          </motion.div>
          <div className="text-white font-bold uppercase tracking-[10px] mt-4 opacity-80">{matchEvent.text}</div>
        </div>
      </motion.div>
    );
  };

   const Gallery = () => {
    const [title, setTitle] = useState('');
    const [image, setImage] = useState('');
    const [type, setType] = useState<'image' | 'video'>('image');

    const handleGalleryUpload = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };

    const addMoment = () => {
      if (!image) return;
      const newMoment: GalleryMoment = {
        id: crypto.randomUUID(),
        imageUrl: image,
        type,
        title: title || 'Match Day',
        description: 'A moment captured at the stadium',
        timestamp: Date.now()
      };
      setData(prev => ({ ...prev, gallery: [newMoment, ...prev.gallery] }));
      setTitle('');
      setImage('');
    };

    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-24">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase text-text-secondary tracking-[2px] font-bold">Archives</span>
          <h2 className="text-xl font-extrabold text-white tracking-widest uppercase italic">Match <span className="text-gold">Highlights</span></h2>
        </div>

        <div className="bg-white/3 border border-white/5 p-6 rounded-[32px] space-y-4">
          <div className="flex gap-2 p-1 bg-surface rounded-xl">
             {(['image', 'video'] as const).map(t => (
               <button 
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${type === t ? 'bg-gold text-bg-deep' : 'text-text-secondary'}`}
               >
                 {t}
               </button>
             ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-surface border border-white/10 overflow-hidden flex items-center justify-center relative group flex-shrink-0">
               {image ? (
                 <>
                   {type === 'video' ? (
                     <video src={image} className="w-full h-full object-cover" autoPlay loop playsInline />
                   ) : (
                     <img src={image} className="w-full h-full object-cover" alt="Preview" />
                   )}
                   <button onClick={() => setImage('')} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] uppercase font-bold">Remove</button>
                 </>
               ) : (
                 <ImageIcon className="text-white/20" size={24} />
               )}
            </div>
            <div className="flex-1 space-y-2">
               <label className="btn-secondary w-full py-3 flex items-center justify-center gap-2 cursor-pointer text-xs">
                 <Camera size={14} />
                 {image ? (type === 'video' ? 'Change Video' : 'Change Photo') : (type === 'video' ? 'Upload Video' : 'Upload Photo')}
                 <input 
                    type="file" 
                    accept={type === 'video' ? "video/mp4,video/x-m4v,video/*" : "image/*"} 
                    className="hidden" 
                    onChange={handleGalleryUpload} 
                 />
               </label>
               <p className="text-[8px] text-text-secondary uppercase tracking-widest text-center">Max 15s or 2MB recommended</p>
            </div>
          </div>
          <input 
            id="gallery-moment-title"
            value={title} onChange={e => setTitle(e.target.value)}
            className="input-field w-full text-xs" 
            placeholder="Highlight Title..." 
          />
          <button id="btn-save-moment" onClick={addMoment} className="btn-primary w-full shadow-lg shadow-accent-green/10">Save Highlight</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {data.gallery.length === 0 && (
             <div className="col-span-2 py-20 text-center opacity-20">
               <VideoIcon size={48} className="mx-auto mb-2" />
               <p className="text-[10px] font-bold uppercase tracking-widest">No highlights saved yet</p>
             </div>
          )}
          {data.gallery.map(m => (
            <motion.div 
               layout
               initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
               key={m.id} 
               className="aspect-[3/4] rounded-3xl overflow-hidden relative group border border-white/5"
            >
              <button 
                  onClick={() => {
                    setData(prev => ({ ...prev, gallery: prev.gallery.filter(item => item.id !== m.id) }));
                  }}
                  className="absolute top-2 left-2 z-10 p-2 bg-red/80 rounded-full text-white hover:bg-red transition-all cursor-pointer shadow-lg group-hover:opacity-100 opacity-0"
                >
                  <Trash2 size={12} />
              </button>
              {m.type === 'video' ? (
                <video 
                  src={m.imageUrl} 
                  autoPlay loop playsInline controls 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                />
              ) : (
                <img src={m.imageUrl} alt={m.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
              )}
              <div className="absolute top-2 right-2 z-10">
                {m.type === 'video' ? <Video size={12} className="text-white drop-shadow-md" /> : <ImageIcon size={12} className="text-white drop-shadow-md" />}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                <p className="text-xs font-bold text-white uppercase tracking-tight">{m.title}</p>
                <p className="text-[8px] text-text-secondary uppercase tracking-widest">{new Date(m.timestamp).toLocaleDateString()}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const AdminPanel = () => {
    const handleProfileUpload = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setData(prev => ({ 
            ...prev, 
            admin: { ...prev.admin, imageUrl: reader.result as string } 
          }));
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-24">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase text-text-secondary tracking-[2px] font-bold">Secure Access</span>
          <h2 className="text-xl font-extrabold text-white tracking-widest uppercase italic font-sans">Admin <span className="text-gold">Headquarters</span></h2>
        </div>

        <div className="bg-white/3 border border-white/5 p-8 rounded-[40px] flex flex-col items-center text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-2 border-gold/30 p-1">
              <div className="w-full h-full rounded-full overflow-hidden bg-surface flex items-center justify-center relative">
                {data.admin.imageUrl ? (
                  <img src={data.admin.imageUrl} className="w-full h-full object-cover" alt="Admin" />
                ) : (
                  <ShieldCheck className="text-gold/20" size={40} />
                )}
                {data.admin.isLoggedIn ? (
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[8px] uppercase font-bold cursor-pointer">
                    Change
                    <input type="file" accept="image/*" className="hidden" onChange={handleProfileUpload} />
                  </label>
                ) : (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Lock size={16} className="text-white/40" />
                  </div>
                )}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 bg-accent-green rounded-full border-2 border-bg-deep">
              <ShieldCheck size={12} className="text-bg-deep" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-white uppercase tracking-tight italic">{data.admin.name}</h3>
            <p className="text-[9px] text-text-secondary uppercase tracking-[3px] font-bold">System Administrator</p>
          </div>

          <div className="w-full grid grid-cols-2 gap-4">
             <div className="bg-white/5 p-4 rounded-2xl text-left border border-white/5">
                <p className="text-[8px] text-text-secondary uppercase font-black mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${data.admin.isLoggedIn ? 'bg-accent-green' : 'bg-red-500'} animate-pulse`}></div>
                  <span className="text-xs font-bold text-white uppercase tracking-widest leading-none">{data.admin.isLoggedIn ? 'Active' : 'Locked'}</span>
                </div>
             </div>
             <div className="bg-white/5 p-4 rounded-2xl text-left border border-white/5">
                <p className="text-[8px] text-text-secondary uppercase font-black mb-1">WhatsApp</p>
                <p className="text-xs font-bold text-white tracking-widest leading-none">{data.admin.whatsapp}</p>
             </div>
          </div>

          <button 
            onClick={() => setData(prev => ({ ...prev, admin: { ...prev.admin, isLoggedIn: !prev.admin.isLoggedIn } }))}
            className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-xs shadow-xl ${data.admin.isLoggedIn ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-gold text-bg-deep'}`}
          >
            {data.admin.isLoggedIn ? (
              <>
                <Lock size={16} />
                Lock Settings
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                Unlock Dashboard
              </>
            )}
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <Settings className="text-gold" size={16} />
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[2px]">System Permissions</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
             {[
               { icon: Users, label: 'Squad & Players', desc: 'Management unlocked for all users', status: 'public' },
               { icon: Play, label: 'Match Operations', desc: 'Match control unlocked for all users', status: 'public' },
               { icon: Settings, label: 'Dashboard Settings', desc: 'Admin profile and system configuration', status: 'protected' },
             ].map((item, idx) => (
               <div key={idx} className="bg-white/3 border border-white/5 p-5 rounded-[28px] flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-text-secondary group-hover:text-gold transition-colors">
                    <item.icon size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white uppercase tracking-tight">{item.label}</p>
                    <p className="text-[9px] text-text-secondary">{item.desc}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center ${item.status === 'public' ? 'text-accent-green bg-accent-green/10' : (data.admin.isLoggedIn ? 'text-accent-green bg-accent-green/10' : 'text-white/20')}`}>
                    {item.status === 'public' ? <CheckCircle2 size={16} /> : (data.admin.isLoggedIn ? <CheckCircle2 size={16} /> : <Lock size={14} />)}
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    );
  };

  const Standings = () => {
    const standings = useMemo(() => calculateTeamStandings(data.matches), [data.matches]);

    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase text-text-secondary tracking-[2px] font-bold">Tournament</span>
          <h2 className="text-xl font-extrabold text-white tracking-widest uppercase italic">Team <span className="text-gold">Standings</span></h2>
        </div>

        {standings.length === 0 && (
          <div className="text-center py-20 bg-white/3 border border-white/5 rounded-[32px]">
            <Trophy className="mx-auto text-white/10 mb-2" size={40} />
            <p className="text-text-secondary uppercase text-[10px] tracking-widest font-bold">No completed matches</p>
          </div>
        )}

        {standings.length > 0 && (
          <div className="bg-white/3 border border-white/5 rounded-[32px] p-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase text-text-secondary font-bold tracking-widest border-b border-white/5">
                  <th className="pb-4 pt-2 px-2">Team</th>
                  <th className="pb-4 pt-2 text-center">P</th>
                  <th className="pb-4 pt-2 text-center">W</th>
                  <th className="pb-4 pt-2 text-center text-gold">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {standings.map((s, i) => {
                  const teamLogo = data.matches.find(m => m.teamAName === s.teamName)?.teamALogo || 
                                   data.matches.find(m => m.teamBName === s.teamName)?.teamBLogo;
                  return (
                    <tr key={s.teamName} className="group">
                      <td className="py-4 px-2">
                         <div className="flex items-center gap-3">
                           <span className="text-[10px] font-mono text-text-secondary opacity-50">{i + 1}</span>
                           <div className="w-8 h-8 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                             {teamLogo ? (
                               <img src={teamLogo} className="w-full h-full object-cover" alt={s.teamName} />
                             ) : (
                               <Trophy size={14} className="text-white/10" />
                             )}
                           </div>
                           <span className="font-bold text-sm text-white group-hover:text-gold transition-colors">{s.teamName}</span>
                         </div>
                      </td>
                      <td className="py-4 text-center font-mono text-sm text-text-secondary">{s.played}</td>
                      <td className="py-4 text-center font-mono text-sm text-accent-green">{s.won}</td>
                      <td className="py-4 text-center font-mono font-bold text-white text-base">{s.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const Records = () => {
    const [editingMatch, setEditingMatch] = useState<Match | null>(null);

    const MatchEditModal = ({ match, onSave, onClose }: { match: Match, onSave: (updated: Partial<Match>) => void, onClose: () => void }) => {
      const [editData, setEditData] = useState({
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        umpireName: match.umpireName || '',
        leagueName: match.leagueName || '',
        scheduledTime: match.scheduledTime ? new Date(match.scheduledTime).toISOString().slice(0, 16) : ''
      });

      const handleSave = () => {
        onSave({
          ...editData,
          scheduledTime: editData.scheduledTime ? new Date(editData.scheduledTime).getTime() : undefined
        });
        onClose();
      };

      return (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] bg-bg-deep/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-white uppercase tracking-widest italic">Edit <span className="text-gold">Match</span></h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white">
              <ChevronLeft className="rotate-180" size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-white/3 border border-white/5 p-6 rounded-[32px] space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase mb-2 block tracking-widest">Teams</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      value={editData.teamAName} 
                      onChange={e => setEditData({ ...editData, teamAName: e.target.value })}
                      className="input-field w-full text-xs font-bold uppercase" 
                      placeholder="Team A" 
                    />
                    <input 
                      value={editData.teamBName} 
                      onChange={e => setEditData({ ...editData, teamBName: e.target.value })}
                      className="input-field w-full text-xs font-bold uppercase" 
                      placeholder="Team B" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase mb-2 block tracking-widest">League</label>
                    <input 
                      value={editData.leagueName} 
                      onChange={e => setEditData({ ...editData, leagueName: e.target.value })}
                      className="input-field w-full text-xs" 
                      placeholder="Tournament" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase mb-2 block tracking-widest">Umpire</label>
                    <input 
                      value={editData.umpireName} 
                      onChange={e => setEditData({ ...editData, umpireName: e.target.value })}
                      className="input-field w-full text-xs" 
                      placeholder="Name" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase mb-2 block tracking-widest">Match Date</label>
                  <input 
                    type="datetime-local"
                    value={editData.scheduledTime} 
                    onChange={e => setEditData({ ...editData, scheduledTime: e.target.value })} 
                    className="input-field w-full text-xs" 
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleSave}
              className="btn-primary w-full shadow-lg shadow-gold/20"
            >
              SAVE CHANGES
            </button>
          </div>
        </motion.div>
      );
    };

    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
        <AnimatePresence>
          {editingMatch && (
            <MatchEditModal 
              match={editingMatch} 
              onSave={(updated) => setData(prev => ({
                ...prev,
                matches: prev.matches.map(mm => mm.id === editingMatch.id ? { ...mm, ...updated } : mm)
              }))}
              onClose={() => setEditingMatch(null)}
            />
          )}
        </AnimatePresence>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase text-text-secondary tracking-[2px] font-bold">Archives</span>
          <h2 className="text-xl font-extrabold text-white tracking-widest uppercase italic">Match <span className="text-gold">History</span></h2>
        </div>
        
        {data.matches.length === 0 && (
          <div className="text-center py-20 bg-white/3 border border-white/5 rounded-[32px]">
            <History className="mx-auto text-white/10 mb-2" size={40} />
            <p className="text-text-secondary uppercase text-[10px] tracking-widest font-bold">No records found</p>
          </div>
        )}

        <div className="space-y-4">
          {data.matches.map(m => (
            <div key={m.id} className="bg-white/3 border border-white/5 rounded-[32px] p-6 space-y-6 relative overflow-hidden group">
              <div className="flex justify-between items-center text-[9px] text-text-secondary uppercase font-bold tracking-widest relative z-10">
                <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingMatch(m)} className="p-1 px-2 bg-white/5 rounded-md hover:text-gold transition-colors">EDIT</button>
                  <span className={`px-3 py-1 rounded-full border ${m.status === 'completed' ? 'bg-accent-green/10 text-accent-green border-accent-green/20' : 'bg-gold/10 text-gold border-gold/20'}`}>
                    {m.status}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center relative z-10">
                <div className="text-center flex-1 space-y-2">
                <div className="w-12 h-12 rounded-full mx-auto overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                  {m.teamALogo ? (
                    <img src={m.teamALogo} className="w-full h-full object-cover" alt={m.teamAName} />
                  ) : (
                    <Trophy size={16} className="text-white/10" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-[10px] text-text-secondary uppercase tracking-tighter mb-1">{m.teamAName}</p>
                  <p className="font-mono text-2xl text-white font-extrabold">{m.innings[0].score}<span className="text-gold opacity-50">/{m.innings[0].wickets}</span></p>
                  <p className="text-[9px] text-text-secondary tracking-widest uppercase opacity-60">({formatOvers(m.innings[0].balls)} ov)</p>
                </div>
              </div>

              <div className="px-6 relative">
                 <div className="w-[1px] h-10 bg-white/10 mx-auto"></div>
                 <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-2 text-[10px] font-black text-gold/30">VS</span>
              </div>

              <div className="text-center flex-1 space-y-2">
                <div className="w-12 h-12 rounded-full mx-auto overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                  {m.teamBLogo ? (
                    <img src={m.teamBLogo} className="w-full h-full object-cover" alt={m.teamBName} />
                  ) : (
                    <Trophy size={16} className="text-white/10" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-[10px] text-text-secondary uppercase tracking-tighter mb-1">{m.teamBName}</p>
                  {m.innings[1] ? (
                    <>
                      <p className="font-mono text-2xl text-white font-extrabold">{m.innings[1].score}<span className="text-gold opacity-50">/{m.innings[1].wickets}</span></p>
                      <p className="text-[9px] text-text-secondary tracking-widest uppercase opacity-60">({formatOvers(m.innings[1].balls)} ov)</p>
                    </>
                  ) : (
                    <p className="text-[10px] text-text-secondary font-mono tracking-widest mt-2 bg-white/5 py-1 rounded-lg italic">DNB</p>
                  )}
                </div>
              </div>
            </div>

            {m.manOfTheMatch && (
              <div className="flex items-center justify-center gap-3 py-3 border-t border-white/5 mt-2 bg-gradient-to-r from-transparent via-gold/5 to-transparent relative z-10">
                 <div className="w-8 h-8 rounded-full overflow-hidden border border-gold/30">
                    {data.players.find(p => p.id === m.manOfTheMatch)?.imageUrl ? (
                      <img src={data.players.find(p => p.id === m.manOfTheMatch)?.imageUrl} alt="motm" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gold bg-gold/10">
                        <User size={14} />
                      </div>
                    )}
                 </div>
                 <p className="text-[9px] text-gold font-bold uppercase tracking-[2px] flex items-center gap-2">
                   <Trophy size={12} /> {data.players.find(p => p.id === m.manOfTheMatch)?.name}
                 </p>
              </div>
            )}

            <button 
              onClick={() => { setActiveMatchId(m.id); setView('live'); }} 
              className="w-full py-4 bg-white/5 hover:bg-gold hover:text-bg-deep rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer text-white relative z-10"
            >
              DETAILS
            </button>

            <button 
                onClick={() => {
                  setData(prev => ({ ...prev, matches: prev.matches.filter(match => match.id !== m.id) }));
                }}
                className="w-full py-2 bg-red/5 hover:bg-red/20 text-red-500 rounded-xl text-[8px] font-bold uppercase tracking-widest mt-2 transition-all cursor-pointer relative z-10"
              >
                DELETE MATCH RECORD
            </button>
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-green/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-all group-hover:bg-gold/10"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen md:bg-bg-deep flex flex-col items-center justify-center">
      <div className="app-frame">
        <Header />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <AnimatePresence>
            <MatchEventOverlay />
          </AnimatePresence>
          <AnimatePresence mode="wait">
            {view === 'home' && <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden"><Home /></motion.div>}
            {view === 'players' && <motion.div key="players" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden"><PlayerManagement /></motion.div>}
            {view === 'setup' && <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden"><MatchSetup /></motion.div>}
            {view === 'live' && <motion.div key="live" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden"><LiveScoring /></motion.div>}
            {view === 'records' && <motion.div key="records" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden"><Records /></motion.div>}
            {view === 'admin' && <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden"><AdminPanel /></motion.div>}
            {view === 'standings' && <motion.div key="standings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden"><Standings /></motion.div>}
            {view === 'gallery' && <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden"><Gallery /></motion.div>}
          </AnimatePresence>
        </main>

        {/* Bottom Nav */}
        <nav id="bottom-navigation" className="h-[60px] border-t border-white/5 bg-surface/80 backdrop-blur-md grid grid-cols-5 items-center text-center z-50">
          <button id="nav-match" onClick={() => setView('home')} className={`h-full flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${['home', 'setup', 'live'].includes(view) ? 'text-gold' : 'text-text-secondary'}`}>
            <Play size={18} />
            <span className="text-[8px] font-bold uppercase tracking-tighter">Match</span>
          </button>
          <button id="nav-players" onClick={() => setView('players')} className={`h-full flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${view === 'players' ? 'text-gold' : 'text-text-secondary'}`}>
            <Users size={18} />
            <span className="text-[8px] font-bold uppercase tracking-tighter">Squad</span>
          </button>
          <button id="nav-table" onClick={() => setView('standings')} className={`h-full flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${view === 'standings' ? 'text-gold' : 'text-text-secondary'}`}>
            <Trophy size={18} />
            <span className="text-[8px] font-bold uppercase tracking-tighter">Table</span>
          </button>
          <button id="nav-gallery" onClick={() => setView('gallery')} className={`h-full flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${view === 'gallery' ? 'text-gold' : 'text-text-secondary'}`}>
            <Camera size={18} />
            <span className="text-[8px] font-bold uppercase tracking-tighter">Gallery</span>
          </button>
          <button id="nav-admin" onClick={() => setView('admin')} className={`h-full flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${view === 'admin' ? 'text-gold' : 'text-text-secondary'}`}>
            <ShieldCheck size={18} />
            <span className="text-[8px] font-bold uppercase tracking-tighter">Admin</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
