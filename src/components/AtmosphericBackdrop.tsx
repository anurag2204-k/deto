'use client';

export function AtmosphericBackdrop() {
  return (
    <div
      className="absolute top-0 right-0 w-full md:w-[70%] h-[340px] pointer-events-none overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      {/* Twilight atmospheric glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#090a10]/60 to-[#090a10]" />
      <div className="absolute top-0 right-0 w-[550px] h-[280px] bg-indigo-600/10 rounded-full blur-[120px]" />
      <div className="absolute top-10 right-24 w-[300px] h-[160px] bg-amber-500/15 rounded-full blur-[90px]" />

      {/* Mountain silhouette SVG */}
      <svg
        className="absolute bottom-0 right-0 w-full h-[240px] opacity-40 mix-blend-screen"
        preserveAspectRatio="none"
        viewBox="0 0 1200 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="mountainsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#090a10" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="frontRidge" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#090a10" stopOpacity="0.98" />
          </linearGradient>
        </defs>

        {/* Back high peaks */}
        <path
          d="M300 400 L550 180 L720 280 L880 120 L1040 240 L1200 150 L1200 400 Z"
          fill="url(#mountainsGrad)"
        />

        {/* Sun/Horizon crest highlight */}
        <circle cx="880" cy="120" r="140" fill="#f59e0b" opacity="0.12" filter="blur(30px)" />

        {/* Foreground ridge */}
        <path
          d="M200 400 L420 290 L600 340 L820 210 L1020 310 L1200 240 L1200 400 Z"
          fill="url(#frontRidge)"
        />
      </svg>
    </div>
  );
}
