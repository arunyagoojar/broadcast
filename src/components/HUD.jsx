export default function HUD({
  hudFadeOut,
  volume,
  channelLabel,
  openSearchFn,
  handleVolumeChange,
  switchTo,
  toggleFullscreen,
  query,
  activeIndex,
}) {
  return (
    <div className={`hud${hudFadeOut ? ' fade-out' : ''}`}>
      <button
        className="hud-btn"
        aria-label="Search"
        onClick={() => openSearchFn(query)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      <div className="vol-wrap" title="Volume">
        <div className="vol-track">
          <div className="vol-fill" style={{ width: `${volume}%` }}></div>
          <div className="vol-thumb" style={{ left: `${volume}%` }}></div>
          <input
            type="range"
            className="vol-input"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            aria-label="Volume"
          />
        </div>
      </div>

      <div className="hud-spacer"></div>
      <span className="hud-ch">{channelLabel}</span>
      <div className="hud-spacer"></div>

      <div className="nav-arrows">
        <button
          className="hud-btn"
          aria-label="Previous channel"
          onClick={() => {
            if (!query) return openSearchFn();
            switchTo((activeIndex ?? 0) - 1, 'back');
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          className="hud-btn"
          aria-label="Next channel"
          onClick={() => {
            if (!query) return openSearchFn();
            switchTo((activeIndex ?? -1) + 1, 'forward');
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <button
        className="hud-btn"
        aria-label="Fullscreen"
        onClick={toggleFullscreen}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      </button>
    </div>
  );
}
