'use client';

import { useMemo } from 'react';

export type ArtworkArchetype =
  | 'distributed'
  | 'database'
  | 'neural'
  | 'algorithm'
  | 'frontend'
  | 'security'
  | 'hardware'
  | 'celestial';

interface ThemeConfig {
  archetype: ArtworkArchetype;
  label: string;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  accentColor: string;
}

// Deterministic string hasher
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Categorize topic based on keywords in title & notes, or fallback to hash
export function detectTopicArchetype(title: string, notes?: string): ArtworkArchetype {
  const text = `${title} ${notes || ''}`.toLowerCase();

  if (
    /distributed|network|microservice|kafka|queue|broker|rpc|consensus|p2p|cloud|socket|mesh|event/i.test(
      text
    )
  ) {
    return 'distributed';
  }
  if (/database|sql|nosql|mongo|postgres|redis|cache|btree|b-tree|storage|index|acid|query/i.test(text)) {
    return 'database';
  }
  if (/machine learning|neural|ai|llm|deep learning|transformer|nlp|vision|tensor|model|gradient/i.test(text)) {
    return 'neural';
  }
  if (/algorithm|math|sort|tree|graph|dp|dynamic programming|complexity|recursion|logic|structure/i.test(text)) {
    return 'algorithm';
  }
  if (/frontend|react|next\.?js|css|ui|ux|design|html|component|tailwind|layout|dom|animation/i.test(text)) {
    return 'frontend';
  }
  if (/security|auth|crypto|encrypt|jwt|token|ssl|tls|hash|vulnerability|firewall|oauth/i.test(text)) {
    return 'security';
  }
  if (/os|concurrency|thread|kernel|memory|cpu|hardware|rust|assembly|c\+\+|process|mutex/i.test(text)) {
    return 'hardware';
  }

  // Fallback to deterministic hash among the 8 archetypes
  const archetypes: ArtworkArchetype[] = [
    'distributed',
    'database',
    'neural',
    'algorithm',
    'frontend',
    'security',
    'hardware',
    'celestial',
  ];
  return archetypes[hashString(title) % archetypes.length];
}

const THEME_MAP: Record<ArtworkArchetype, ThemeConfig> = {
  distributed: {
    archetype: 'distributed',
    label: 'Distributed & Networks',
    bgGradient: 'from-cyan-950/80 via-blue-950/60 to-black',
    borderColor: 'border-cyan-500/30',
    glowColor: 'rgba(6,182,212,0.3)',
    accentColor: '#06b6d4',
  },
  database: {
    archetype: 'database',
    label: 'Data & Storage',
    bgGradient: 'from-amber-950/80 via-orange-950/60 to-black',
    borderColor: 'border-amber-500/30',
    glowColor: 'rgba(245,158,11,0.3)',
    accentColor: '#f59e0b',
  },
  neural: {
    archetype: 'neural',
    label: 'AI & Intelligence',
    bgGradient: 'from-purple-950/80 via-fuchsia-950/60 to-black',
    borderColor: 'border-purple-500/30',
    glowColor: 'rgba(168,85,247,0.3)',
    accentColor: '#c084fc',
  },
  algorithm: {
    archetype: 'algorithm',
    label: 'Algorithms & Logic',
    bgGradient: 'from-emerald-950/80 via-teal-950/60 to-black',
    borderColor: 'border-emerald-500/30',
    glowColor: 'rgba(16,185,129,0.3)',
    accentColor: '#10b981',
  },
  frontend: {
    archetype: 'frontend',
    label: 'Interface & Design',
    bgGradient: 'from-rose-950/80 via-pink-950/60 to-black',
    borderColor: 'border-rose-500/30',
    glowColor: 'rgba(244,63,94,0.3)',
    accentColor: '#fb7185',
  },
  security: {
    archetype: 'security',
    label: 'Security & Protocols',
    bgGradient: 'from-indigo-950/80 via-violet-950/60 to-black',
    borderColor: 'border-indigo-500/30',
    glowColor: 'rgba(99,102,241,0.3)',
    accentColor: '#818cf8',
  },
  hardware: {
    archetype: 'hardware',
    label: 'Systems & Hardware',
    bgGradient: 'from-teal-950/80 via-slate-900 to-black',
    borderColor: 'border-teal-500/30',
    glowColor: 'rgba(20,184,166,0.3)',
    accentColor: '#2dd4bf',
  },
  celestial: {
    archetype: 'celestial',
    label: 'Core Concept',
    bgGradient: 'from-violet-950/80 via-indigo-950/60 to-black',
    borderColor: 'border-violet-500/30',
    glowColor: 'rgba(139,92,246,0.3)',
    accentColor: '#a78bfa',
  },
};

