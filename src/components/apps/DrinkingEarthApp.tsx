import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import { motion, AnimatePresence } from 'motion/react';
import {
  Beer, Wine, Martini, Flame, Droplet,
  LocateFixed, GlassWater, Coffee, X,
  Trophy, MapPin, Users, TrendingUp,
  Sparkles, ArrowLeft, Home, Share2,
  Globe as GlobeIcon, Building2, ChevronDown, ChevronUp
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface DrinkingEarthAppProps {
  onBack: () => void;
}

interface DrinkEvent {
  id: string;
  createdAt: number;
  country?: string;
  city?: string;
  lat?: number;
  lng?: number;
  drinkType: string;
  drinkName?: string;
  message?: string;
  gender?: 'male' | 'female' | 'other';
}

type RankingTab = 'countries' | 'cities' | 'drinks';

// ============================================================================
// Constants
// ============================================================================

const ACTIVE_WINDOW = 30 * 60 * 1000; // 30 minutes

const DRINK_CONFIG: Record<string, { emoji: string; label: string; color: string; icon: any }> = {
  beer: { emoji: '🍺', label: 'Beer', color: '#fbbf24', icon: Beer },
  wine: { emoji: '🍷', label: 'Wine', color: '#dc2626', icon: Wine },
  whisky: { emoji: '🥃', label: 'Whisky', color: '#d97706', icon: GlassWater },
  sake: { emoji: '🍶', label: 'Sake', color: '#38bdf8', icon: Droplet },
  cocktail: { emoji: '🍸', label: 'Cocktail', color: '#e879f9', icon: Martini },
  spirits: { emoji: '🔥', label: 'Spirits', color: '#a855f7', icon: Flame },
  brandy: { emoji: '🥃', label: 'Brandy', color: '#92400e', icon: GlassWater },
  gin: { emoji: '🫒', label: 'Gin', color: '#10b981', icon: Droplet },
  rum: { emoji: '🏴‍☠️', label: 'Rum', color: '#78350f', icon: Flame },
  vodka: { emoji: '❄️', label: 'Vodka', color: '#60a5fa', icon: GlassWater },
  baijiu: { emoji: '🏮', label: 'Baijiu', color: '#ef4444', icon: Flame },
  other: { emoji: '🥂', label: 'Other', color: '#22c55e', icon: Coffee },
};

const GENDER_CONFIG = {
  male: { emoji: '👨', label: 'Male', color: '#3b82f6' },
  female: { emoji: '👩', label: 'Female', color: '#ec4899' },
  other: { emoji: '🧑', label: 'Other', color: '#8b5cf6' },
};

// ============================================================================
// Helper Functions
// ============================================================================

const getDrink = (type: string) => DRINK_CONFIG[type] || DRINK_CONFIG.other;
const getGender = (g?: string) => GENDER_CONFIG[g as keyof typeof GENDER_CONFIG] || null;
const isActive = (e: DrinkEvent) => Date.now() - e.createdAt < ACTIVE_WINDOW;
const timeAgo = (ts: number) => {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

// ============================================================================
// Sub Components
// ============================================================================

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-black/40 backdrop-blur-md rounded-xl p-3 border border-white/10">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-white/50 text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function RankItem({ rank, label, count, color }: { rank: number; label: string; count: number; color?: string }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="flex items-center gap-3 py-2 px-2 hover:bg-white/5 rounded-lg transition-colors">
      <span className="w-6 text-center font-bold text-lg drop-shadow-md">
        {rank <= 3 ? medals[rank - 1] : <span className="text-white/60 text-sm font-mono">#{rank}</span>}
      </span>
      <span className="flex-1 text-white font-medium text-sm truncate tracking-wide drop-shadow-sm">{label}</span>
      <span className="text-green-400 text-sm font-bold font-mono bg-green-500/10 px-2 py-0.5 rounded">{count}</span>
    </div>
  );
}

function FeedItem({ event }: { event: DrinkEvent }) {
  const drink = getDrink(event.drinkType);
  const gender = getGender(event.gender);
  const active = isActive(event);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${active
        ? 'bg-white/10 border-white/20'
        : 'bg-black/20 border-white/5'
        }`}
    >
      <div className="text-2xl">{gender?.emoji || '🧑'}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{drink.emoji}</span>
          <span className="text-white font-medium truncate">
            {event.drinkName || drink.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
          <MapPin className="w-3 h-3" />
          <span>{event.city || event.country || 'Earth'}</span>
          <span>·</span>
          <span>{timeAgo(event.createdAt)}</span>
        </div>
        {event.message && (
          <div className="text-xs text-white/60 mt-1 italic">"{event.message}"</div>
        )}
      </div>
      {active && (
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      )}
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DrinkingEarthApp({ onBack }: DrinkingEarthAppProps) {
  const globeEl = useRef<GlobeMethods>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [events, setEvents] = useState<DrinkEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [drinkType, setDrinkType] = useState('beer');
  const [drinkName, setDrinkName] = useState('');
  const [message, setMessage] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // UI state
  const [showStats, setShowStats] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [rankingTab, setRankingTab] = useState<RankingTab>('countries');
  const [showFullRanking, setShowFullRanking] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!globeEl.current) return;
    const controls = globeEl.current.controls();
    if (controls) {
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 0.4;
      controls.enableZoom = true;
      controls.enableRotate = true;
      controls.enablePan = false;
      controls.minDistance = 150;
      controls.maxDistance = 450;
    }
  }, [autoRotate]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/drinks');
        const data = await res.json();
        if (!cancelled) setEvents(data.events || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // ============================================================================
  // Data Processing
  // ============================================================================

  const validEvents = useMemo(() =>
    events.filter((e): e is DrinkEvent & { lat: number; lng: number } =>
      typeof e.lat === 'number' && typeof e.lng === 'number'
    ), [events]);

  const activeEvents = useMemo(() => validEvents.filter(isActive), [validEvents]);

  const stats = useMemo(() => {
    const byDrink: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const byCity: Record<string, number> = {};
    let male = 0, female = 0, other = 0;

    for (const e of events) {
      byDrink[e.drinkType] = (byDrink[e.drinkType] || 0) + 1;
      if (e.country) byCountry[e.country] = (byCountry[e.country] || 0) + 1;
      if (e.city) byCity[e.city] = (byCity[e.city] || 0) + 1;
      if (e.gender === 'male') male++;
      else if (e.gender === 'female') female++;
      else other++;
    }

    const sortEntries = (obj: Record<string, number>, limit = 10) =>
      Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, limit);

    return {
      total: events.length,
      active: activeEvents.length,
      topDrinks: sortEntries(byDrink),
      topCountries: sortEntries(byCountry),
      topCities: sortEntries(byCity),
      genderStats: { male, female, other },
      countryCount: Object.keys(byCountry).length,
      cityCount: Object.keys(byCity).length,
    };
  }, [events, activeEvents]);

  // Globe data
  const pointsData = useMemo(() => validEvents.map(e => ({
    lat: e.lat,
    lng: e.lng,
    size: isActive(e) ? 1.5 : 0.5,
    color: getDrink(e.drinkType).color,
    event: e,
  })), [validEvents]);

  const ringsData = useMemo(() => activeEvents.map(e => ({
    lat: e.lat,
    lng: e.lng,
    maxR: 8,
    propagationSpeed: 4,
    repeatPeriod: 1500,
    color: getDrink(e.drinkType).color,
  })), [activeEvents]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/drinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drinkType, drinkName, message, gender }),
      });
      const data = await res.json();
      if (data.event) {
        setEvents(prev => [data.event, ...prev].slice(0, 500));
        setShowForm(false);
        setDrinkName('');
        setMessage('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);

        if (data.event.lat && globeEl.current) {
          globeEl.current.pointOfView(
            { lat: data.event.lat, lng: data.event.lng, altitude: 1.5 },
            1500
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  const focusMe = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => globeEl.current?.pointOfView(
        { lat: pos.coords.latitude, lng: pos.coords.longitude, altitude: 1.5 },
        1500
      ),
      () => globeEl.current?.pointOfView({ lat: 35, lng: 105, altitude: 2 }, 1500)
    );
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 overflow-hidden">
      {/* Globe */}
      <div ref={containerRef} className="absolute inset-0">
        {dimensions.width > 0 && (
          <Globe
            ref={globeEl}
            width={dimensions.width}
            height={dimensions.height}
            globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
            bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundColor="rgba(0,0,0,0)"
            showAtmosphere={true}
            atmosphereColor="#22c55e"
            atmosphereAltitude={0.15}
            pointsData={pointsData}
            pointLat="lat"
            pointLng="lng"
            pointColor="color"
            pointAltitude={0.01}
            pointRadius="size"
            pointLabel={(d: any) => {
              const e = d.event as DrinkEvent;
              const drink = getDrink(e.drinkType);
              const g = getGender(e.gender);
              return `
                <div style="background: rgba(0,0,0,0.9); padding: 12px; border-radius: 12px; border: 2px solid ${drink.color}; min-width: 150px;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="font-size: 24px;">${g?.emoji || '🧑'}</span>
                    <span style="font-size: 24px;">${drink.emoji}</span>
                  </div>
                  <div style="color: white; font-weight: bold;">${e.drinkName || drink.label}</div>
                  <div style="color: #888; font-size: 12px;">${e.city || e.country || 'Earth'}</div>
                  ${e.message ? `<div style="color: #aaa; font-size: 11px; margin-top: 6px; font-style: italic;">"${e.message}"</div>` : ''}
                </div>
              `;
            }}
            onPointClick={(p: any) => {
              const e = p?.event;
              if (e?.lat && globeEl.current) {
                globeEl.current.pointOfView({ lat: e.lat, lng: e.lng, altitude: 1.2 }, 1000);
              }
            }}
            ringsData={ringsData}
            ringColor="color"
            ringMaxRadius="maxR"
            ringPropagationSpeed="propagationSpeed"
            ringRepeatPeriod="repeatPeriod"
          />
        )}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-start pointer-events-none">
        {/* Back to Home Button - Enhanced */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-md rounded-full text-white hover:from-gray-700/90 hover:to-gray-800/90 border border-white/20 shadow-lg transition-all group"
        >
          <Home className="w-4 h-4 text-green-400 group-hover:text-green-300" />
          <span className="text-sm font-medium">Home</span>
        </motion.button>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-green-500/20 shadow-lg shadow-green-500/10">
            <Sparkles className="w-5 h-5 text-green-400 animate-pulse" />
            <span className="text-white font-bold tracking-wide">DRINKING EARTH</span>
          </div>

          <div className="flex gap-3 text-sm">
            <div className="bg-black/60 backdrop-blur px-4 py-1.5 rounded-full border border-white/20">
              <span className="text-gray-300 font-medium">Total: </span>
              <span className="text-green-400 font-bold">{stats.total}</span>
            </div>
            <div className="bg-green-500/20 backdrop-blur px-4 py-1.5 rounded-full border border-green-500/30">
              <span className="text-green-300 font-medium">🔴 Live: </span>
              <span className="text-green-400 font-bold animate-pulse">{stats.active}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Left Panel - Stats & Rankings (Redesigned) */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="absolute top-24 left-6 w-80 z-10 pointer-events-auto flex flex-col gap-4"
          >
            {/* Main Glass Panel */}
            <div className="bg-gray-900/80 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">

              {/* Header & Tabs */}
              <div className="p-4 border-b border-white/10 bg-black/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-500/20 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-white font-bold tracking-wide">Leaderboard</span>
                  </div>
                  <div className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded-md">
                    Live Data
                  </div>
                </div>

                {/* Capsule Tabs */}
                <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                  {(['countries', 'cities', 'drinks'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setRankingTab(tab)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${rankingTab === tab
                        ? 'bg-white/10 text-white shadow-lg border border-white/10'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                        }`}
                    >
                      {tab === 'countries' && <GlobeIcon className="w-3 h-3" />}
                      {tab === 'cities' && <Building2 className="w-3 h-3" />}
                      {tab === 'drinks' && <Trophy className="w-3 h-3" />}
                      <span className="capitalize">{tab}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ranking List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide min-h-[300px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={rankingTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-1"
                  >
                    {(() => {
                      const list = rankingTab === 'countries' ? stats.topCountries :
                        rankingTab === 'cities' ? stats.topCities : stats.topDrinks;

                      if (list.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2">
                            <div className="text-4xl opacity-20">📊</div>
                            <div className="text-sm">No data available yet</div>
                          </div>
                        );
                      }

                      return (showFullRanking ? list : list.slice(0, 5)).map(([label, count], i) => {
                        const isTop3 = i < 3;
                        const rankColor = i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500';
                        const bgClass = i === 0 ? 'bg-yellow-500/10 border-yellow-500/20' :
                          i === 1 ? 'bg-white/5 border-white/10' :
                            i === 2 ? 'bg-amber-500/5 border-amber-500/10' : 'hover:bg-white/5 border-transparent';

                        return (
                          <div
                            key={label}
                            className={`flex items-center gap-4 p-3 rounded-xl border transition-all group ${bgClass}`}
                          >
                            <div className={`w-6 text-center font-black text-lg ${rankColor} drop-shadow-sm`}>
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className="flex justify-between items-center mb-1.5">
                                <div className={`font-bold truncate text-sm ${isTop3 ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                  {rankingTab === 'drinks' ? `${getDrink(label).emoji} ${getDrink(label).label}` : label}
                                </div>
                                <div className="text-white font-bold font-mono text-sm">{count}</div>
                              </div>
                              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full opacity-80 ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-green-500'}`}
                                  style={{ width: `${(count / list[0][1]) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer Actions */}
              <div className="p-2 border-t border-white/10 bg-black/20">
                <button
                  onClick={() => setShowFullRanking(!showFullRanking)}
                  className="w-full py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  {showFullRanking ? (
                    <>Show Top 5 <ChevronUp className="w-3 h-3" /></>
                  ) : (
                    <>View All <ChevronDown className="w-3 h-3" /></>
                  )}
                </button>
              </div>
            </div>

            {/* Compact Gender Stats */}
            <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-3 border border-white/10 shadow-lg flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 px-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Demographics</span>
              </div>
              <div className="flex gap-1.5">
                {Object.entries(GENDER_CONFIG).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                    <span className="text-sm">{cfg.emoji}</span>
                    <span className="text-white font-bold text-sm">{stats.genderStats[key as keyof typeof stats.genderStats]}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Panel - Live Feed */}
      <div className="absolute top-20 right-4 w-72 max-h-[60vh] z-10 pointer-events-auto overflow-hidden">
        <div className="bg-black/50 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
          <div className="p-3 border-b border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/80 text-sm font-medium">Live Feed</span>
          </div>
          <div className="p-2 space-y-2 max-h-[50vh] overflow-y-auto scrollbar-hide">
            {events.slice(0, 10).map(e => (
              <FeedItem key={e.id} event={e} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-between items-end pointer-events-none">
        {/* Check In Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(true)}
          className="pointer-events-auto flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl text-white font-bold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all"
        >
          <span className="text-3xl">🍻</span>
          <div className="text-left">
            <div className="text-lg">CHEERS!</div>
            <div className="text-xs text-white/70 font-normal">Check in now</div>
          </div>
        </motion.button>

        {/* Right Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-2 px-4 py-3 backdrop-blur-md rounded-full font-medium transition-all ${showStats
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'bg-black/50 text-white/70 border border-white/10 hover:text-white'
              }`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-sm">{showStats ? 'Ranking' : 'Ranking'}</span>
          </button>
          <button
            onClick={focusMe}
            className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white/70 hover:text-white border border-white/10 transition-all"
          >
            <LocateFixed className="w-5 h-5" />
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-4 py-3 rounded-full font-medium transition-all ${autoRotate
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-black/50 text-white/70 border border-white/10'
              }`}
          >
            {autoRotate ? '🌍 Auto' : '⏸️ Stop'}
          </button>
        </div>
      </div>

      {/* Check In Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-gray-900/95 backdrop-blur-xl rounded-3xl p-6 w-[400px] max-w-[90vw] border border-white/10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>🍻</span> Check In
                </h2>
                <button onClick={() => setShowForm(false)} className="text-white/50 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Gender Selection */}
              <div className="mb-5">
                <label className="text-gray-300 font-medium text-sm mb-2 block">Who's drinking?</label>
                <div className="flex gap-2">
                  {Object.entries(GENDER_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setGender(key as any)}
                      className={`flex-1 py-3 rounded-xl border transition-all ${gender === key
                        ? 'bg-white/10 border-white/40'
                        : 'bg-black/40 border-transparent hover:bg-white/10'
                        }`}
                    >
                      <div className="text-2xl mb-1">{cfg.emoji}</div>
                      <div className={`text-xs font-medium ${gender === key ? 'text-white' : 'text-gray-400'}`}>
                        {cfg.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drink Type */}
              <div className="mb-5">
                <label className="text-gray-300 font-medium text-sm mb-2 block">What are you drinking?</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(DRINK_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setDrinkType(key)}
                      className={`p-2 rounded-xl border transition-all ${drinkType === key
                        ? 'bg-white/10 border-white/40'
                        : 'bg-black/40 border-transparent hover:bg-white/10'
                        }`}
                    >
                      <div className="text-xl">{cfg.emoji}</div>
                      <div className={`text-[10px] mt-1 font-medium ${drinkType === key ? 'text-white' : 'text-gray-400'}`}>
                        {cfg.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drink Name */}
              <div className="mb-4">
                <input
                  type="text"
                  value={drinkName}
                  onChange={e => setDrinkName(e.target.value)}
                  placeholder="Brand or name (optional)"
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500/50 focus:bg-black/60 transition-all"
                />
              </div>

              {/* Message */}
              <div className="mb-6">
                <input
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Say something! (optional)"
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500/50 focus:bg-black/60 transition-all"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? 'Sending...' : '🍻 CHEERS!'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast - Enhanced Visual */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            {/* Radial gradient background */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 3 }}
              exit={{ scale: 5, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute w-64 h-64 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, rgba(16, 185, 129, 0.2) 40%, transparent 70%)',
              }}
            />

            {/* Content */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
              className="relative text-center"
            >
              {/* Beer emoji with glow */}
              <motion.div
                animate={{
                  rotate: [0, 15, -15, 10, -10, 0],
                  scale: [1, 1.1, 1, 1.05, 1]
                }}
                transition={{ repeat: 2, duration: 0.4 }}
                className="text-[140px] mb-4 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]"
                style={{ filter: 'drop-shadow(0 0 40px rgba(251, 191, 36, 0.6))' }}
              >
                🍻
              </motion.div>

              {/* CHEERS text with gradient and glow */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-5xl font-black tracking-wider mb-3"
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #86efac 50%, #fbbf24 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 40px rgba(34, 197, 94, 0.8)',
                  filter: 'drop-shadow(0 4px 20px rgba(34, 197, 94, 0.5))',
                }}
              >
                CHEERS!
              </motion.div>

              {/* Subtitle */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg font-medium px-6 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
                style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
                }}
              >
                🌍 You've lit up the Earth!
              </motion.div>

              {/* Sparkle particles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    scale: 0,
                    x: 0,
                    y: 0,
                    opacity: 1
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    x: Math.cos(i * Math.PI / 4) * 120,
                    y: Math.sin(i * Math.PI / 4) * 120,
                    opacity: [1, 1, 0]
                  }}
                  transition={{
                    duration: 0.8,
                    delay: 0.2 + i * 0.05,
                    ease: "easeOut"
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl"
                >
                  ✨
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">🌍</div>
            <div className="text-white/60">Loading the Earth...</div>
          </div>
        </div>
      )}
    </div>
  );
}
