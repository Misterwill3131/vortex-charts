import React from "react";

export interface VortexChartControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  isZoomed: boolean;
  zoomLevel?: number | string;
  isRulerActive?: boolean;
  onToggleRuler?: () => void;
  className?: string;
}

export const VortexChartControls: React.FC<VortexChartControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  isZoomed,
  zoomLevel = 1,
  isRulerActive = false,
  onToggleRuler,
  className = "",
}) => {
  return (
    <div
      className={`absolute top-2.5 right-3 z-20 flex items-center gap-1 rounded-lg border border-white/10 bg-black/75 px-1.5 py-1 backdrop-blur-md shadow-xl transition-all duration-200 opacity-60 hover:opacity-100 select-none ${className}`}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      role="toolbar"
      aria-label="Contrôles du graphique"
    >
      {/* Zoom Level Badge (when zoomed) */}
      {isZoomed && (
        <span className="mr-1 rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-400 border border-sky-400/30">
          {typeof zoomLevel === "number" ? `${zoomLevel}x` : zoomLevel}
        </span>
      )}

      {/* Zoom In Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onZoomIn();
        }}
        title="Zoom avant (+)"
        className="flex h-6 w-6 items-center justify-center rounded text-zinc-300 hover:bg-white/10 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400"
        aria-label="Zoom avant"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>

      {/* Zoom Out Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onZoomOut();
        }}
        title="Zoom arrière (-)"
        className="flex h-6 w-6 items-center justify-center rounded text-zinc-300 hover:bg-white/10 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400"
        aria-label="Zoom arrière"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>

      {/* Optional Ruler Toggle */}
      {onToggleRuler && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleRuler();
          }}
          title={isRulerActive ? "Désactiver l'outil de mesure" : "Outil de mesure (ou Shift+Glisser)"}
          className={`flex h-6 w-6 items-center justify-center rounded transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400 ${
            isRulerActive
              ? "bg-sky-500/25 text-sky-300 border border-sky-400/40"
              : "text-zinc-300 hover:bg-white/10 hover:text-white"
          }`}
          aria-label="Outil de mesure"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
            <path d="m14.5 12.5 2-2" />
            <path d="m11.5 9.5 2-2" />
            <path d="m8.5 6.5 2-2" />
            <path d="m17.5 15.5 2-2" />
          </svg>
        </button>
      )}

      {/* Reset View Button */}
      {isZoomed && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReset();
          }}
          title="Réinitialiser l'affichage (Double-clic)"
          className="flex h-6 items-center gap-1 rounded bg-sky-500/15 border border-sky-400/30 px-1.5 text-[10px] font-medium text-sky-300 hover:bg-sky-500/30 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400"
          aria-label="Réinitialiser le zoom"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Fit</span>
        </button>
      )}
    </div>
  );
};
