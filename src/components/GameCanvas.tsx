import React, { useEffect, useRef, useCallback } from 'react';
import {
  CHARACTERS,
  CharacterId,
  DIFFICULTIES,
  DifficultyPreset,
  GameState,
  ThemeMode,
} from '../types/game';
import { createStickerCutoutSprite } from '../utils/spriteProcessor';
import { soundEngine } from '../utils/soundEngine';

interface GameCanvasProps {
  gameState: GameState;
  characterId: CharacterId;
  theme: ThemeMode;
  difficulty: DifficultyPreset;
  score: number;
  onStartReady: () => void;
  onBeginPlaying: () => void;
  onScoreIncrement: () => void;
  onGameOver: (finalScore: number) => void;
}

interface PipeObstacle {
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

const LOGICAL_WIDTH = 400;
const LOGICAL_HEIGHT = 640;
const GROUND_HEIGHT = 92;
const PLAYABLE_HEIGHT = LOGICAL_HEIGHT - GROUND_HEIGHT;
const PIPE_WIDTH = 48; // Slim, classic Flappy Bird pipe width
const PIPE_LIP_HEIGHT = 22;
const BIRD_X = 108;
const BIRD_RADIUS = 18; // Compact, forgiving collision circle matching visual sprite
const BIRD_DRAW_SIZE = 56; // Balanced sticker size that fits comfortably through pipe gaps

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  characterId,
  theme,
  difficulty,
  score,
  onBeginPlaying,
  onScoreIncrement,
  onGameOver,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spritesRef = useRef<Partial<Record<CharacterId, HTMLCanvasElement>>>({});

  // Mutable simulation state inside requestAnimationFrame
  const simRef = useRef({
    birdY: PLAYABLE_HEIGHT * 0.46,
    birdVy: 0,
    birdRotation: 0,
    groundScroll: 0,
    skylineScroll: 0,
    cloudScroll: 0,
    frameTick: 0,
    pipes: [] as PipeObstacle[],
    particles: [] as Particle[],
    flashOpacity: 0,
    shakeTicks: 0,
    liveScore: 0,
    wingBobPhase: 0,
  });

