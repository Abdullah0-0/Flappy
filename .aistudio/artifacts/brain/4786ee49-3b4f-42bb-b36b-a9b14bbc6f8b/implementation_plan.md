# Custom Flappy Bird Arcade

A faithful recreation of the classic Flappy Bird arcade game featuring custom sticker-style character portraits, instant-trigger custom voice audio on every jump, selectable day/night themes, difficulty presets, and ultra-responsive mobile touch and desktop controls.

## User Review & Critical Decisions

> [!IMPORTANT]
> The plan incorporates all of your confirmed preferences from the clarification phase:

- **Character Selection**: Players can pick between the two uploaded character photos ("Rose Crown" or "Side Profile") directly from the title menu or character customization drawer before starting a round, with automatic background transparency processing so the white sticker outlines look crisp in flight.
- **Instant Jump Audio**: Every jump or levitation immediately resets and triggers your uploaded audio clip (`/assets/aistudio/aud_1_4b4e40cd.ogg`) with zero overlap lag using Web Audio API buffer playback, accompanied by synthesized retro arcade chimes for scoring and collisions.
- **Day & Night Themes + Difficulty Presets**: Includes a toggle between Classic Daylight Sky and Starry Night Cityscape, plus three difficulty presets (Chill, Classic, and Turbo) that adjust pipe gap height and scroll speed.

---

## 1. Overview & Core Concept

- **What It Does**: Delivers the authentic physics, pipe-dodging tension, medal system, and retro pixel-arcade UI/UX of Flappy Bird, personalized with your two custom character photos and custom jump audio.
- **Target Audience / Persona**: Friends and players on mobile phones and desktop browsers looking for an instant, hilarious, and faithful arcade high-score challenge.
- **Key Value**: Combines genuine 60fps Flappy Bird gravity, rotation, and hitbox feel with personalized visuals and instant-restart audio that works seamlessly on mobile touchscreens.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Title & Customization Screen**: The player sees the animated scrolling parallax skyline and ground, the bobbing chosen character sprite in the center, and quick-select controls for Character Photo, Theme (Day / Night), and Difficulty (Chill / Classic / Turbo).
  2. **Get Ready State**: Tapping "Start Game" enters the classic "Get Ready! Tap to Fly" hover state where the character bobs gently until the first tap or Spacebar press.
  3. **Active Flight & Levitation**: Each screen tap, click, or Spacebar press propels the character upward, tilts the sprite nose-up, spawns feather/star burst particles, and plays the custom `.ogg` audio clip from the start (`0.0s`). Passing through green pipes increments the live big-number score at the top of the screen.
  4. **Collision & Game Over Scorecard**: Hitting a pipe or the ground triggers a brief screen flash, camera shake, and a classic slide-up Scorecard displaying Current Score, Best Score (with a "NEW" indicator when beaten), an earned Medal (Bronze, Silver, Gold, or Platinum), and instant "Play Again" or "Change Character" actions.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Nostalgic Pixel-Arcade meets Crisp Sticker Cutout Art.
  - *Color Palette & Mood*:
    - **Day Theme (60% Canvas)**: Classic Flappy sky (`#70C5CE`), distant mint cityscape silhouettes (`#A3E4D7`), scrolling dirt/grass ground (`#DED895` & `#73BF2E`).
    - **Night Theme (60% Canvas)**: Deep midnight indigo sky (`#1A2536`), lit city windows (`#2C3E50`), and twilight turf (`#4A7C59`).
    - **Structural Surfaces (30%)**: Warm vintage scoreboard parchment (`#DED895`) with crisp dark pixel borders (`#543847`) and shaded 3D retro pipe gradients (`#73BF2E` / `#558022`).
    - **Focal Accents (10%)**: Arcade action orange (`#E86101`), gold medal highlights (`#F59E0B`), and high-contrast white score numerals with thick drop shadows.
  - *Typography & Hierarchy*: Bold arcade display numerals (`Outfit` / `Plus Jakarta Sans` ExtraBold with crisp 2px pixel-style outlines and `tabular-nums`) for live scores and scoreboards, paired with clean readable labels for customization controls.
  - *Component Styling & Layout*:
    - **Mobile Viewport (`375px–430px`)**: Full-bleed `100dvh` interactive touch canvas with `touch-action: manipulation` and `user-select: none` so rapid thumb tapping never scrolls or zooms the browser. All interactive buttons meet $\ge 48 \times 48\text{px}$ touch targets positioned in the natural bottom thumb zone.
    - **Desktop Viewport (`1440px`)**: A balanced two-column arcade cabinet layout featuring the responsive game viewport alongside a clean Customization & High Score Locker panel (Character selector cards, Audio preview/mute toggle, Difficulty selector, and Session Run History).