// 1. Distributed Systems: Interconnected nodes, laser paths & orbital pulse
function DistributedSVG() {
  return (
    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
      {/* Orbital Ring */}
      <circle cx="50" cy="50" r="34" stroke="#0891b2" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
      <circle cx="50" cy="50" r="22" stroke="#06b6d4" strokeWidth="0.8" opacity="0.4" />
      
      {/* Network Traces */}
      <line x1="50" y1="50" x2="24" y2="30" stroke="#38bdf8" strokeWidth="1.2" opacity="0.7" />
      <line x1="50" y1="50" x2="76" y2="30" stroke="#38bdf8" strokeWidth="1.2" opacity="0.7" />
      <line x1="50" y1="50" x2="78" y2="68" stroke="#38bdf8" strokeWidth="1.2" opacity="0.7" />
      <line x1="50" y1="50" x2="22" y2="68" stroke="#38bdf8" strokeWidth="1.2" opacity="0.7" />
      <line x1="24" y1="30" x2="76" y2="30" stroke="#0891b2" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5" />
      <line x1="22" y1="68" x2="78" y2="68" stroke="#0891b2" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5" />

      {/* Nodes */}
      <circle cx="24" cy="30" r="4.5" fill="#0891b2" stroke="#67e8f9" strokeWidth="1.5" />
      <circle cx="76" cy="30" r="4.5" fill="#0891b2" stroke="#67e8f9" strokeWidth="1.5" />
      <circle cx="78" cy="68" r="4" fill="#0e7490" stroke="#38bdf8" strokeWidth="1.5" />
      <circle cx="22" cy="68" r="4" fill="#0e7490" stroke="#38bdf8" strokeWidth="1.5" />

      {/* Central Hub Node */}
      <circle cx="50" cy="50" r="8" fill="#164e63" stroke="#22d3ee" strokeWidth="2" />
      <circle cx="50" cy="50" r="3.5" fill="#a5f3fc" />
    </svg>
  );
}

// 2. Database: Layered cylindrical data disks with glowing tier headers
function DatabaseSVG() {
  return (
    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
      {/* Ambient laser beam */}
      <line x1="50" y1="18" x2="50" y2="82" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />

      {/* Disk 1 (Bottom) */}
      <path d="M25 65 C25 60 75 60 75 65 L75 75 C75 80 25 80 25 75 Z" fill="#451a03" stroke="#f59e0b" strokeWidth="1.2" />
      <ellipse cx="50" cy="65" rx="25" ry="6" fill="#78350f" stroke="#fbbf24" strokeWidth="1.2" />

      {/* Disk 2 (Middle) */}
      <path d="M25 47 C25 42 75 42 75 47 L75 57 C75 62 25 62 25 57 Z" fill="#451a03" stroke="#f59e0b" strokeWidth="1.2" />
      <ellipse cx="50" cy="47" rx="25" ry="6" fill="#92400e" stroke="#fbbf24" strokeWidth="1.2" />

      {/* Disk 3 (Top) */}
      <path d="M25 29 C25 24 75 24 75 29 L75 39 C75 44 25 44 25 39 Z" fill="#451a03" stroke="#f59e0b" strokeWidth="1.2" />
      <ellipse cx="50" cy="29" rx="25" ry="6" fill="#b45309" stroke="#fde68a" strokeWidth="1.5" />

      {/* Status glowing dot */}
      <circle cx="50" cy="29" r="2.5" fill="#fef08a" />
      <circle cx="65" cy="47" r="1.5" fill="#f59e0b" />
      <circle cx="65" cy="65" r="1.5" fill="#f59e0b" />
    </svg>
  );
}