  // Preload & process both sticker character sprites
  useEffect(() => {
    let isMounted = true;
    (Object.keys(CHARACTERS) as CharacterId[]).forEach((id) => {
      createStickerCutoutSprite(CHARACTERS[id].imageUrl)
        .then((canvasSprite) => {
          if (isMounted) {
            spritesRef.current[id] = canvasSprite;
          }
        })
        .catch(() => {
          // Ignore error; fallback image draw is handled
        });
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Reset simulation physics when entering TITLE_MENU or READY
  useEffect(() => {
    if (gameState === 'TITLE_MENU' || gameState === 'READY') {
      simRef.current.birdY = PLAYABLE_HEIGHT * 0.45;
      simRef.current.birdVy = 0;
      simRef.current.birdRotation = 0;
      simRef.current.pipes = [];
      simRef.current.particles = [];
      simRef.current.flashOpacity = 0;
      simRef.current.shakeTicks = 0;
      simRef.current.liveScore = 0;
      simRef.current.frameTick = 0;
    }
  }, [gameState]);

  const spawnJumpParticles = (x: number, y: number) => {
    const colors =
      characterId === 'rose_crown'
        ? ['#E11D48', '#FB7185', '#FFFFFF', '#FDE047']
        : ['#38BDF8', '#FFFFFF', '#F59E0B', '#E2E8F0'];

    for (let i = 0; i < 9; i++) {
      const angle = Math.PI * 0.65 + (Math.random() - 0.5) * 1.3;
      const speed = 1.6 + Math.random() * 2.8;
      simRef.current.particles.push({
        x: x - 12,
        y: y + 8,
        vx: Math.cos(angle) * speed - 1.2,
        vy: Math.sin(angle) * speed * 0.6,
        size: 3.5 + Math.random() * 4,
        alpha: 1,
        color: colors[i % colors.length],
      });
    }
  };

  const triggerFlap = useCallback(() => {
    const diffConfig = DIFFICULTIES[difficulty];

    if (gameState === 'READY') {
      onBeginPlaying();
      simRef.current.birdVy = diffConfig.jumpVelocity;
      simRef.current.birdRotation = -0.42;
      spawnJumpParticles(BIRD_X, simRef.current.birdY);
      soundEngine.playJumpSound();
      return;
    }

    if (gameState === 'PLAYING') {
      simRef.current.birdVy = diffConfig.jumpVelocity;
      simRef.current.birdRotation = -0.45;
      spawnJumpParticles(BIRD_X, simRef.current.birdY);
      soundEngine.playJumpSound();
    }
  }, [difficulty, gameState, onBeginPlaying, characterId]);

  // Keyboard controls (Space / ArrowUp / W)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (gameState === 'READY' || gameState === 'PLAYING') {
          e.preventDefault();
          triggerFlap();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, triggerFlap]);

  // Main 60FPS delta-normalized requestAnimationFrame loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const triggerCollision = () => {
      simRef.current.flashOpacity = 0.85;
      simRef.current.shakeTicks = 12;
      soundEngine.playCollisionSound();
      onGameOver(simRef.current.liveScore);
    };

    const renderFrame = (now: number) => {
      const rawDt = (now - lastTime) / 16.6667;
      const dt = Math.min(Math.max(rawDt, 0.2), 2.5);
      lastTime = now;

      const s = simRef.current;
      const diff = DIFFICULTIES[difficulty];

      // 1. Update parallax & physics
      if (gameState === 'TITLE_MENU' || gameState === 'READY') {
        s.groundScroll = (s.groundScroll + diff.pipeSpeed * dt) % 24;
        s.skylineScroll = (s.skylineScroll + diff.pipeSpeed * 0.25 * dt) % LOGICAL_WIDTH;
        s.cloudScroll = (s.cloudScroll + diff.pipeSpeed * 0.12 * dt) % LOGICAL_WIDTH;
        s.wingBobPhase += 0.08 * dt;
        s.birdY = PLAYABLE_HEIGHT * 0.44 + Math.sin(s.wingBobPhase) * 9;
        s.birdRotation = Math.sin(s.wingBobPhase * 0.8) * 0.06;
      } else if (gameState === 'PLAYING') {
        s.groundScroll = (s.groundScroll + diff.pipeSpeed * dt) % 24;
        s.skylineScroll = (s.skylineScroll + diff.pipeSpeed * 0.25 * dt) % LOGICAL_WIDTH;
        s.cloudScroll = (s.cloudScroll + diff.pipeSpeed * 0.12 * dt) % LOGICAL_WIDTH;

        // Bird physics
        s.birdVy += diff.gravity * dt;
        s.birdY += s.birdVy * dt;

        // Clamp top ceiling
        if (s.birdY < BIRD_RADIUS + 6) {
          s.birdY = BIRD_RADIUS + 6;
          s.birdVy = 0;
        }

        // Authentic Flappy Bird pitch rotation
        if (s.birdVy < 0) {
          s.birdRotation = Math.max(-0.44, s.birdRotation - 0.12 * dt);
        } else {
          s.birdRotation = Math.min(Math.PI * 0.42, s.birdRotation + 0.048 * dt);
        }

        // Spawn pipes
        s.frameTick += dt;
        if (s.frameTick >= diff.pipeSpawnInterval) {
          s.frameTick = 0;
          const minTop = 68;
          const maxTop = PLAYABLE_HEIGHT - diff.pipeGap - 84;
          const topHeight = Math.floor(minTop + Math.random() * Math.max(40, maxTop - minTop));
          s.pipes.push({
            x: LOGICAL_WIDTH + 20,
            topHeight,
            bottomY: topHeight + diff.pipeGap,
            passed: false,
          });
        }

        // Move pipes & check collisions
        for (let i = s.pipes.length - 1; i >= 0; i--) {
          const p = s.pipes[i];
          p.x -= diff.pipeSpeed * dt;

          // Score check when passing center of pipe
          if (!p.passed && p.x + PIPE_WIDTH < BIRD_X) {
            p.passed = true;
            s.liveScore += 1;
            soundEngine.playScoreSound();
            onScoreIncrement();
          }

          // Forgiving circle-to-AABB pipe collision
          const hitRadius = BIRD_RADIUS - 3;
          const withinPipeX =
            BIRD_X + hitRadius > p.x + 4 && BIRD_X - hitRadius < p.x + PIPE_WIDTH - 4;
          if (withinPipeX) {
            const hitTopPipe = s.birdY - hitRadius < p.topHeight;
            const hitBottomPipe = s.birdY + hitRadius > p.bottomY;
            if (hitTopPipe || hitBottomPipe) {
              triggerCollision();
              break;
            }
          }

          // Remove off-screen pipes
          if (p.x < -PIPE_WIDTH - 20) {
            s.pipes.splice(i, 1);
          }
        }

        // Ground collision check
        if (s.birdY + BIRD_RADIUS >= PLAYABLE_HEIGHT) {
          s.birdY = PLAYABLE_HEIGHT - BIRD_RADIUS;
          triggerCollision();
        }
      } else if (gameState === 'GAME_OVER') {
        // Continue falling to the ground if hit high up on a pipe
        if (s.birdY + BIRD_RADIUS < PLAYABLE_HEIGHT) {
          s.birdVy += diff.gravity * 1.15 * dt;
          s.birdY = Math.min(PLAYABLE_HEIGHT - BIRD_RADIUS, s.birdY + s.birdVy * dt);
          s.birdRotation = Math.min(Math.PI * 0.48, s.birdRotation + 0.09 * dt);
        }
      }

      // Update jump particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.alpha -= 0.035 * dt;
        if (pt.alpha <= 0) {
          s.particles.splice(i, 1);
        }
      }

      if (s.flashOpacity > 0) {
        s.flashOpacity = Math.max(0, s.flashOpacity - 0.08 * dt);
      }
      if (s.shakeTicks > 0) {
        s.shakeTicks = Math.max(0, s.shakeTicks - dt);
      }

      // 2. Render Scene
      ctx.save();
      if (s.shakeTicks > 0) {
        const dx = (Math.random() - 0.5) * 9;
        const dy = (Math.random() - 0.5) * 9;
        ctx.translate(dx, dy);
      }

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, PLAYABLE_HEIGHT);
      if (theme === 'day') {
        skyGrad.addColorStop(0, '#4EC0CA');
        skyGrad.addColorStop(0.75, '#70C5CE');
        skyGrad.addColorStop(1, '#B4E8EE');
      } else {
        skyGrad.addColorStop(0, '#0F172A');
        skyGrad.addColorStop(0.7, '#1E293B');
        skyGrad.addColorStop(1, '#334155');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, LOGICAL_WIDTH, PLAYABLE_HEIGHT);

