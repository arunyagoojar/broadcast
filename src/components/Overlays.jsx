export default function Overlays({
  canvasRef,
  overlayEnabled,
  glitchRef,
  glitchActive,
  glitchBg,
  statusVisible,
  statusText,
  networkActive,
  networkFadeOut,
  networkName,
  isSubscribed,
  toggleSubscription,
  toastShow,
  toastMsg,
  togglePower,
}) {
  return (
    <>
      {/* Noise Canvas */}
      <canvas ref={canvasRef} className="noise-canvas" />

      {/* Overlay layers */}
      {overlayEnabled && (
        <>
          <div className="scanlines"></div>
          <div className="vignette"></div>
        </>
      )}
      <div
        ref={glitchRef}
        className={`glitch${glitchActive ? ' active' : ''}`}
        style={{ background: glitchBg }}
      ></div>

      {/* Status */}
      <div className={`status-layer${statusVisible ? ' visible' : ''}`}>
        <span className="status-label">{statusText}</span>
      </div>

      {/* Network Overlay */}
      <div
        className={`network-overlay${networkActive ? ' active' : ''}${networkFadeOut ? ' fade-out' : ''}`}
      >
        <div className="network-name">{networkName}</div>
        <button
          className={`network-btn${isSubscribed ? ' subscribed' : ''}`}
          onClick={toggleSubscription}
        >
          {isSubscribed ? '✓ SAVED' : '+ SAVE NETWORK'}
        </button>
      </div>

      {/* Toast */}
      <div className={`toast${toastShow ? ' show' : ''}`}>{toastMsg}</div>

      {/* Landscape enforcer */}
      <div className="landscape-enforcer">
        PLEASE ROTATE DEVICE TO LANDSCAPE
        <br />
        <br />
        TO VIEW TRANSMISSION
      </div>

      {/* Power button */}
      <div className="power-btn-wrap">
        <button className="power-btn" aria-label="Power" onClick={togglePower}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
            <line x1="12" y1="2" x2="12" y2="12"></line>
          </svg>
        </button>
      </div>
    </>
  );
}