// 3. AI & Neural: Deep synaptic lattice with radiant tensor nexus
function NeuralSVG() {
  return (
    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
      {/* Input layer to hidden layer */}
      <line x1="22" y1="30" x2="50" y2="24" stroke="#c084fc" strokeWidth="1" opacity="0.6" />
      <line x1="22" y1="50" x2="50" y2="24" stroke="#c084fc" strokeWidth="1" opacity="0.6" />
      <line x1="22" y1="70" x2="50" y2="24" stroke="#c084fc" strokeWidth="1" opacity="0.6" />
      <line x1="22" y1="30" x2="50" y2="50" stroke="#e879f9" strokeWidth="1.2" opacity="0.8" />
      <line x1="22" y1="50" x2="50" y2="50" stroke="#e879f9" strokeWidth="1.2" opacity="0.8" />
      <line x1="22" y1="70" x2="50" y2="50" stroke="#e879f9" strokeWidth="1.2" opacity="0.8" />
      <line x1="22" y1="30" x2="50" y2="76" stroke="#c084fc" strokeWidth="1" opacity="0.6" />
      <line x1="22" y1="50" x2="50" y2="76" stroke="#c084fc" strokeWidth="1" opacity="0.6" />
      <line x1="22" y1="70" x2="50" y2="76" stroke="#c084fc" strokeWidth="1" opacity="0.6" />

      {/* Hidden layer to output */}
      <line x1="50" y1="24" x2="78" y2="38" stroke="#f0abfc" strokeWidth="1.2" opacity="0.7" />
      <line x1="50" y1="50" x2="78" y2="38" stroke="#f0abfc" strokeWidth="1.2" opacity="0.7" />
      <line x1="50" y1="76" x2="78" y2="38" stroke="#f0abfc" strokeWidth="1.2" opacity="0.7" />
      <line x1="50" y1="24" x2="78" y2="62" stroke="#f0abfc" strokeWidth="1.2" opacity="0.7" />
      <line x1="50" y1="50" x2="78" y2="62" stroke="#f0abfc" strokeWidth="1.2" opacity="0.7" />
      <line x1="50" y1="76" x2="78" y2="62" stroke="#f0abfc" strokeWidth="1.2" opacity="0.7" />

      {/* Input Nodes */}
      <circle cx="22" cy="30" r="3.5" fill="#581c87" stroke="#c084fc" strokeWidth="1.2" />
      <circle cx="22" cy="50" r="3.5" fill="#581c87" stroke="#c084fc" strokeWidth="1.2" />
      <circle cx="22" cy="70" r="3.5" fill="#581c87" stroke="#c084fc" strokeWidth="1.2" />

      {/* Hidden Nodes */}
      <circle cx="50" cy="24" r="4" fill="#701a75" stroke="#f0abfc" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="5.5" fill="#86198f" stroke="#fae8ff" strokeWidth="2" />
      <circle cx="50" cy="76" r="4" fill="#701a75" stroke="#f0abfc" strokeWidth="1.5" />

      {/* Output Nodes */}
      <circle cx="78" cy="38" r="4.5" fill="#4a044e" stroke="#f472b6" strokeWidth="1.5" />
      <circle cx="78" cy="62" r="4.5" fill="#4a044e" stroke="#f472b6" strokeWidth="1.5" />
    </svg>
  );
}

// 4. Algorithm & Logic: Tree hierarchy & recursive branching
function AlgorithmSVG() {
  return (
    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
      {/* Tree Branches */}
      <line x1="50" y1="25" x2="30" y2="48" stroke="#10b981" strokeWidth="1.5" />
      <line x1="50" y1="25" x2="70" y2="48" stroke="#10b981" strokeWidth="1.5" />

      <line x1="30" y1="48" x2="20" y2="72" stroke="#059669" strokeWidth="1.2" />
      <line x1="30" y1="48" x2="40" y2="72" stroke="#059669" strokeWidth="1.2" />

      <line x1="70" y1="48" x2="60" y2="72" stroke="#059669" strokeWidth="1.2" />
      <line x1="70" y1="48" x2="80" y2="72" stroke="#059669" strokeWidth="1.2" />

      {/* Leaves */}
      <circle cx="20" cy="72" r="3.5" fill="#064e3b" stroke="#34d399" strokeWidth="1.2" />
      <circle cx="40" cy="72" r="3.5" fill="#064e3b" stroke="#34d399" strokeWidth="1.2" />
      <circle cx="60" cy="72" r="3.5" fill="#064e3b" stroke="#34d399" strokeWidth="1.2" />
      <circle cx="80" cy="72" r="3.5" fill="#064e3b" stroke="#34d399" strokeWidth="1.2" />

      {/* Middle nodes */}
      <circle cx="30" cy="48" r="4.5" fill="#065f46" stroke="#6ee7b7" strokeWidth="1.5" />
      <circle cx="70" cy="48" r="4.5" fill="#065f46" stroke="#6ee7b7" strokeWidth="1.5" />

      {/* Root node */}
      <circle cx="50" cy="25" r="6" fill="#047857" stroke="#a7f3d0" strokeWidth="2" />
      <circle cx="50" cy="25" r="2.5" fill="#ffffff" />
    </svg>
  );
}

