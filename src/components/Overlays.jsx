export default function Overlays({
  canvasRef,
  overlayEnabled,
  vignetteEnabled,
  glitchRef,
  glitchActive,
  glitchBg,
  statusVisible,
  statusText,
  toastShow,
  toastMsg,
  toggleFullscreen,
}) {
  return (
    <>
      {/* Noise Canvas */}
      <canvas ref={canvasRef} className="noise-canvas" />

      {/* Overlay layers */}
      {overlayEnabled && <div className="scanlines"></div>}
      {vignetteEnabled && <div className="vignette"></div>}
      <div
        ref={glitchRef}
        className={`glitch${glitchActive ? ' active' : ''}`}
        style={{ background: glitchBg }}
      ></div>

      {/* Status */}
      <div className={`status-layer${statusVisible ? ' visible' : ''}`}>
        <span className="status-label">{statusText}</span>
      </div>

      {/* Toast */}
      <div className={`toast${toastShow ? ' show' : ''}`}>{toastMsg}</div>

      {/* Landscape / fullscreen prompt (mobile portrait) */}
      <div className="landscape-enforcer">
        <div className="landscape-card">
          <svg
            className="landscape-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="7" width="20" height="10" rx="2" />
            <path d="M17 3.5 20.5 7 17 10.5" />
          </svg>
          <div className="landscape-title">ROTATE YOUR DEVICE</div>
          <p className="landscape-text">
            Turn your phone to landscape, then tap the button below to go
            fullscreen for the full broadcast.
          </p>
          <button
            className="landscape-btn"
            type="button"
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
            GO FULLSCREEN
          </button>
        </div>
      </div>
    </>
  );
}