      // Night Stars & Moon
      if (theme === 'night') {
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(320, 82, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(310, 76, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        const starCoords = [
          [42, 54], [95, 110], [150, 44], [210, 92], [265, 50],
          [60, 175], [180, 150], [350, 145], [125, 78], [290, 125],
        ];
        starCoords.forEach(([sx, sy], idx) => {
          const r = idx % 2 === 0 ? 2 : 1.5;
          ctx.fillRect(sx, sy, r, r);
        });
      }

      // Parallax Cloud Layer
      ctx.fillStyle = theme === 'day' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(148, 163, 184, 0.18)';
      for (let pass = 0; pass < 2; pass++) {
        const baseX = pass * LOGICAL_WIDTH - s.cloudScroll;
        const clouds = [
          { x: 40, y: PLAYABLE_HEIGHT - 135, r: 28 },
          { x: 68, y: PLAYABLE_HEIGHT - 145, r: 34 },
          { x: 100, y: PLAYABLE_HEIGHT - 132, r: 26 },
          { x: 230, y: PLAYABLE_HEIGHT - 140, r: 30 },
          { x: 264, y: PLAYABLE_HEIGHT - 152, r: 38 },
          { x: 300, y: PLAYABLE_HEIGHT - 136, r: 28 },
        ];
        clouds.forEach((c) => {
          ctx.beginPath();
          ctx.arc(baseX + c.x, c.y, c.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Parallax Cityscape Silhouette
      for (let pass = 0; pass < 2; pass++) {
        const baseX = pass * LOGICAL_WIDTH - s.skylineScroll;
        const buildings = [
          { x: 0, w: 46, h: 86 },
          { x: 44, w: 38, h: 118 },
          { x: 80, w: 54, h: 74 },
          { x: 132, w: 42, h: 105 },
          { x: 172, w: 58, h: 64 },
          { x: 228, w: 46, h: 124 },
          { x: 272, w: 50, h: 88 },
          { x: 320, w: 40, h: 108 },
          { x: 358, w: 44, h: 78 },
        ];
        buildings.forEach((b, bIdx) => {
          ctx.fillStyle = theme === 'day' ? '#8EDCE6' : '#1E293B';
          ctx.fillRect(baseX + b.x, PLAYABLE_HEIGHT - b.h, b.w, b.h);
          ctx.strokeStyle = theme === 'day' ? '#67B7C1' : '#334155';
          ctx.lineWidth = 2;
          ctx.strokeRect(baseX + b.x, PLAYABLE_HEIGHT - b.h, b.w, b.h);

          // Subtle lit windows at night
          if (theme === 'night' && bIdx % 2 === 1) {
            ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
            for (let wy = PLAYABLE_HEIGHT - b.h + 12; wy < PLAYABLE_HEIGHT - 24; wy += 16) {
              ctx.fillRect(baseX + b.x + 8, wy, 6, 8);
              ctx.fillRect(baseX + b.x + 20, wy, 6, 8);
            }
          }
        });
      }

      // Bush / Hedge Foreground Trim
      ctx.fillStyle = theme === 'day' ? '#5EEAD4' : '#0F766E';
      for (let bx = -20; bx < LOGICAL_WIDTH + 40; bx += 36) {
        ctx.beginPath();
        ctx.arc(bx - (s.skylineScroll * 0.5) % 36, PLAYABLE_HEIGHT, 24, Math.PI, 0);
        ctx.fill();
      }

      // 3. Draw 3D Retro Shaded Pipes
      const drawRetroPipe = (x: number, y: number, w: number, h: number, isTop: boolean) => {
        if (h <= 0) return;
        const pipeGrad = ctx.createLinearGradient(x, 0, x + w, 0);
        if (theme === 'day') {
          pipeGrad.addColorStop(0, '#558022');
          pipeGrad.addColorStop(0.18, '#9CE659');
          pipeGrad.addColorStop(0.45, '#73BF2E');
          pipeGrad.addColorStop(0.82, '#558022');
          pipeGrad.addColorStop(1, '#3A5A14');
        } else {
          pipeGrad.addColorStop(0, '#14532D');
          pipeGrad.addColorStop(0.2, '#4ADE80');
          pipeGrad.addColorStop(0.5, '#22C55E');
          pipeGrad.addColorStop(0.85, '#15803D');
          pipeGrad.addColorStop(1, '#052E16');
        }

        // Main pipe shaft
        ctx.fillStyle = pipeGrad;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#2B1D24';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        // Pipe rim / collar lip
        const lipX = x - 4;
        const lipW = w + 8;
        const lipY = isTop ? y + h - PIPE_LIP_HEIGHT : y;
        ctx.fillStyle = pipeGrad;
        ctx.fillRect(lipX, lipY, lipW, PIPE_LIP_HEIGHT);
        ctx.strokeRect(lipX, lipY, lipW, PIPE_LIP_HEIGHT);

        // Specular highlight stripe
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.fillRect(x + 10, y + 2, 6, Math.max(0, h - 4));
      };

      s.pipes.forEach((p) => {
        drawRetroPipe(p.x, 0, PIPE_WIDTH, p.topHeight, true);
        drawRetroPipe(
          p.x,
          p.bottomY,
          PIPE_WIDTH,
          PLAYABLE_HEIGHT - p.bottomY,
          false
        );
      });

      // 4. Draw Scrolling Classic Ground
      const groundY = PLAYABLE_HEIGHT;
      // Top grass border strip
      ctx.fillStyle = theme === 'day' ? '#73BF2E' : '#15803D';
      ctx.fillRect(0, groundY, LOGICAL_WIDTH, 18);

      // Diagonal chevron stripes on grass strip
      ctx.fillStyle = theme === 'day' ? '#9CE659' : '#22C55E';
      for (let gx = -24; gx < LOGICAL_WIDTH + 24; gx += 24) {
        const offsetGx = gx - s.groundScroll;
        ctx.beginPath();
        ctx.moveTo(offsetGx, groundY + 3);
        ctx.lineTo(offsetGx + 12, groundY + 3);
        ctx.lineTo(offsetGx + 4, groundY + 15);
        ctx.lineTo(offsetGx - 8, groundY + 15);
        ctx.closePath();
        ctx.fill();
      }

      // Dark pixel divider borders
      ctx.fillStyle = '#2B1D24';
      ctx.fillRect(0, groundY, LOGICAL_WIDTH, 3);
      ctx.fillRect(0, groundY + 18, LOGICAL_WIDTH, 3);

      // Dirt base
      ctx.fillStyle = theme === 'day' ? '#DED895' : '#334155';
      ctx.fillRect(0, groundY + 21, LOGICAL_WIDTH, GROUND_HEIGHT - 21);

      // Subtle dirt texture pebbles
      ctx.fillStyle = theme === 'day' ? '#D0C874' : '#1E293B';
      for (let px = -24; px < LOGICAL_WIDTH + 24; px += 24) {
        const ox = px - s.groundScroll;
        ctx.fillRect(ox + 4, groundY + 32, 6, 4);
        ctx.fillRect(ox + 14, groundY + 48, 8, 4);
      }

      // 5. Draw Jump Particles
      s.particles.forEach((pt) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 6. Draw Custom Character Sticker Sprite
      ctx.save();
      ctx.translate(BIRD_X, s.birdY);
      ctx.rotate(s.birdRotation);

      const activeSprite = spritesRef.current[characterId];
      if (activeSprite) {
        const aspect = activeSprite.width / activeSprite.height;
        const drawH = BIRD_DRAW_SIZE;
        const drawW = drawH * aspect;

        // Subtle drop shadow so the sticker pops against both day & night skies
        ctx.shadowColor = 'rgba(15, 23, 42, 0.45)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;

        ctx.drawImage(activeSprite, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        // Fallback while offscreen sprite loads
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 7. Collision Screen Flash
      if (s.flashOpacity > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.flashOpacity})`;
        ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(renderFrame);
    };

    animationFrameId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [characterId, difficulty, gameState, onGameOver, onScoreIncrement, theme]);

  // Unified pointer handler for zero-delay mobile touch and desktop click
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (gameState === 'READY' || gameState === 'PLAYING') {
      triggerFlap();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={LOGICAL_WIDTH}
      height={LOGICAL_HEIGHT}
      onPointerDown={handlePointerDown}
      className="w-full h-full block select-none touch-manipulation cursor-pointer"
      aria-label="Flappy Bird Custom Arcade Canvas"
    />
  );
};
