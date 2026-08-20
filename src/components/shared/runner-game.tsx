"use client";

// A tiny Chrome-dino-style canvas runner — the "something interactive to do
// while you wait" the redesign asked for. Self-contained: no assets, no
// dependencies beyond canvas + rAF. Lives inside <AgentWaitingState> and is
// meant to entertain someone stuck on a multi-minute agent step, not to be
// a standalone game page.
//
// Theming ties back to the app rather than being a generic dino clone: the
// runner is the brand "spark" (matches the Sparkles mark in the sidebar),
// obstacles are little "gap" blocks — the same shape language as a
// GapCard's severity dot — so a screenshot of this still reads as
// Deck-less Pitch, not a stock arcade widget.
import { useCallback, useEffect, useRef, useState } from "react";

const WIDTH = 720;
const HEIGHT = 200;
const GROUND_Y = HEIGHT - 36;
const GRAVITY = 0.0022;
const JUMP_VELOCITY = -0.62;
const PLAYER_SIZE = 26;
const PLAYER_X = 56;
const HIGH_SCORE_KEY = "deckless-pitch:runner-high-score";

interface Obstacle {
  x: number;
  width: number;
  height: number;
}

type GameState = "idle" | "playing" | "over";

export function RunnerGame({ compact = false }: { compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState>("idle");
  const playerYRef = useRef(GROUND_Y - PLAYER_SIZE);
  const velocityRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const speedRef = useRef(0.32);
  const distanceRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const nextSpawnRef = useRef(900);

  const [display, setDisplay] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HIGH_SCORE_KEY);
      if (stored) setHighScore(Number(stored) || 0);
    } catch {
      // localStorage can throw in locked-down contexts — a missing high
      // score is a cosmetic loss, not worth surfacing an error for
    }
  }, []);

  const reset = useCallback(() => {
    playerYRef.current = GROUND_Y - PLAYER_SIZE;
    velocityRef.current = 0;
    obstaclesRef.current = [];
    speedRef.current = 0.32;
    distanceRef.current = 0;
    nextSpawnRef.current = 900;
    lastTsRef.current = null;
    setScore(0);
  }, []);

  const jump = useCallback(() => {
    if (stateRef.current === "idle" || stateRef.current === "over") {
      reset();
      stateRef.current = "playing";
      setDisplay("playing");
      return;
    }
    // Only jump from (near) the ground — no double-jumping into the void.
    if (playerYRef.current >= GROUND_Y - PLAYER_SIZE - 1) {
      velocityRef.current = JUMP_VELOCITY;
    }
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function drawFrame() {
      if (!ctx) return;
      const isDark = document.documentElement.classList.contains("dark");
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // ground
      ctx.strokeStyle = isDark ? "#35353c" : "#d4d4d9";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(WIDTH, GROUND_Y);
      ctx.stroke();

      // player — a rounded "spark" square with a little glow, matching the
      // sidebar logo mark rather than a generic pixel dinosaur
      const py = playerYRef.current;
      const grad = ctx.createLinearGradient(PLAYER_X, py, PLAYER_X + PLAYER_SIZE, py + PLAYER_SIZE);
      grad.addColorStop(0, "#8b5cf6");
      grad.addColorStop(1, "#06b6d4");
      ctx.fillStyle = grad;
      const r = 7;
      ctx.beginPath();
      ctx.roundRect(PLAYER_X, py, PLAYER_SIZE, PLAYER_SIZE, r);
      ctx.fill();

      // obstacles — "gap" blocks
      ctx.fillStyle = isDark ? "#fb7185" : "#e11d48";
      for (const o of obstaclesRef.current) {
        ctx.beginPath();
        ctx.roundRect(o.x, GROUND_Y - o.height, o.width, o.height, 4);
        ctx.fill();
      }

      if (stateRef.current !== "playing") {
        ctx.fillStyle = isDark ? "rgba(250,250,250,0.9)" : "rgba(24,24,27,0.85)";
        ctx.font = "600 15px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          stateRef.current === "over" ? "Hit a gap — tap or press space to try again" : "Tap or press space to play",
          WIDTH / 2,
          HEIGHT / 2
        );
      }
    }

    function tick(ts: number) {
      if (stateRef.current !== "playing") {
        drawFrame();
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const last = lastTsRef.current ?? ts;
      const dt = Math.min(ts - last, 48);
      lastTsRef.current = ts;

      velocityRef.current += GRAVITY * dt;
      playerYRef.current = Math.min(GROUND_Y - PLAYER_SIZE, playerYRef.current + velocityRef.current * dt);
      if (playerYRef.current > GROUND_Y - PLAYER_SIZE) playerYRef.current = GROUND_Y - PLAYER_SIZE;

      speedRef.current = Math.min(0.72, speedRef.current + 0.00002 * dt);
      distanceRef.current += speedRef.current * dt;
      nextSpawnRef.current -= dt;

      if (nextSpawnRef.current <= 0) {
        const height = 22 + Math.random() * 22;
        obstaclesRef.current.push({ x: WIDTH + 10, width: 16 + Math.random() * 10, height });
        nextSpawnRef.current = 700 + Math.random() * 700 - speedRef.current * 400;
      }

      for (const o of obstaclesRef.current) o.x -= speedRef.current * dt;
      obstaclesRef.current = obstaclesRef.current.filter((o) => o.x + o.width > -10);

      const playerBox = { x: PLAYER_X + 3, y: playerYRef.current + 3, w: PLAYER_SIZE - 6, h: PLAYER_SIZE - 6 };
      for (const o of obstaclesRef.current) {
        const obsBox = { x: o.x, y: GROUND_Y - o.height, w: o.width, h: o.height };
        const hit =
          playerBox.x < obsBox.x + obsBox.w &&
          playerBox.x + playerBox.w > obsBox.x &&
          playerBox.y < obsBox.y + obsBox.h &&
          playerBox.y + playerBox.h > obsBox.y;
        if (hit) {
          stateRef.current = "over";
          setDisplay("over");
          const finalScore = Math.floor(distanceRef.current / 10);
          setScore(finalScore);
          if (finalScore > highScore) {
            setHighScore(finalScore);
            try {
              window.localStorage.setItem(HIGH_SCORE_KEY, String(finalScore));
            } catch {
              // best-effort persistence only
            }
          }
          break;
        }
      }

      if (stateRef.current === "playing") setScore(Math.floor(distanceRef.current / 10));

      drawFrame();
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

  return (
    <div className={compact ? "" : "mx-auto max-w-2xl"}>
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>Score: <span className="font-semibold text-foreground">{score}</span></span>
        <span>Best: <span className="font-semibold text-foreground">{highScore}</span></span>
      </div>
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onClick={jump}
        role="button"
        aria-label={display === "playing" ? "Jump" : "Start the waiting-room runner game"}
        tabIndex={0}
        className="w-full cursor-pointer touch-manipulation rounded-xl border border-border bg-surface-2"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
      />
      <p className="mt-2 text-center text-[11px] text-subtle">Space / tap to jump — dodge the gaps while the agent works</p>
    </div>
  );
}
