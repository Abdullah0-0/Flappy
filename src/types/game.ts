export type GameState = 'TITLE_MENU' | 'READY' | 'PLAYING' | 'DYING' | 'GAME_OVER';

export type CharacterId = 'glasses_side' | 'rose_crown' | 'side_profile' | 'classic_portrait';

export type VoiceAudioId = 'saad_1' | 'khizu' | 'saad_2';

export type ThemeMode = 'day' | 'night';

export type DifficultyPreset = 'chill' | 'classic' | 'turbo';

export interface CharacterOption {
  id: CharacterId;
  name: string;
  tagline: string;
  imageUrl: string;
  aspectRatio: number;
}

export interface VoiceAudioOption {
  id: VoiceAudioId;
  name: string;
  label: string;
  url: string;
  description: string;
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
  voiceAudioId: VoiceAudioId;
  difficulty: DifficultyPreset;
  theme: ThemeMode;
  medal: MedalType;
  timestamp: string;
}

export type MedalType = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

export const CHARACTERS: Record<CharacterId, CharacterOption> = {
  glasses_side: {
    id: 'glasses_side',
    name: 'Spectacle Aviator',
    tagline: 'Black-frame glasses cutout look',
    imageUrl: '/assets/aistudio/WhatsApp_Image_2026-10-23_at_11.40.41_PM-removebg-preview_483f029d.png',
    aspectRatio: 0.85,
  },
  rose_crown: {
    id: 'rose_crown',
    name: 'Rose Crown Legend',
    tagline: 'Triple red roses & navy kurta',
    imageUrl: '/assets/aistudio/WhatsApp_Image_2026-10-20_at_9.03.49_PM_7522bded.jpeg',
    aspectRatio: 1,
  },
  side_profile: {
    id: 'side_profile',
    name: 'Aero Side Profile',
    tagline: 'Aerodynamic side fade silhouette',
    imageUrl: '/assets/aistudio/Screenshot_2026-10-20_232616_f1543745.jpg',
    aspectRatio: 1.15,
  },
  classic_portrait: {
    id: 'classic_portrait',
    name: 'Cafe Aviator',
    tagline: 'Casual cafe portrait badge',
    imageUrl: '/assets/aistudio/WhatsApp_Image_2026-10-23_at_11.38.00_PM_bb46b673.jpeg',
    aspectRatio: 1,
  },
};

export const VOICE_AUDIOS: Record<VoiceAudioId, VoiceAudioOption> = {
  saad_1: {
    id: 'saad_1',
    name: 'saad 1',
    label: 'saad 1 (Default)',
    url: '/assets/aistudio/saad_1_7a3f2b89.ogg',
    description: 'Saad exclamation clip 1',
  },
  khizu: {
    id: 'khizu',
    name: 'khizu',
    label: 'khizu',
    url: '/assets/aistudio/aud_2_4338bced.ogg',
    description: 'Iconic infectious laughter clip',
  },
  saad_2: {
    id: 'saad_2',
    name: 'saad 2',
    label: 'saad 2',
    url: '/assets/aistudio/saad_3_6009ec18.ogg',
    description: 'Saad punchy callout clip 2',
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

export function getMedalForScore(score: number): MedalType {
  if (score >= 40) return 'platinum';
  if (score >= 25) return 'gold';
  if (score >= 12) return 'silver';
  if (score >= 5) return 'bronze';
  return 'none';
}
