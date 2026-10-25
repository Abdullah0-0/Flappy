export type GameState = 'TITLE_MENU' | 'READY' | 'PLAYING' | 'DYING' | 'GAME_OVER';

export type CharacterId = 'rose_crown' | 'side_profile';

export type ThemeMode = 'day' | 'night';

export type DifficultyPreset = 'chill' | 'classic' | 'turbo';

export interface CharacterOption {
  id: CharacterId;
  name: string;
  tagline: string;
  imageUrl: string;
  aspectRatio: number;
}

export interface DifficultyConfig {
  id: DifficultyPreset;
  label: string;
  subtitle: string;
  gravity: number;
  jumpVelocity: number;
  pipeSpeed: number;
  pipeGap: number;
  pipeSpawnInterval: number;
}

export interface RunRecord {
  id: string;
  score: number;
  characterId: CharacterId;
  difficulty: DifficultyPreset;
  theme: ThemeMode;
  medal: MedalType;
  timestamp: string;
}

export type MedalType = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

export const CHARACTERS: Record<CharacterId, CharacterOption> = {
  rose_crown: {
    id: 'rose_crown',
    name: 'Rose Crown Legend',
    tagline: 'Front portrait with triple red roses & navy kurta',
    imageUrl: '/assets/aistudio/WhatsApp_Image_2026-10-20_at_9.03.49_PM_7522bded.jpeg',
    aspectRatio: 1,
  },
  side_profile: {
    id: 'side_profile',
    name: 'Aero Side Profile',
    tagline: 'Aerodynamic side-look fade & black collar',
    imageUrl: '/assets/aistudio/Screenshot_2026-10-20_232616_f1543745.jpg',
    aspectRatio: 1.15,
  },
};

export const DIFFICULTIES: Record<DifficultyPreset, DifficultyConfig> = {
  chill: {
    id: 'chill',
    label: 'Chill',
    subtitle: 'Generous pipe gaps & floatier jumps',
    gravity: 0.30,
    jumpVelocity: -6.9,
    pipeSpeed: 2.2,
    pipeGap: 205,
    pipeSpawnInterval: 118,
  },
  classic: {
    id: 'classic',
    label: 'Classic',
    subtitle: 'Balanced arcade physics & clear gaps',
    gravity: 0.36,
    jumpVelocity: -7.5,
    pipeSpeed: 2.6,
    pipeGap: 180,
    pipeSpawnInterval: 105,
  },
  turbo: {
    id: 'turbo',
    label: 'Turbo',
    subtitle: 'Fast scroll speed & athletic gaps',
    gravity: 0.43,
    jumpVelocity: -8.1,
    pipeSpeed: 3.25,
    pipeGap: 158,
    pipeSpawnInterval: 92,
  },
};

export const CUSTOM_JUMP_AUDIO_URL = '/assets/aistudio/aud_1_4b4e40cd.ogg';

export function getMedalForScore(score: number): MedalType {
  if (score >= 40) return 'platinum';
  if (score >= 25) return 'gold';
  if (score >= 12) return 'silver';
  if (score >= 5) return 'bronze';
  return 'none';
}
