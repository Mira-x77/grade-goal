/**
 * Mascot — the "Go Study!" blob character from the app icon.
 * Hand-drawn SVG with different poses for different contexts.
 *
 * Poses:
 *  - "idle"        : standing, one arm down (default)
 *  - "pointing"    : arm raised pointing up (auth / welcome)
 *  - "celebrating" : both arms up, happy (success / on target)
 *  - "thinking"    : hand on chin (onboarding / choosing)
 *  - "sad"         : slouched, arm down (error / below target)
 *  - "reading"     : holding a book (library / exam prep)
 *  - "sleeping"    : zzz (empty state / no data)
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

// Shared stroke style — thick, rounded, hand-drawn feel
const S = {
  stroke: "#1A1A1A",
  strokeWidth: 8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

// Body is always the same blob shape
const Body = () => (
  <g>
    {/* Main body blob */}
    <path
      d="M 60 140 L 60 60 Q 60 30 90 30 Q 120 30 120 60 L 120 140"
      {...S}
      fill="white"
    />
    {/* Rounded head top */}
    <path d="M 60 60 Q 60 20 90 20 Q 120 20 120 60" {...S} fill="white" />
    {/* Eyes */}
    <circle cx="78" cy="58" r="4" fill="#1A1A1A" stroke="none" />
    <circle cx="102" cy="58" r="4" fill="#1A1A1A" stroke="none" />
  </g>
);

// Mouth variants
const MouthNeutral = () => (
  <line x1="78" y1="72" x2="102" y2="72" {...S} strokeWidth={5} />
);
const MouthSmile = () => (
  <path d="M 78 70 Q 90 82 102 70" {...S} strokeWidth={5} />
);
const MouthSad = () => (
  <path d="M 78 78 Q 90 68 102 78" {...S} strokeWidth={5} />
);
const MouthOpen = () => (
  <path d="M 78 70 Q 90 85 102 70" {...S} strokeWidth={5} fill="white" />
);

// Leg stubs
const Legs = () => (
  <g>
    <line x1="75" y1="140" x2="75" y2="165" {...S} />
    <line x1="105" y1="140" x2="105" y2="165" {...S} />
  </g>
);

