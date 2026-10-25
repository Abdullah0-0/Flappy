import React from 'react';
import { Award, RotateCcw, Sparkles, Trophy, UserCheck, Volume2 } from 'lucide-react';
import {
  CHARACTERS,
  CharacterId,
  DIFFICULTIES,
  DifficultyPreset,
  MedalType,
  getMedalForScore,
} from '../types/game';

interface ScoreboardModalProps {
  score: number;
  bestScore: number;
  isNewBest: boolean;
  characterId: CharacterId;
  difficulty: DifficultyPreset;
  onPlayAgain: () => void;
  onOpenCustomize: () => void;
  onTestAudio: () => void;
}

const MEDAL_STYLES: Record<
  MedalType,
  { label: string; bg: string; ring: string; text: string }
> = {
  none: {
    label: 'Keep Flying',
    bg: 'bg-slate-800/70',
    ring: 'border-slate-600',
    text: 'text-slate-400',
  },
  bronze: {
    label: 'Bronze Medal',
    bg: 'bg-gradient-to-br from-amber-700 via-orange-600 to-amber-900',
    ring: 'border-amber-400',
    text: 'text-amber-200',
  },
  silver: {
    label: 'Silver Medal',
    bg: 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600',
    ring: 'border-white',
    text: 'text-white',
  },
  gold: {
    label: 'Gold Medal',
    bg: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600',
    ring: 'border-yellow-200',
    text: 'text-yellow-100',
  },
  platinum: {
    label: 'Platinum Legend',
    bg: 'bg-gradient-to-br from-cyan-200 via-sky-400 to-indigo-600',
    ring: 'border-cyan-100',
    text: 'text-cyan-50',
  },
};

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  score,
  bestScore,
  isNewBest,
  characterId,
  difficulty,
  onPlayAgain,
  onOpenCustomize,
  onTestAudio,
}) => {
  const medal = getMedalForScore(score);
  const medalStyle = MEDAL_STYLES[medal];
  const character = CHARACTERS[characterId];
  const diffConfig = DIFFICULTIES[difficulty];

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-4 sm:p-5 bg-slate-950/60 backdrop-blur-[3px] animate-in fade-in duration-150">
      {/* Top Game Over Banner */}
      <div className="mt-4 text-center">
        <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight text-white arcade-score-shadow">
          GAME OVER
        </h2>
        <p className="mt-1 text-xs font-medium text-amber-200/90">
          {character.name} · {diffConfig.label} Mode
        </p>
      </div>

      {/* Classic Parchment Scorecard */}
      <div className="w-full max-w-[330px] rounded-2xl bg-[#DED895] border-4 border-[#543847] shadow-2xl p-4 text-[#543847]">
        <div className="grid grid-cols-2 gap-3 items-center">
          {/* Left: Medal & Character Avatar */}
          <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#D0C874]/70 border-2 border-[#B5AD5E]">
            <div className="relative">
              <div
                className={`w-16 h-16 rounded-full border-2 ${medalStyle.ring} ${medalStyle.bg} flex items-center justify-center shadow-inner overflow-hidden`}
              >
                <img
                  src={character.imageUrl}
                  alt={character.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 object-cover rounded-full"
                />
              </div>
              {medal !== 'none' && (
                <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#E86101] text-white flex items-center justify-center border-2 border-[#543847] shadow">
                  <Award className="w-4 h-4" />
                </span>
              )}
            </div>
            <span className="mt-2 text-xs font-extrabold tracking-tight text-center text-[#543847]">
              {medalStyle.label}
            </span>
          </div>

          {/* Right: Score & Best Score */}
          <div className="flex flex-col justify-between text-right space-y-2.5 px-1">
            <div>
              <div className="text-xs font-extrabold text-[#E86101]">Score</div>
              <div className="font-display text-3xl font-black text-white arcade-text-shadow font-mono-num leading-none mt-0.5">
                {score}
              </div>
            </div>

            <div className="pt-2 border-t border-[#B5AD5E]">
              <div className="flex items-center justify-end gap-1.5">
                {isNewBest && (
                  <span className="px-1.5 py-0.5 text-[10px] font-black bg-[#E86101] text-white rounded">
                    NEW
                  </span>
                )}
                <span className="text-xs font-extrabold text-[#E86101]">Best</span>
              </div>
              <div className="font-display text-3xl font-black text-white arcade-text-shadow font-mono-num leading-none mt-0.5">
                {bestScore}
              </div>
            </div>
          </div>
        </div>

        {/* Audio Replay Trigger inside Scorecard */}
        <button
          type="button"
          onClick={onTestAudio}
          className="mt-3 w-full min-h-[40px] py-1.5 px-3 rounded-xl bg-[#C5BD68] hover:bg-[#B8B05B] active:scale-[0.99] border border-[#9E9647] flex items-center justify-center gap-2 text-xs font-bold text-[#422B37] transition-transform cursor-pointer"
        >
          <Volume2 className="w-4 h-4 shrink-0 text-[#E86101]" />
          <span className="whitespace-nowrap shrink-0">Replay Jump Voice Clip</span>
        </button>
      </div>

      {/* Bottom Thumb-Zone Action Buttons (>= 48px touch targets) */}
      <div className="w-full max-w-[330px] space-y-2.5 mb-2">
        <button
          type="button"
          onClick={onPlayAgain}
          className="w-full min-h-[52px] px-5 py-3 rounded-xl bg-[#73BF2E] hover:bg-[#65AD24] active:scale-[0.98] border-b-4 border-[#4A8019] text-white font-display font-black text-lg tracking-wide flex items-center justify-center gap-2 shadow-lg transition-transform cursor-pointer"
        >
          <RotateCcw className="w-5 h-5 shrink-0" />
          <span className="whitespace-nowrap shrink-0">Play Again</span>
        </button>

        <button
          type="button"
          onClick={onOpenCustomize}
          className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-[0.98] border border-slate-700 text-slate-100 font-semibold text-sm flex items-center justify-center gap-2 transition-transform cursor-pointer"
        >
          <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="whitespace-nowrap shrink-0">Switch Flyer or Settings</span>
        </button>
      </div>
    </div>
  );
};
