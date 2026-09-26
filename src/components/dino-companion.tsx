import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type DinoMood = "idle" | "wave" | "celebrate" | "think" | "sleep" | "shy";

const POSES: Record<DinoMood, string> = {
  idle: "/dino/idle.webp?v=7",
  wave: "/dino/wave.webp?v=7",
  celebrate: "/dino/celebrate.webp?v=7",
  think: "/dino/think.webp?v=7",
  sleep: "/dino/sleep.webp?v=7",
  shy: "/dino/shy.webp?v=7",
};

const MOODS = Object.keys(POSES) as DinoMood[];

type Props = {
  mood: DinoMood;
  message: string;
  onPet: () => void;
  size?: "sm" | "md";
  bottomInset?: number;
};

export function DinoCompanion({ mood, message, onPet, size = "md", bottomInset = 108 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const userMoved = useRef(false);
  const pos = useRef<{ x: number; y: number } | null>(null);
  const tilt = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const [mounted, setMounted] = useState<DinoMood[]>(["idle"]);

  useEffect(() => {
    setMounted((prev) => (prev.includes(mood) ? prev : [...prev, mood]));
  }, [mood]);

  const applyPos = useCallback(() => {
    const el = wrapRef.current;
    if (!el || !pos.current) return;
    el.style.left = `${pos.current.x}px`;
    el.style.top = `${pos.current.y}px`;
    el.style.right = "auto";
    el.style.bottom = "auto";
  }, []);

  const placeDefault = useCallback(() => {
    const el = wrapRef.current;
    if (!el || dragging.current || userMoved.current) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (w < 32 || h < 32) return;
    pos.current = {
      x: Math.max(8, window.innerWidth - w - 10),
      y: Math.max(8, window.innerHeight - h - bottomInset),
    };
    applyPos();
  }, [applyPos, bottomInset]);

  useEffect(() => {
    placeDefault();
    window.addEventListener("resize", placeDefault);
    return () => window.removeEventListener("resize", placeDefault);
  }, [placeDefault]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      tilt.current.x += (target.current.x - tilt.current.x) * 0.14;
      tilt.current.y += (target.current.y - tilt.current.y) * 0.14;
      const el = spriteRef.current;
      if (el) {
        const { x, y } = tilt.current;
        el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${x * 0.28}deg)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (dragging.current) {
        moved.current = true;
        userMoved.current = true;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        pos.current = {
          x: Math.min(window.innerWidth - w - 6, Math.max(6, e.clientX - offset.current.x)),
          y: Math.min(window.innerHeight - h - 6, Math.max(6, e.clientY - offset.current.y)),
        };
        applyPos();
        return;
      }
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / Math.max(1, window.innerWidth);
      const dy = (e.clientY - cy) / Math.max(1, window.innerHeight);
      target.current = {
        x: Math.max(-8, Math.min(8, dx * 16)),
        y: Math.max(-5, Math.min(5, dy * 9)),
      };
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [applyPos]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragging.current = true;
    moved.current = false;
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  return (
    <div
      ref={wrapRef}
      className={cn(
        "pointer-events-none fixed z-20 flex w-max max-w-48 flex-col items-center",
      )}
      style={{ right: 10, bottom: 10 }}
    >
      {message ? (
      <div
        key={message}
        className="speech-balloon bubble-in"
      >
        {message}
      </div>
      ) : null}
      <button
        type="button"
        aria-label="Interagir com o dino"
        onPointerDown={onPointerDown}
        onClick={() => {
          if (moved.current) return;
          onPet();
        }}
        className={cn(
          "pointer-events-auto relative touch-none border-0 bg-transparent p-0",
          size === "sm" ? "w-14" : "w-16 sm:w-20",
        )}
      >
        <span ref={spriteRef} className="relative block will-change-transform">
          <span
            className={cn(
              "relative block",
              mood === "celebrate" || mood === "shy" ? "dino-pop" : "dino-bob",
            )}
          >
            {mounted.map((key) => (
              <img
                key={key}
                src={POSES[key]}
                alt=""
                width={240}
                height={280}
                draggable={false}
                decoding="async"
                fetchPriority={key === "idle" ? "high" : "low"}
                onLoad={() => {
                  if (!userMoved.current) placeDefault();
                  if (key !== "idle") return;
                  const preload = () => {
                    for (const pose of MOODS) {
                      if (pose === "idle") continue;
                      const img = new Image();
                      img.decoding = "async";
                      img.src = POSES[pose];
                    }
                  };
                  window.requestIdleCallback(preload);
                }}
                className={cn(
                  "h-auto w-full select-none drop-shadow-[0_10px_16px_rgba(0,0,0,0.4)] transition-opacity duration-300 ease-out",
                  key === "idle" ? "relative" : "absolute inset-0",
                  key === mood ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
          </span>
        </span>
      </button>
    </div>
  );
}
