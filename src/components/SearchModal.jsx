export default function SearchModal({
  searchOpen,
  closeSearchFn,
  searchInputRef,
  searchValue,
  setSearchValue,
  handleSearchSubmit,
  history,
  handleSearch,
  subscriptions,
  deleteSubscription,
  helpVisible,
  setHelpVisible,
  openSettingsFn,
  hasBothSections,
  onboarding,
}) {
  return (
    <div
      className={`search-modal${searchOpen ? ' open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Tuner index"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSearchFn();
      }}
    >
      <div className="search-panel">
        <div className="search-header">
          <span className="search-title">{onboarding ? 'FIRST TUNE' : 'TUNER INDEX'}</span>
          <button
            className="search-close-btn"
            type="button"
            onClick={closeSearchFn}
            aria-label="Close search"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {onboarding && (
          <p className="onboarding-text">
            Search a show, movie, topic, or vibe to start your first broadcast.
          </p>
        )}

        <form className="search-row" onSubmit={handleSearchSubmit}>
          <div className="search-input-wrap">
            <svg
              className="search-input-icon"
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
            <input
              ref={searchInputRef}
              className="search-input"
              type="text"
              placeholder="Search a topic..."
              autoComplete="off"
              spellCheck="false"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <button className="search-go" type="submit">
            GO
          </button>
        </form>

        {/* History */}
        {history.length > 0 && (
          <div>
            <div className="section-label">RECENT</div>
            <div className="history-row">
              {history.map((q, i) => (
                <button
                  key={`hist-${i}`}
                  className="history-btn"
                  type="button"
                  onClick={() => handleSearch(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {hasBothSections && <hr className="search-divider" />}

        {/* Subscriptions */}
        {subscriptions.length > 0 && (
          <div>
            <div className="section-label">SAVED NETWORKS</div>
            <div className="subs-row">
              {subscriptions.map((network, i) => (
                <div
                  key={`sub-${i}`}
                  className="sub-item"
                  role="button"
                  tabIndex="0"
                  onClick={() => handleSearch(network.query, false, network.seed)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSearch(network.query, false, network.seed);
                    }
                  }}
                >
                  <span
                    className="sub-name"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSearch(network.query, false, network.seed);
                    }}
                  >
                    {network.query.toUpperCase()}
                  </span>
                  <button
                    className="sub-del-btn"
                    type="button"
                    title="Delete network"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSubscription(network);
                    }}
                  >
                    &#x2715;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="panel-toggle-wrap">
          <button
            className="help-toggle-btn"
            type="button"
            onClick={openSettingsFn}
          >
            SETTINGS
          </button>
          <button
            className="help-toggle-btn"
            type="button"
            onClick={() => setHelpVisible((v) => !v)}
          >
            HELP (?)
          </button>
        </div>

        {/* Help section */}
        {helpVisible && (
          <div
            className="help-section"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.12)',
              paddingTop: '14px',
            }}
          >
            <div className="section-label">ABOUT & CONTROLS</div>
            <p className="help-text">
              Welcome to Broadcast. Search for any topic to tune into an endless
              retro broadcast. Save your favorite networks.
            </p>
            <div className="help-shortcuts">
              <span>
                <b>Arrows:</b> Change CH
              </span>
              <span>
                <b>1-9:</b> Quick Tune
              </span>
              <span>
                <b>S or /:</b> Search
              </span>
              <span>
                <b>Space:</b> Mute/Unmute
              </span>
              <span>
                <b>C:</b> Cycle Theme
              </span>
              <span>
                <b>O:</b> Toggle Overlay
              </span>
              <span>
                <b>P:</b> Power
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