- **Interactive Feedback & Motion**:
  - Authentic velocity-based sprite pitch rotation (tilting upward to $-25^\circ$ on jump, nose-diving up to $+70^\circ$ during freefall).
  - Screen flash and subtle horizontal shake on pipe collision.
  - Smooth slide-up transition ($\le 200\text{ms}$) for the Game Over medal scoreboard.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Low-Latency Web Audio API Buffer for Custom Jump Sound**
  - *Chosen Approach*: Decode `/assets/aistudio/aud_1_4b4e40cd.ogg` into an `AudioBuffer` via the Web Audio API (with an `HTMLAudioElement` fallback) so every tap spawns or restarts playback at `0s` with zero mobile browser decode delay.
  - *Why*: Mobile Safari and Chrome often throttle or delay repeated `<audio>` tag `.play()` calls during rapid tapping. Decoding into a memory buffer guarantees immediate playback on every single tap.
  - *Alternatives Considered*: Standard single `<audio>` element reset (`audio.currentTime = 0`), which is kept as a secondary fallback if Web Audio context is suspended.

- **Decision 2: Automatic Sticker Background Removal on Canvas**
  - *Chosen Approach*: Pre-process the two uploaded JPEG character images onto an offscreen canvas at load time to strip out the solid white outer background while preserving the crisp white sticker border around the person.
  - *Why*: Both uploaded photos are sticker-style cutouts saved as JPEGs with white corners. Stripping the outer white background makes the characters look like true transparent game sprites flying through the sky.
  - *Alternatives Considered*: Simple circular CSS clipping, which would crop out the distinctive rose crown and side-profile silhouette.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      App Shell & Responsive Layout                      │
│  (Full-Screen Touch Viewport on Mobile  |  Arcade + Locker on Desktop)  │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    ▼                                 ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│        HTML5 60FPS Game Canvas        │ │  Customization & HUD Overlay  │
│  ┌─────────────────────────────────┐  │ │  ┌─────────────────────────┐  │
│  │ Physics & Delta-Time Loop       │  │ │  │ Character Picker        │  │
│  │ • Gravity, Jump Velocity, Pitch │  │ │  │ • Photo 1 (Rose Crown)  │  │
│  │ • Pipe Spawner & Gap Logic      │  │ │  │ • Photo 2 (Side Profile)│  │
│  │ • Forgiving Circle-Rect Hitbox  │  │ │  ├─────────────────────────┤  │
│  └─────────────────────────────────┘  │ │  │ Theme & Difficulty      │  │
│  ┌─────────────────────────────────┐  │ │  │ • Day / Night Sky       │  │
│  │ Parallax & Sprite Renderer      │  │ │  │ • Chill / Classic /Pro  │  │
│  │ • Transparent Sticker Cutout    │  │ │  ├─────────────────────────┤  │
│  │ • Day/Night Skyline & Clouds    │  │ │  │ Game Over Scorecard     │  │
│  │ • 3D Shaded Pipes & Ground      │  │ │  │ • Score, Best & Medals  │  │
│  └─────────────────────────────────┘  │ │  └─────────────────────────┘  │
└───────────────────┬───────────────────┘ └───────────────┬───────────────┘
                    │                                     │
                    └──────────────────┬──────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                Audio & LocalStorage Persistence Manager                 │
│  • Custom Jump Audio Buffer (/assets/aistudio/aud_1_4b4e40cd.ogg)       │
│  • Synthesized Retro SFX (Point Scored, Pipe Hit, Medal Unlock)         │
│  • Persisted High Scores, Selected Character, Theme & Difficulty        │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `GameState`: `'MENU' | 'READY' | 'PLAYING' | 'DYING' | 'GAME_OVER'`
  - `CharacterId`: `'rose_crown' | 'side_profile'` mapping to the two uploaded assets in `/assets/aistudio/`.
  - `DifficultyPreset`: `'chill'` (wider pipe gap, gentler gravity), `'classic'` (authentic Flappy Bird physics), `'turbo'` (faster scroll speed, tighter gap).
  - `ThemeMode`: `'day' | 'night'`
  - `PersistedStats`: Best score per difficulty, total games played, medals unlocked, and selected customization preferences saved in `localStorage`.

- **Interactive Component & State Mapping**:
  - **Canvas Pointer/Keyboard Handler**: Listens to `pointerdown` (unified touch + mouse for zero 300ms delay on mobile) and `keydown` (`Space` / `ArrowUp`). In `'READY'` state, transitions to `'PLAYING'` and applies initial upward impulse; in `'PLAYING'` state, sets vertical velocity `vy = jumpStrength`, triggers the custom `.ogg` audio clip from `0s`, and emits jump particles.
  - **Character & Theme Customizer**: Clicking either character card immediately updates the active sprite on the live canvas and previews a gentle bounce animation. Toggling Day/Night or Difficulty updates the canvas environment and physics constants immediately.
  - **Audio Controller**: Includes a top-right Mute/Unmute toggle and a "Test Jump Sound" button in the customization drawer so players can preview the custom audio clip at any time.