export default function Mascot({
  pose = "idle",
  size = 120,
  className = "",
  animate = true,
}: MascotProps) {
  const viewBox = "0 0 180 200";

  const floatAnim = animate
    ? {
        y: [0, -6, 0],
        transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
      }
    : {};

  const renderPose = () => {
    switch (pose) {
      case "pointing":
        return (
          <svg viewBox={viewBox} width={size} height={size} className={className}>
            <Body />
            <MouthNeutral />
            <Legs />
            {/* Left arm raised pointing up */}
            <path d="M 60 80 Q 30 60 20 30" {...S} />
            {/* Pointing finger */}
            <circle cx="20" cy="26" r="6" {...S} fill="white" />
            {/* Right arm down */}
            <path d="M 120 90 Q 145 100 148 115" {...S} />
            <circle cx="150" cy="118" r="6" {...S} fill="white" />
          </svg>
        );

      case "celebrating":
        return (
          <svg viewBox={viewBox} width={size} height={size} className={className}>
            <Body />
            <MouthOpen />
            <Legs />
            {/* Both arms up */}
            <path d="M 60 75 Q 30 50 22 28" {...S} />
            <circle cx="20" cy="24" r="6" {...S} fill="white" />
            <path d="M 120 75 Q 150 50 158 28" {...S} />
            <circle cx="160" cy="24" r="6" {...S} fill="white" />
            {/* Stars */}
            <text x="10" y="20" fontSize="14" fill="#F5C842" stroke="none">★</text>
            <text x="148" y="18" fontSize="14" fill="#F5C842" stroke="none">★</text>
            <text x="80" y="12" fontSize="10" fill="#F5C842" stroke="none">✦</text>
          </svg>
        );

      case "thinking":
        return (
          <svg viewBox={viewBox} width={size} height={size} className={className}>
            <Body />
            <MouthNeutral />
            <Legs />
            {/* Right arm up to chin */}
            <path d="M 120 85 Q 140 80 130 68" {...S} />
            <circle cx="128" cy="64" r="6" {...S} fill="white" />
            {/* Left arm down */}
            <path d="M 60 95 Q 40 105 38 118" {...S} />
            <circle cx="36" cy="122" r="6" {...S} fill="white" />
            {/* Thought dots */}
            <circle cx="140" cy="40" r="3" fill="#1A1A1A" stroke="none" />
            <circle cx="150" cy="28" r="5" fill="#1A1A1A" stroke="none" />
            <circle cx="162" cy="14" r="7" {...S} fill="white" />
            <text x="156" y="19" fontSize="9" fill="#1A1A1A" stroke="none" fontWeight="bold">?</text>
          </svg>
        );

      case "sad":
        return (
          <svg viewBox={viewBox} width={size} height={size} className={className}>
            <Body />
            <MouthSad />
            <Legs />
            {/* Both arms drooping down */}
            <path d="M 60 90 Q 38 110 35 130" {...S} />
            <circle cx="33" cy="134" r="6" {...S} fill="white" />
            <path d="M 120 90 Q 142 110 145 130" {...S} />
            <circle cx="147" cy="134" r="6" {...S} fill="white" />
            {/* Tear */}
            <path d="M 78 65 Q 76 72 78 76" stroke="#1A1A1A" strokeWidth={3} fill="none" strokeLinecap="round" />
          </svg>
        );

      case "reading":
        return (
          <svg viewBox={viewBox} width={size} height={size} className={className}>
            <Body />
            <MouthNeutral />
            <Legs />
            {/* Both arms holding a book in front */}
            <path d="M 60 95 Q 50 115 55 130" {...S} />
            <path d="M 120 95 Q 130 115 125 130" {...S} />
            {/* Book */}
            <rect x="52" y="128" width="76" height="52" rx="4" {...S} fill="#F5C842" />
            {/* Book spine */}
            <line x1="90" y1="128" x2="90" y2="180" {...S} strokeWidth={4} />
            {/* Book lines */}
            <line x1="60" y1="142" x2="86" y2="142" stroke="#1A1A1A" strokeWidth={3} strokeLinecap="round" />
            <line x1="60" y1="152" x2="86" y2="152" stroke="#1A1A1A" strokeWidth={3} strokeLinecap="round" />
            <line x1="60" y1="162" x2="86" y2="162" stroke="#1A1A1A" strokeWidth={3} strokeLinecap="round" />
            <line x1="94" y1="142" x2="120" y2="142" stroke="#1A1A1A" strokeWidth={3} strokeLinecap="round" />
            <line x1="94" y1="152" x2="120" y2="152" stroke="#1A1A1A" strokeWidth={3} strokeLinecap="round" />
          </svg>
        );

      case "sleeping":
        return (
          <svg viewBox={viewBox} width={size} height={size} className={className}>
            {/* Body slightly tilted */}
            <g transform="rotate(-8, 90, 100)">
              <Body />
              {/* Closed eyes */}
              <path d="M 72 58 Q 78 54 84 58" {...S} strokeWidth={4} />
              <path d="M 96 58 Q 102 54 108 58" {...S} strokeWidth={4} />
              <MouthNeutral />
              <Legs />
              {/* Arms drooping */}
              <path d="M 60 90 Q 42 108 40 125" {...S} />
              <circle cx="38" cy="129" r="6" {...S} fill="white" />
              <path d="M 120 90 Q 138 108 140 125" {...S} />
              <circle cx="142" cy="129" r="6" {...S} fill="white" />
            </g>
            {/* Zzz */}
            <text x="128" y="45" fontSize="13" fill="#1A1A1A" fontWeight="900" fontFamily="Nunito, sans-serif">z</text>
            <text x="140" y="30" fontSize="17" fill="#1A1A1A" fontWeight="900" fontFamily="Nunito, sans-serif">z</text>
            <text x="154" y="14" fontSize="21" fill="#1A1A1A" fontWeight="900" fontFamily="Nunito, sans-serif">Z</text>
          </svg>
        );

      // idle (default)
      default:
        return (
          <svg viewBox={viewBox} width={size} height={size} className={className}>
            <Body />
            <MouthNeutral />
            <Legs />
            {/* Left arm raised */}
            <path d="M 60 80 Q 35 65 28 45" {...S} />
            <circle cx="25" cy="41" r="6" {...S} fill="white" />
            {/* Right arm on hip */}
            <path d="M 120 90 Q 142 95 144 110" {...S} />
            <circle cx="146" cy="114" r="6" {...S} fill="white" />
          </svg>
        );
    }
  };

  return (
    <motion.div animate={floatAnim} className="inline-block">
      {renderPose()}
    </motion.div>
  );
}
