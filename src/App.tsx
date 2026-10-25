import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Trophy,
  SlidersHorizontal,
  X,
  Check,
  RotateCcw,
  Zap,
} from 'lucide-react';
import {
  CHARACTERS,
  CharacterId,
  DIFFICULTIES,
  DifficultyPreset,
  GameState,
  RunRecord,
  ThemeMode,
  getMedalForScore,
} from './types/game';
import { GameCanvas } from './components/GameCanvas';
import { ScoreboardModal } from './components/ScoreboardModal';
import { soundEngine } from './utils/soundEngine';

const STORAGE_KEYS = {
  CHARACTER: 'flappy_custom_character_v1',
  THEME: 'flappy_custom_theme_v1',
  DIFFICULTY: 'flappy_custom_difficulty_v1',
  VOICE_SPEED: 'flappy_custom_voice_speed_v1',
  BEST_SCORES: 'flappy_custom_best_scores_v1',
  RUN_HISTORY: 'flappy_custom_runs_v1',
};

const VOICE_SPEED_OPTIONS = [
  { rate: 1.0, label: '1.0x Normal' },
  { rate: 1.35, label: '1.35x Fast' },
  { rate: 1.65, label: '1.65x Snappy' },
  { rate: 2.0, label: '2.0x Ultra' },
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [characterId, setCharacterId] = useState<CharacterId>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CHARACTER);
    return saved === 'side_profile' ? 'side_profile' : 'rose_crown';
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved === 'night' ? 'night' : 'day';
  });
  const [difficulty, setDifficulty] = useState<DifficultyPreset>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DIFFICULTY);
    if (saved === 'chill' || saved === 'classic' || saved === 'turbo') return saved;
    return 'classic';
  });
  const [voiceSpeed, setVoiceSpeed] = useState<number>(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEYS.VOICE_SPEED));
    if (saved && saved >= 1.0 && saved <= 2.5) return saved;
    return 1.65;
  });

  const [score, setScore] = useState<number>(0);
  const [isNewBest, setIsNewBest] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMobileCustomizeOpen, setIsMobileCustomizeOpen] = useState<boolean>(false);

  const [bestScores, setBestScores] = useState<Record<DifficultyPreset, number>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BEST_SCORES);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore parse error
    }
    return { chill: 0, classic: 0, turbo: 0 };
  });

  const [runHistory, setRunHistory] = useState<RunRecord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RUN_HISTORY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore parse error
    }
    return [];
  });

  // Sync preferences to localStorage and SoundEngine
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHARACTER, characterId);
  }, [characterId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DIFFICULTY, difficulty);
  }, [difficulty]);

  useEffect(() => {
    soundEngine.setPlaybackRate(voiceSpeed);
    localStorage.setItem(STORAGE_KEYS.VOICE_SPEED, String(voiceSpeed));
  }, [voiceSpeed]);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  };

  const handleTestJumpAudio = () => {
    if (isMuted) {
      setIsMuted(false);
      soundEngine.setMuted(false);
    }
    soundEngine.playJumpSound();
  };

  const handleChangeVoiceSpeed = (rate: number) => {
    setVoiceSpeed(rate);
    soundEngine.setPlaybackRate(rate);
    if (isMuted) {
      setIsMuted(false);
      soundEngine.setMuted(false);
    }
    soundEngine.playJumpSound();
  };

  const handleSelectCharacter = (id: CharacterId) => {
    setCharacterId(id);
    soundEngine.playJumpSound();
  };

  const handleEnterReady = useCallback(() => {
    void soundEngine.init();
    setScore(0);
    setIsNewBest(false);
    setIsMobileCustomizeOpen(false);
    setGameState('READY');
  }, []);

  const handleBeginPlaying = useCallback(() => {
    setGameState('PLAYING');
  }, []);

  const handleScoreIncrement = useCallback(() => {
    setScore((prev) => prev + 1);
  }, []);

  const handleGameOver = useCallback(
    (finalScore: number) => {
      setScore(finalScore);
      setGameState('GAME_OVER');

      setBestScores((prev) => {
        const currentBest = prev[difficulty] || 0;
        const beatRecord = finalScore > currentBest;
        setIsNewBest(beatRecord && finalScore > 0);
        const updated = {
          ...prev,
          [difficulty]: Math.max(currentBest, finalScore),
        };
        localStorage.setItem(STORAGE_KEYS.BEST_SCORES, JSON.stringify(updated));
        return updated;
      });

      const newRecord: RunRecord = {
        id: `${Date.now()}`,
        score: finalScore,
        characterId,
        difficulty,
        theme,
        medal: getMedalForScore(finalScore),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setRunHistory((prev) => {
        const next = [newRecord, ...prev].slice(0, 6);
        localStorage.setItem(STORAGE_KEYS.RUN_HISTORY, JSON.stringify(next));
        return next;
      });
    },
    [characterId, difficulty, theme]
  );

  const handleClearBestScores = () => {
    const reset = { chill: 0, classic: 0, turbo: 0 };
    setBestScores(reset);
    setRunHistory([]);
    localStorage.setItem(STORAGE_KEYS.BEST_SCORES, JSON.stringify(reset));
    localStorage.removeItem(STORAGE_KEYS.RUN_HISTORY);
  };

  const activeBestScore = bestScores[difficulty] || 0;
  const activeCharacter = CHARACTERS[characterId];
  const activeDifficulty = DIFFICULTIES[difficulty];

  return (
    <div className="min-h-dvh w-full bg-[#0B1120] text-slate-100 flex flex-col">
      {/* Desktop Top Bar (3-zone contract) */}
      <header className="hidden lg:flex items-center justify-between gap-8 px-8 py-3.5 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md">
        <a
          href="#arcade"
          onClick={(e) => {
            e.preventDefault();
            setGameState('TITLE_MENU');
          }}
          className="font-display text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Flappy Legend Arcade
        </a>

        <nav className="flex items-center gap-4 text-xs font-semibold text-slate-400">
          {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => {
            const char = CHARACTERS[id];
            const isSelected = characterId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectCharacter(id)}
                className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected ? 'text-amber-400 underline underline-offset-4' : ''
                }`}
              >
                {char.name}
              </button>
            );
          })}
          <span className="text-slate-600">|</span>
          <button
            type="button"
            onClick={() => setTheme(theme === 'day' ? 'night' : 'day')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {theme === 'day' ? 'Night Sky' : 'Day Sky'}
          </button>
          <button
            type="button"
            onClick={handleTestJumpAudio}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer text-amber-300"
          >
            Voice ({voiceSpeed}x)
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleEnterReady}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Start New Flight
          </button>
        </div>
      </header>

      {/* Main Responsive Workspace: Full-Screen Mobile Touch Canvas | Two-Column Arcade + Customizer on Desktop */}
      <main className="flex-1 w-full max-w-6xl mx-auto flex flex-col lg:grid lg:grid-cols-12 lg:gap-8 lg:items-center lg:px-8 lg:py-6">
        {/* Left/Center Column: The Responsive Flappy Bird Game Cabinet */}
        <section className="relative w-full h-dvh lg:h-[672px] lg:col-span-6 flex items-center justify-center">
          <div className="relative w-full h-full max-w-[430px] lg:w-[420px] lg:h-[672px] lg:aspect-[400/640] lg:rounded-3xl overflow-hidden lg:border-4 lg:border-slate-700/90 lg:shadow-2xl bg-slate-900 select-none">
            {/* 60FPS HTML5 Canvas */}
            <GameCanvas
              gameState={gameState}
              characterId={characterId}
              theme={theme}
              difficulty={difficulty}
              score={score}
              onStartReady={handleEnterReady}
              onBeginPlaying={handleBeginPlaying}
              onScoreIncrement={handleScoreIncrement}
              onGameOver={handleGameOver}
            />

            {/* Unobtrusive Top HUD Bar (<= 10% mobile viewport height) */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3.5 pt-3 pb-2 pointer-events-none">
              {/* Current Flyer & Mode Info */}
              <div className="flex items-center gap-2 bg-slate-950/65 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 pointer-events-auto">
                <img
                  src={activeCharacter.imageUrl}
                  alt={activeCharacter.name}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border border-amber-400"
                />
                <div className="text-xs leading-tight">
                  <div className="font-bold text-white truncate max-w-[125px]">
                    {activeCharacter.name}
                  </div>
                  <div className="text-[11px] text-amber-300 font-mono-num">
                    {activeDifficulty.label} · {voiceSpeed}x Voice
                  </div>
                </div>
              </div>

              {/* Right Quick Controls (Audio Mute + Mobile Customizer Drawer Trigger) */}
              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  aria-label={isMuted ? 'Unmute Jump Audio' : 'Mute Jump Audio'}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-950/65 hover:bg-slate-900/90 backdrop-blur-md border border-white/15 text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-emerald-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsMobileCustomizeOpen(true)}
                  aria-label="Customize Character and Theme"
                  className="lg:hidden min-h-[44px] px-3 rounded-xl bg-slate-950/65 hover:bg-slate-900/90 backdrop-blur-md border border-white/15 text-white flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-transform cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="whitespace-nowrap shrink-0">Customize</span>
                </button>
              </div>
            </div>

            {/* Live Big Arcade Score Counter during READY & PLAYING */}
            {(gameState === 'READY' || gameState === 'PLAYING') && (
              <div className="absolute top-16 left-0 right-0 z-10 flex flex-col items-center pointer-events-none">
                <div className="font-display text-6xl font-black text-white arcade-score-shadow font-mono-num select-none">
                  {score}
                </div>
              </div>
            )}

            {/* GET READY! Tap to Levitate Overlay */}
            {gameState === 'READY' && (
              <div className="absolute inset-x-0 bottom-28 z-10 flex flex-col items-center pointer-events-none px-6 text-center">
                <div className="px-5 py-2.5 rounded-2xl bg-slate-950/75 border-2 border-amber-400/80 backdrop-blur-sm shadow-xl">
                  <p className="font-display text-2xl font-black text-amber-300 tracking-wide arcade-text-shadow">
                    GET READY!
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-white">
                    Tap screen or press Spacebar — voice completes fast ({voiceSpeed}x) on every jump
                  </p>
                </div>
              </div>
            )}

            {/* TITLE MENU OVERLAY (Character Picker + Voice Speed + Start Button in Mobile Thumb Zone) */}
            {gameState === 'TITLE_MENU' && (
              <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 pt-20 pb-5 bg-gradient-to-b from-slate-950/35 via-slate-950/20 to-slate-950/85">
                {/* Title Lockup */}
                <div className="text-center mt-1">
                  <h1 className="font-display text-4xl sm:text-5xl font-black text-white tracking-tight arcade-score-shadow">
                    FLAPPY LEGEND
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm font-semibold text-amber-200 drop-shadow">
                    Pick your custom flyer photo & tap to levitate
                  </p>
                </div>

                {/* Bottom Natural Thumb-Zone Character Selection & Start CTA */}
                <div className="w-full max-w-[355px] mx-auto space-y-2.5 bg-slate-950/85 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 shadow-2xl">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                    <span>Choose Your Flyer Photo</span>
                    <button
                      type="button"
                      onClick={handleTestJumpAudio}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span className="whitespace-nowrap shrink-0">
                        Test Voice ({voiceSpeed}x)
                      </span>
                    </button>
                  </div>

                  {/* Two Character Photo Cards */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => {
                      const char = CHARACTERS[id];
                      const selected = characterId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleSelectCharacter(id)}
                          className={`group relative flex flex-col items-center p-2 rounded-xl border-2 transition-all cursor-pointer ${
                            selected
                              ? 'bg-amber-400/15 border-amber-400 shadow-md'
                              : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-500'
                          }`}
                        >
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-800 border border-white/10">
                            <img
                              src={char.imageUrl}
                              alt={char.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="mt-1.5 text-xs font-bold text-white whitespace-nowrap truncate max-w-full">
                            {char.name}
                          </span>
                          {selected && (
                            <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Voice Speed Selector Row */}
                  <div className="flex items-center justify-between gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-300 pl-2 flex items-center gap-1 whitespace-nowrap shrink-0">
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      Voice Speed
                    </span>
                    <div className="flex items-center gap-1">
                      {VOICE_SPEED_OPTIONS.map((opt) => (
                        <button
                          key={opt.rate}
                          type="button"
                          onClick={() => handleChangeVoiceSpeed(opt.rate)}
                          className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            voiceSpeed === opt.rate
                              ? 'bg-amber-400 text-slate-950'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {opt.rate}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Theme & Difficulty Row */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Day / Night Segmented Control */}
                    <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setTheme('day')}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          theme === 'day'
                            ? 'bg-sky-400 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap shrink-0">Day</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('night')}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          theme === 'night'
                            ? 'bg-indigo-500 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap shrink-0">Night</span>
                      </button>
                    </div>

                    {/* Difficulty Segmented Control */}
                    <div className="flex-1 flex items-center justify-end bg-slate-900 p-1 rounded-xl border border-slate-800">
                      {(['chill', 'classic', 'turbo'] as DifficultyPreset[]).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setDifficulty(preset)}
                          className={`flex-1 min-h-[36px] px-2 py-1 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                            difficulty === preset
                              ? 'bg-amber-400 text-slate-950'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Start Button (>= 48px touch target) */}
                  <button
                    type="button"
                    onClick={handleEnterReady}
                    className="w-full min-h-[52px] py-3 px-6 rounded-xl bg-[#73BF2E] hover:bg-[#65AD24] active:scale-[0.98] border-b-4 border-[#4A8019] text-white font-display font-black text-lg tracking-wide flex items-center justify-center gap-2 shadow-lg transition-transform cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current shrink-0" />
                    <span className="whitespace-nowrap shrink-0">START GAME</span>
                  </button>
                </div>
              </div>
            )}

            {/* GAME OVER SCORECARD MODAL */}
            {gameState === 'GAME_OVER' && (
              <ScoreboardModal
                score={score}
                bestScore={activeBestScore}
                isNewBest={isNewBest}
                characterId={characterId}
                difficulty={difficulty}
                onPlayAgain={handleEnterReady}
                onOpenCustomize={() => {
                  setGameState('TITLE_MENU');
                }}
                onTestAudio={handleTestJumpAudio}
              />
            )}
          </div>
        </section>

        {/* Right Column (Desktop Customization Studio & High Score Locker) */}
        <aside className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-6">
          {/* Card 1: Character & Voice Audio Customizer */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-white">
                  01. Flyer & Jump Voice Studio
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Silence is trimmed automatically and voice playback is sped up so the full clip finishes cleanly before your next jump.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestJumpAudio}
                className="px-4 py-2.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0"
              >
                <Volume2 className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap shrink-0">Test Voice ({voiceSpeed}x)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-5">
              {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => {
                const char = CHARACTERS[id];
                const isSelected = characterId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectCharacter(id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400/10 border-amber-400'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <img
                      src={char.imageUrl}
                      alt={char.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover border border-white/15 shrink-0 bg-slate-800"
                    />
                    <div className="min-w-0">
                      <div className="font-display font-bold text-base text-white truncate">
                        {char.name}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                        {char.tagline}
                      </p>
                      <div className="mt-2 text-xs font-bold text-amber-400">
                        {isSelected ? 'Active Flyer' : 'Click to Equip'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Voice Speed Controls */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Jump Voice Playback Speed:</span>
              </div>
              <div className="flex items-center gap-2">
                {VOICE_SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.rate}
                    type="button"
                    onClick={() => handleChangeVoiceSpeed(opt.rate)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      voiceSpeed === opt.rate
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Environment & Physics Presets */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl">
            <h2 className="font-display text-2xl font-extrabold text-white">
              02. Sky Theme & Physics Tuning
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Customize background time-of-day and pipe gap difficulty.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                type="button"
                onClick={() => setTheme('day')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors cursor-pointer ${
                  theme === 'day'
                    ? 'bg-sky-500/15 border-sky-400 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-bold">Classic Daylight Sky</div>
                  <div className="text-xs text-slate-400">Turquoise horizon & clouds</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTheme('night')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors cursor-pointer ${
                  theme === 'night'
                    ? 'bg-indigo-500/15 border-indigo-400 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-5 h-5 text-indigo-300 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-bold">Starry Night City</div>
                  <div className="text-xs text-slate-400">Crescent moon & lit skyline</div>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              {(['chill', 'classic', 'turbo'] as DifficultyPreset[]).map((preset) => {
                const cfg = DIFFICULTIES[preset];
                const active = difficulty === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDifficulty(preset)}
                    className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-amber-400/15 border-amber-400 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{cfg.label}</span>
                      <span className="text-xs font-mono-num text-amber-400">
                        Best: {bestScores[preset] || 0}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{cfg.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Recent Flight Log & Controls */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="font-display text-xl font-extrabold text-white">
                  03. Recent Flight Records
                </h2>
              </div>
              {runHistory.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearBestScores}
                  className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Records</span>
                </button>
              )}
            </div>

            {runHistory.length === 0 ? (
              <p className="text-sm text-slate-400 mt-3">
                No flights recorded in this session yet. Tap the game screen or press{' '}
                <kbd className="px-2 py-0.5 text-xs font-mono bg-slate-800 text-slate-200 rounded border border-slate-700">
                  Spacebar
                </kbd>{' '}
                to launch your first run!
              </p>
            ) : (
              <div className="mt-3 divide-y divide-slate-800/80">
                {runHistory.slice(0, 4).map((run) => (
                  <div
                    key={run.id}
                    className="py-2 flex items-center justify-between text-xs text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {CHARACTERS[run.characterId].name}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{run.difficulty}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-400">{run.timestamp}</span>
                    </div>
                    <div className="font-mono-num font-bold text-amber-400 text-sm">
                      {run.score} pts
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Mobile Bottom Sheet Customizer Drawer */}
      {isMobileCustomizeOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full rounded-t-3xl bg-slate-900 border-t border-slate-700 p-5 pb-8 space-y-4 shadow-2xl">
            <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto -mt-1" />

            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-extrabold text-white">
                Customize Flyer & Voice Speed
              </h3>
              <button
                type="button"
                onClick={() => setIsMobileCustomizeOpen(false)}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => {
                const char = CHARACTERS[id];
                const selected = characterId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectCharacter(id)}
                    className={`p-3 rounded-2xl border-2 flex flex-col items-center text-center ${
                      selected
                        ? 'bg-amber-400/15 border-amber-400'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <img
                      src={char.imageUrl}
                      alt={char.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                    <span className="mt-2 text-xs font-bold text-white">{char.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Voice Speed Selector */}
            <div>
              <div className="text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Jump Voice Speed</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {VOICE_SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.rate}
                    type="button"
                    onClick={() => handleChangeVoiceSpeed(opt.rate)}
                    className={`min-h-[44px] rounded-xl border font-bold text-xs ${
                      voiceSpeed === opt.rate
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-950 text-slate-300 border-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTheme('day')}
                className={`min-h-[46px] rounded-xl border font-bold text-xs flex items-center justify-center gap-2 ${
                  theme === 'day'
                    ? 'bg-sky-400 text-slate-950 border-sky-300'
                    : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Daylight Sky</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('night')}
                className={`min-h-[46px] rounded-xl border font-bold text-xs flex items-center justify-center gap-2 ${
                  theme === 'night'
                    ? 'bg-indigo-500 text-white border-indigo-400'
                    : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Starry Night</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['chill', 'classic', 'turbo'] as DifficultyPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDifficulty(preset)}
                  className={`min-h-[46px] rounded-xl border font-bold text-xs capitalize ${
                    difficulty === preset
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsMobileCustomizeOpen(false)}
              className="w-full min-h-[48px] rounded-xl bg-[#73BF2E] text-white font-display font-black text-base"
            >
              Done & Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
