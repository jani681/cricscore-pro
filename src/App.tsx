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
  Edit3,
  RefreshCcw,
  Loader2,
  AlertCircle
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
    if (saved) return JSON.parse(saved);
    return { players: [], matches: [], gallery: [], admin: { name: 'Touqeer Iqbal Baghoor', whatsapp: '03015800630', isLoggedIn: false } };
  });

  const [view, setView] = useState<'home' | 'players' | 'setup' | 'live' | 'records' | 'standings' | 'gallery' | 'admin'>('home');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  // --- API State for Live Matches ---
  const [apiMatches, setApiMatches] = useState<any[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchApiMatches = async () => {
    setApiLoading(true);
    setApiError(null);
    try {
      const response = await fetch('/api/matches');
      if (!response.ok) throw new Error('Failed to fetch real-time data');
      const result = await response.json();
      
      const matches: any[] = [];
      if (result.typeMatches) {
        result.typeMatches.forEach((tm: any) => {
          if (tm.seriesMatches) {
            tm.seriesMatches.forEach((sm: any) => {
              if (sm.seriesAdWrapper && sm.seriesAdWrapper.matches) {
                sm.seriesAdWrapper.matches.forEach((m: any) => matches.push(m.matchInfo));
              }
            });
          }
        });
      }
      setApiMatches(matches);
    } catch (err: any) {
      setApiError(err.message || 'Error connecting to cricket service');
    } finally {
      setApiLoading(false);
    }
  };

  useEffect(() => {
    fetchApiMatches();
    const interval = setInterval(fetchApiMatches, 30000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const Home = () => (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto pb-24">
      <div className="text-center py-8">
        <motion.h2 initial={{ y: -20 }} animate={{ y: 0 }} className="text-4xl font-black tracking-tighter text-white">
          ARENA<span className="text-gold">.</span>
        </motion.h2>
        <p className="text-xs text-text-secondary uppercase tracking-[4px] mt-2 font-bold opacity-80">Live Cricket Network</p>
      </div>

      <div className="flex justify-between items-center px-1">
        <h3 className="text-[10px] font-black uppercase tracking-[2px] text-white/40">PRO LIVE FEED</h3>
        <button 
          onClick={fetchApiMatches} 
          disabled={apiLoading}
          className="flex items-center gap-2 text-[10px] font-bold uppercase text-gold hover:text-white transition-all active:scale-90 disabled:opacity-50"
        >
          {apiLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
          {apiLoading ? 'Updating' : 'Refresh Now'}
        </button>
      </div>

      {apiLoading && apiMatches.length === 0 && (
        <div className="py-20 bg-white/3 border border-dashed border-white/5 rounded-[32px] flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-gold" size={40} />
          <p className="text-[10px] text-text-secondary uppercase tracking-widest font-black">Syncing Satellites...</p>
        </div>
      )}

      {apiError && (
        <div className="bg-red/10 border border-red/20 rounded-2xl p-4 flex items-center gap-4 text-red">
          <AlertCircle size={20} />
          <p className="text-[10px] font-bold uppercase leading-tight">{apiError}</p>
        </div>
      )}

      <div className="space-y-4">
        {apiMatches.map((m: any, idx: number) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: idx * 0.05 }}
            key={m.matchId} 
            className="bg-surface border border-white/5 rounded-[32px] p-6 space-y-5 shadow-2xl relative overflow-hidden group"
          >
            <div className="flex justify-between items-center text-[9px] font-black uppercase text-text-secondary tracking-widest relative z-10">
              <span className="truncate max-w-[65%] text-gold/60">{m.seriesName}</span>
              <span className={`px-2.5 py-1 rounded-full ${m.status.toLowerCase().includes('live') ? 'bg-red text-white' : 'bg-white/10 text-white'}`}>
                {m.state || 'Match'}
              </span>
            </div>
            
            <div className="grid grid-cols-5 items-center gap-4 relative z-10">
              <div className="col-span-2 text-center space-y-3">
                <div className="w-16 h-16 bg-white/5 border border-white/5 rounded-full mx-auto flex items-center justify-center text-2xl font-black text-white shadow-inner">
                  {m.team1.teamName[0]}
                </div>
                <p className="font-black text-xs text-white uppercase truncate tracking-tighter">{m.team1.teamName}</p>
              </div>
              
              <div className="text-center font-black text-white/5 italic text-4xl select-none">VS</div>
              
              <div className="col-span-2 text-center space-y-3">
                <div className="w-16 h-16 bg-white/5 border border-white/5 rounded-full mx-auto flex items-center justify-center text-2xl font-black text-white shadow-inner">
                  {m.team2.teamName[0]}
                </div>
                <p className="font-black text-xs text-white uppercase truncate tracking-tighter">{m.team2.teamName}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 text-center relative z-10">
              <p className="text-[11px] font-black text-accent-green uppercase tracking-wide italic">{m.status}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 pb-8">
        <button onClick={() => setView('setup')} className="col-span-2 h-44 bg-gold rounded-[40px] flex flex-col items-center justify-center gap-4 active:scale-95 transition-all shadow-2xl shadow-gold/20">
          <div className="w-16 h-16 rounded-full bg-bg-deep flex items-center justify-center text-gold shadow-lg">
            <Play size={32} fill="currentColor" />
          </div>
          <span className="font-black text-sm text-bg-deep uppercase tracking-[3px]">Start Local Match</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-deep flex flex-col items-center justify-center p-0 md:p-4">
      <div className="app-frame">
        <main className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
             {view === 'home' && <Home />}
             {/* Other views (Players, Records, Admin, etc.) would be added here */}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
