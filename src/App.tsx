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
  Mic,
} from 'lucide-react';
import {
  CHARACTERS,
  CharacterId,
  DIFFICULTIES,
  DifficultyPreset,
  GameState,
  RunRecord,
  ThemeMode,
  VOICE_AUDIOS,
  VoiceAudioId,
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
  VOICE_AUDIO: 'flappy_custom_voice_audio_v1',
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
    if (saved && saved in CHARACTERS) return saved as CharacterId;
    return 'glasses_side';
  });
  const [voiceAudioId, setVoiceAudioId] = useState<VoiceAudioId>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VOICE_AUDIO);
    if (saved === 'khizu' || saved === 'saad_2') return saved;
    return 'saad_1'; // Default audio
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
    return 1.0;
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
    soundEngine.setVoiceAudio(voiceAudioId);
    localStorage.setItem(STORAGE_KEYS.VOICE_AUDIO, voiceAudioId);
  }, [voiceAudioId]);

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

  const handleChangeVoiceAudio = (id: VoiceAudioId) => {
    setVoiceAudioId(id);
    soundEngine.setVoiceAudio(id);
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
        voiceAudioId,
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
    [characterId, difficulty, theme, voiceAudioId]
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
  const activeVoice = VOICE_AUDIOS[voiceAudioId];

  return (
    <div className="min-h-dvh w-full bg-[#0B1120] text-slate-100 flex flex-col">
      {/* Desktop Top Bar (3-zone contract) */}
      <header className="hidden lg:flex items-center justify-between gap-6 px-8 py-3.5 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md">
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
          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
            {(Object.keys(VOICE_AUDIOS) as VoiceAudioId[]).map((vId) => (
              <button
                key={vId}
                type="button"
                onClick={() => handleChangeVoiceAudio(vId)}
                className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                  voiceAudioId === vId
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {VOICE_AUDIOS[vId].name}
              </button>
            ))}
          </div>
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
            Play ({activeVoice.name})
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
                    {activeDifficulty.label} · {activeVoice.name}
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
                  aria-label="Customize Character, Audio and Theme"
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
                    Tap screen or press Spacebar · Voice: <span className="text-amber-300 font-bold">{activeVoice.name}</span>
                  </p>
                </div>
              </div>
            )}

            {/* TITLE MENU OVERLAY */}
            {gameState === 'TITLE_MENU' && (
              <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 pt-16 pb-4 bg-gradient-to-b from-slate-950/35 via-slate-950/20 to-slate-950/85">
                {/* Title Lockup */}
                <div className="text-center mt-0.5">
                  <h1 className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight arcade-score-shadow">
                    FLAPPY LEGEND
                  </h1>
                  <p className="mt-0.5 text-xs font-semibold text-amber-200 drop-shadow">
                    Pick your custom flyer photo & jump audio
                  </p>
                </div>

                {/* Bottom Natural Thumb-Zone Character & Audio Selection */}
                <div className="w-full max-w-[365px] mx-auto space-y-2 bg-slate-950/85 backdrop-blur-md p-3 rounded-2xl border border-white/15 shadow-2xl">
                  {/* Audio Track Selector Row */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                      <span className="flex items-center gap-1.5 text-amber-300">
                        <Mic className="w-3.5 h-3.5" />
                        Jump Audio Track:
                      </span>
                      <button
                        type="button"
                        onClick={handleTestJumpAudio}
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Test ({activeVoice.name})</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(Object.keys(VOICE_AUDIOS) as VoiceAudioId[]).map((vId) => {
                        const opt = VOICE_AUDIOS[vId];
                        const isSelected = voiceAudioId === vId;
                        return (
                          <button
                            key={vId}
                            type="button"
                            onClick={() => handleChangeVoiceAudio(vId)}
                            className={`min-h-[34px] py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 shadow'
                                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                            }`}
                          >
                            <span>{opt.name}</span>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Character Photo Cards */}
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-300 px-1">Flyer Photo</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => {
                        const char = CHARACTERS[id];
                        const selected = characterId === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => handleSelectCharacter(id)}
                            className={`group relative flex flex-col items-center p-1.5 rounded-xl border-2 transition-all cursor-pointer ${
                              selected
                                ? 'bg-amber-400/15 border-amber-400 shadow-md'
                                : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-500'
                            }`}
                          >
                            <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-slate-800 border border-white/10">
                              <img
                                src={char.imageUrl}
                                alt={char.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="mt-1 text-[10px] font-bold text-white whitespace-nowrap truncate max-w-full">
                              {char.name.split(' ')[0]}
                            </span>
                            {selected && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Voice Speed Row */}
                  <div className="flex items-center justify-between gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-300 pl-1.5 flex items-center gap-1 whitespace-nowrap shrink-0">
                      <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                      Speed
                    </span>
                    <div className="flex items-center gap-1">
                      {VOICE_SPEED_OPTIONS.map((opt) => (
                        <button
                          key={opt.rate}
                          type="button"
                          onClick={() => handleChangeVoiceSpeed(opt.rate)}
                          className={`min-h-[28px] px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
                  <div className="flex items-center justify-between gap-1.5">
                    {/* Day / Night Control */}
                    <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setTheme('day')}
                        className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          theme === 'day'
                            ? 'bg-sky-400 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Sun className="w-3 h-3 shrink-0" />
                        <span className="whitespace-nowrap shrink-0">Day</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('night')}
                        className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          theme === 'night'
                            ? 'bg-indigo-500 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Moon className="w-3 h-3 shrink-0" />
                        <span className="whitespace-nowrap shrink-0">Night</span>
                      </button>
                    </div>

                    {/* Difficulty Control */}
                    <div className="flex-1 flex items-center justify-end bg-slate-900 p-1 rounded-xl border border-slate-800">
                      {(['chill', 'classic', 'turbo'] as DifficultyPreset[]).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setDifficulty(preset)}
                          className={`flex-1 min-h-[32px] px-1.5 py-0.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
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

                  {/* Primary Start Button */}
                  <button
                    type="button"
                    onClick={handleEnterReady}
                    className="w-full min-h-[48px] py-2.5 px-6 rounded-xl bg-[#73BF2E] hover:bg-[#65AD24] active:scale-[0.98] border-b-4 border-[#4A8019] text-white font-display font-black text-base tracking-wide flex items-center justify-center gap-2 shadow-lg transition-transform cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current shrink-0" />
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
        <aside className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-5">
          {/* Card 1: Character & Audio Track Studio */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-extrabold text-white">
                  01. Voice Audio & Flyer Studio
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pick your jump voice audio clip (khizu, saad 1, saad 2) and character flyer.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestJumpAudio}
                className="px-3.5 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0"
              >
                <Volume2 className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap shrink-0">Test {activeVoice.name}</span>
              </button>
            </div>

            {/* Audio Track Selector */}
            <div>
              <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-amber-400" />
                <span>Jump Audio Recording:</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {(Object.keys(VOICE_AUDIOS) as VoiceAudioId[]).map((vId) => {
                  const opt = VOICE_AUDIOS[vId];
                  const isSelected = voiceAudioId === vId;
                  return (
                    <button
                      key={vId}
                      type="button"
                      onClick={() => handleChangeVoiceAudio(vId)}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400/15 border-amber-400 text-white shadow'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{opt.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                        {opt.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Flyer Character Grid */}
            <div>
              <div className="text-xs font-bold text-slate-300 mb-2">Select Flyer:</div>
              <div className="grid grid-cols-4 gap-2.5">
                {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => {
                  const char = CHARACTERS[id];
                  const isSelected = characterId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSelectCharacter(id)}
                      className={`p-2.5 rounded-xl border-2 transition-all flex flex-col items-center text-center cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400/10 border-amber-400'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <img
                        src={char.imageUrl}
                        alt={char.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-lg object-cover border border-white/15 bg-slate-800"
                      />
                      <div className="font-display font-bold text-xs text-white truncate max-w-full mt-1.5">
                        {char.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Voice Speed Controls */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Jump Voice Speed:</span>
              </div>
              <div className="flex items-center gap-2">
                {VOICE_SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.rate}
                    type="button"
                    onClick={() => handleChangeVoiceSpeed(opt.rate)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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

          {/* Card 2: Sky Theme & Physics Presets */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
            <h2 className="font-display text-xl font-extrabold text-white">
              02. Sky Theme & Physics Tuning
            </h2>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <button
                type="button"
                onClick={() => setTheme('day')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-colors cursor-pointer ${
                  theme === 'day'
                    ? 'bg-sky-500/15 border-sky-400 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-bold">Classic Daylight Sky</div>
                  <div className="text-xs text-slate-400">Turquoise horizon</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTheme('night')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-colors cursor-pointer ${
                  theme === 'night'
                    ? 'bg-indigo-500/15 border-indigo-400 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-5 h-5 text-indigo-300 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-bold">Starry Night City</div>
                  <div className="text-xs text-slate-400">Crescent moon</div>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mt-3">
              {(['chill', 'classic', 'turbo'] as DifficultyPreset[]).map((preset) => {
                const cfg = DIFFICULTIES[preset];
                const active = difficulty === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDifficulty(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-amber-400/15 border-amber-400 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{cfg.label}</span>
                      <span className="text-xs font-mono-num text-amber-400">
                        {bestScores[preset] || 0}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{cfg.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Recent Flight Log */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h2 className="font-display text-base font-extrabold text-white">
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
                  <span>Reset</span>
                </button>
              )}
            </div>

            {runHistory.length === 0 ? (
              <p className="text-xs text-slate-400 mt-2">
                No flights recorded yet. Tap the screen or press Spacebar to play!
              </p>
            ) : (
              <div className="mt-2 divide-y divide-slate-800/80">
                {runHistory.slice(0, 3).map((run) => (
                  <div
                    key={run.id}
                    className="py-1.5 flex items-center justify-between text-xs text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {CHARACTERS[run.characterId].name}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-300 font-bold">{run.voiceAudioId || 'khizu'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize text-slate-400">{run.difficulty}</span>
                    </div>
                    <div className="font-mono-num font-bold text-amber-400 text-xs">
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
          <div className="w-full rounded-t-3xl bg-slate-900 border-t border-slate-700 p-4 pb-7 space-y-3 shadow-2xl max-h-[85dvh] overflow-y-auto">
            <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto" />

            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold text-white">
                Customize Flyer & Audio
              </h3>
              <button
                type="button"
                onClick={() => setIsMobileCustomizeOpen(false)}
                className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audio Track Selector */}
            <div>
              <div className="text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-amber-400" />
                <span>Jump Audio Track:</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(VOICE_AUDIOS) as VoiceAudioId[]).map((vId) => {
                  const opt = VOICE_AUDIOS[vId];
                  const isSelected = voiceAudioId === vId;
                  return (
                    <button
                      key={vId}
                      type="button"
                      onClick={() => handleChangeVoiceAudio(vId)}
                      className={`min-h-[42px] px-2 py-1.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1 ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-slate-950 text-slate-300 border-slate-800'
                      }`}
                    >
                      <span>{opt.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Flyer Character Grid */}
            <div>
              <div className="text-xs font-bold text-slate-300 mb-1.5">Select Flyer:</div>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => {
                  const char = CHARACTERS[id];
                  const selected = characterId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSelectCharacter(id)}
                      className={`p-1.5 rounded-xl border-2 flex flex-col items-center text-center ${
                        selected
                          ? 'bg-amber-400/15 border-amber-400'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <img
                        src={char.imageUrl}
                        alt={char.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <span className="mt-1 text-[10px] font-bold text-white truncate max-w-full">
                        {char.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Voice Speed Selector */}
            <div>
              <div className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Jump Voice Speed:</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {VOICE_SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.rate}
                    type="button"
                    onClick={() => handleChangeVoiceSpeed(opt.rate)}
                    className={`min-h-[38px] rounded-xl border font-bold text-xs ${
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

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('day')}
                className={`min-h-[42px] rounded-xl border font-bold text-xs flex items-center justify-center gap-2 ${
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
                className={`min-h-[42px] rounded-xl border font-bold text-xs flex items-center justify-center gap-2 ${
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
                  className={`min-h-[40px] rounded-xl border font-bold text-xs capitalize ${
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
              className="w-full min-h-[46px] rounded-xl bg-[#73BF2E] text-white font-display font-black text-sm"
            >
              Done & Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
