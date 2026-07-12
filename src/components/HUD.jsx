export default function HUD({
  hudFadeOut,
  volume,
  channelLabel,
  handleVolumeChange,
  switchTo,
  toggleFullscreen,
  query,
  activeIndex,
  toggleLeftMenu,
  leftMenuOpen,
  settingsOpen,
  networkName,
  isSubscribed,
  toggleSubscription,
}) {
  return (
    <div className={`hud${hudFadeOut ? ' fade-out' : ''}`}>
      {/* BOTTOM-LEFT: menu toggle + current channel + add-channel */}
      <div className={`hud-left${leftMenuOpen || settingsOpen ? ' shifted' : ''}`}>
        <button
          className="hud-btn hud-btn-menu-toggle"
          aria-label="Menu"
          onClick={toggleLeftMenu}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: leftMenuOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 300ms ease',
            }}
          >
            {leftMenuOpen ? (
              <polyline points="15 18 9 12 15 6" />
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        {query && (
          <div className="hud-ch-container">
            <span className="hud-network-name">{networkName}</span>
            <span className="hud-ch">{channelLabel}</span>
            <button
              className={`hud-add-btn${isSubscribed ? ' subscribed' : ''}`}
              type="button"
              onClick={toggleSubscription}
            >
              {isSubscribed ? '✓ SAVED CHANNEL' : '+ SAVE CHANNEL'}
            </button>
          </div>
        )}
      </div>

      {/* BOTTOM-RIGHT: volume + nav arrows + fullscreen */}
      <div className="hud-right">
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

        <div className="nav-arrows">
          <button
            className="hud-btn"
            aria-label="Previous channel"
            onClick={() => {
              if (!query) return toggleLeftMenu();
              switchTo((activeIndex ?? 0) - 1);
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
              if (!query) return toggleLeftMenu();
              switchTo((activeIndex ?? -1) + 1);
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
    </div>
  );
}
