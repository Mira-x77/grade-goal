/**
 * Mascot — GoStudy's clean illustrated character.
 * Replaced hand-drawn SVG ghost with a polished emoji-style mascot
 * using colored circles + emoji expressions.
 *
 * Poses:
 *  - "idle"        : default calm
 *  - "pointing"    : arm up
 *  - "celebrating" : cheering
 *  - "thinking"    : pondering
 *  - "sad"         : droopy
 *  - "reading"     : book open
 *  - "sleeping"    : zzz
 */

import { motion } from "framer-motion";

export type MascotPose =
  | "idle"
  | "pointing"
  | "celebrating"
  | "thinking"
  | "sad"
  | "reading"
  | "sleeping";

interface MascotProps {
  pose?: MascotPose;
  size?: number;
  className?: string;
  animate?: boolean;
}

const POSE_EMOJI: Record<MascotPose, string> = {
  idle: "😊",
  pointing: "👆",
  celebrating: "🎉",
  thinking: "🤔",
  sad: "😔",
  reading: "📖",
  sleeping: "😴",
};

const POSE_BG: Record<MascotPose, string> = {
  idle: "#6C63FF",
  pointing: "#6C63FF",
  celebrating: "#F59E0B",
  thinking: "#6C63FF",
  sad: "#94A3B8",
  reading: "#10B981",
  sleeping: "#94A3B8",
};

export default function Mascot({
  pose = "idle",
  size = 120,
  className = "",
  animate: shouldAnimate = true,
}: MascotProps) {
  const floatAnim = shouldAnimate
    ? {
        y: [0, -6, 0],
        transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
      }
    : {};

  const bg = POSE_BG[pose];
  const emoji = POSE_EMOJI[pose];
  const fontSize = Math.round(size * 0.42);
  const borderRadius = size * 0.38;

  return (
    <motion.div
      animate={floatAnim}
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius,
        background: bg,
        boxShadow: `0 ${Math.round(size * 0.06)}px ${Math.round(size * 0.18)}px ${bg}55`,
        fontSize,
        lineHeight: 1,
      }}
    >
      {emoji}
    </motion.div>
  );
}