// 5. Frontend & UI: Floating frosted glass atomic planes & orbital ellipses
function FrontendSVG() {
  return (
    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
      {/* Atomic Orbital Ellipses */}
      <ellipse
        cx="50"
        cy="50"
        rx="36"
        ry="14"
        transform="rotate(-30 50 50)"
        stroke="#fb7185"
        strokeWidth="1.2"
        opacity="0.8"
      />
      <ellipse
        cx="50"
        cy="50"
        rx="36"
        ry="14"
        transform="rotate(30 50 50)"
        stroke="#f43f5e"
        strokeWidth="1.2"
        opacity="0.8"
      />
      <ellipse
        cx="50"
        cy="50"
        rx="36"
        ry="14"
        transform="rotate(90 50 50)"
        stroke="#fda4af"
        strokeWidth="1"
        opacity="0.5"
      />

      {/* Core Component Nucleus */}
      <circle cx="50" cy="50" r="7" fill="#881337" stroke="#fecdd3" strokeWidth="2" />
      <circle cx="50" cy="50" r="3" fill="#ffe4e6" />

      {/* Floating Orbital Electron Particles */}
      <circle cx="24" cy="35" r="2.5" fill="#fb7185" />
      <circle cx="76" cy="65" r="2.5" fill="#fb7185" />
      <circle cx="76" cy="35" r="2" fill="#fda4af" />
    </svg>
  );
}

// 6. Security & Protocols: Faceted cryptographic shield & quantum ring
function SecuritySVG() {
  return (
    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
      {/* Outer Hex Shield */}
      <polygon
        points="50,16 80,28 80,60 50,84 20,60 20,28"
        fill="#1e1b4b"
        stroke="#818cf8"
        strokeWidth="1.5"
        opacity="0.8"
      />

      {/* Inner Shield */}
      <polygon
        points="50,26 72,35 72,56 50,74 28,56 28,35"
        fill="#312e81"
        stroke="#a5b4fc"
        strokeWidth="1.2"
      />

      {/* Central Keylock / Core */}
      <circle cx="50" cy="46" r="6" fill="#4338ca" stroke="#c7d2fe" strokeWidth="1.5" />
      <path d="M47 50 L53 50 L55 62 L45 62 Z" fill="#c7d2fe" />
    </svg>
  );
}

// 7. Hardware & Systems: Silicon Microchip Wafer & Concurrency Die
function HardwareSVG() {
  return (
    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
      {/* Chip Body */}
      <rect x="28" y="28" width="44" height="44" rx="6" fill="#134e4a" stroke="#2dd4bf" strokeWidth="1.5" />
      
      {/* Silicon Die */}
      <rect x="38" y="38" width="24" height="24" rx="2" fill="#042f2e" stroke="#5eead4" strokeWidth="1" />
      <circle cx="50" cy="50" r="4" fill="#2dd4bf" />

      {/* Pins / Circuit Traces */}
      <line x1="36" y1="18" x2="36" y2="28" stroke="#14b8a6" strokeWidth="1.5" />
      <line x1="50" y1="18" x2="50" y2="28" stroke="#14b8a6" strokeWidth="1.5" />
      <line x1="64" y1="18" x2="64" y2="28" stroke="#14b8a6" strokeWidth="1.5" />

      <line x1="36" y1="72" x2="36" y2="82" stroke="#14b8a6" strokeWidth="1.5" />
      <line x1="50" y1="72" x2="50" y2="82" stroke="#14b8a6" strokeWidth="1.5" />
      <line x1="64" y1="72" x2="64" y2="82" stroke="#14b8a6" strokeWidth="1.5" />

      <line x1="18" y1="36" x2="28" y2="36" stroke="#14b8a6" strokeWidth="1.5" />
      <line x1="18" y1="50" x2="28" y2="50" stroke="#14b8a6" strokeWidth="1.5" />
      <line x1="18" y1="64" x2="28" y2="64" stroke="#14b8a6" strokeWidth="1.5" />

      <line x1="72" y1="36" x2="82" y2="36" stroke="#14b8a6" strokeWidth="1.5" />
      <line x1="72" y1="50" x2="82" y2="50" stroke="#14b8a6" strokeWidth="1.5" />
      <line x1="72" y1="64" x2="82" y2="64" stroke="#14b8a6" strokeWidth="1.5" />
    </svg>
  );
}

// 8. Celestial & Core: Planetary Astrolabe with concentric orbit horizon
function CelestialSVG() {
  return (
    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
      {/* Concentric rings */}
      <circle cx="50" cy="50" r="36" stroke="#8b5cf6" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
      <ellipse cx="50" cy="50" rx="34" ry="12" stroke="#a78bfa" strokeWidth="1.2" opacity="0.7" />
      
      {/* Celestial planet */}
      <circle cx="50" cy="50" r="14" fill="#3b0764" stroke="#c4b5fd" strokeWidth="1.5" />
      <circle cx="46" cy="46" r="3" fill="#e9d5ff" />

      {/* Orbiting Moon */}
      <circle cx="76" cy="45" r="3" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1" />
      
      {/* Horizon Rays */}
      <line x1="50" y1="12" x2="50" y2="24" stroke="#c4b5fd" strokeWidth="1" opacity="0.5" />
      <line x1="50" y1="76" x2="50" y2="88" stroke="#c4b5fd" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function ArchetypeRenderer({ archetype }: { archetype: ArtworkArchetype }) {
  switch (archetype) {
    case 'distributed':
      return <DistributedSVG />;
    case 'database':
      return <DatabaseSVG />;
    case 'neural':
      return <NeuralSVG />;
    case 'algorithm':
      return <AlgorithmSVG />;
    case 'frontend':
      return <FrontendSVG />;
    case 'security':
      return <SecuritySVG />;
    case 'hardware':
      return <HardwareSVG />;
    case 'celestial':
    default:
      return <CelestialSVG />;
  }
}

export interface TopicArtworkProps {
  title: string;
  notes?: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}

export function TopicArtwork({
  title,
  notes,
  imageUrl,
  size = 'md',
  className = '',
}: TopicArtworkProps) {
  const archetype = useMemo(() => detectTopicArchetype(title, notes), [title, notes]);
  const theme = THEME_MAP[archetype];

  // Size configurations
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg p-1 shrink-0',
    md: 'w-11 h-11 sm:w-12 sm:h-12 rounded-xl p-1.5 shrink-0',
    lg: 'w-16 h-16 sm:w-24 sm:h-24 rounded-xl p-2 shrink-0',
    hero: 'w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl p-2 shrink-0',
  }[size];

  // If a real image exists, show the image with glass border
  if (imageUrl) {
    return (
      <div
        className={`relative overflow-hidden bg-zinc-950 border ${theme.borderColor} shrink-0 flex items-center justify-center shadow-lg group ${sizeClasses} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${theme.bgGradient} border ${theme.borderColor} shrink-0 flex items-center justify-center shadow-inner group ${sizeClasses} ${className}`}
      style={{
        boxShadow: `0 0 20px -5px ${theme.glowColor}`,
      }}
      title={`${theme.label} concept`}
    >
      {/* Ambient Radial Spotlight */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at center, ${theme.glowColor} 0%, transparent 70%)`,
        }}
      />

      {/* Vector Artwork */}
      <div className="relative w-full h-full drop-shadow-[0_0_6px_rgba(255,255,255,0.15)] group-hover:scale-105 transition-transform duration-300">
        <ArchetypeRenderer archetype={archetype} />
      </div>
    </div>
  );
}

// Category pill badge
export function TopicCategoryBadge({ title, notes }: { title: string; notes?: string }) {
  const archetype = useMemo(() => detectTopicArchetype(title, notes), [title, notes]);
  const theme = THEME_MAP[archetype];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${theme.borderColor} text-zinc-300 bg-white/5 backdrop-blur-xs`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: theme.accentColor }}
      />
      <span>{theme.label}</span>
    </span>
  );
}
