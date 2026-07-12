import { useEffect, useRef, useState } from 'react';
import { playClick } from '../utils/sounds';

export default function LeftMenu({
  isOpen,
  onClose,
  subscriptions,
  handleSearch,
  deleteSubscription,
  openSettingsFn,
  activeQuery,
}) {
  const menuRef = useRef(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleClickOutside(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !e.target.closest('.hud-btn-menu-toggle')
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = searchText.trim();
    if (!q) return;
    handleSearch(q);
    setSearchText('');
    onClose();
  };

  const selectChannel = (network) => {
    handleSearch(network.query, false, network.seed);
    onClose();
  };

  return (
    <div className={`left-menu-container${isOpen ? ' open' : ''}`}>
      <div className="left-menu-perspective">
        <div className="left-menu" ref={menuRef}>
          {/* Search bar + create channel */}
          <div className="left-menu-header">
            <form className="menu-search-row" onSubmit={submitSearch}>
              <svg
                className="menu-search-icon"
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
                className="menu-search-input"
                type="text"
                placeholder="Search a topic..."
                autoComplete="off"
                spellCheck="false"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <button
                className="menu-create-btn"
                type="submit"
                aria-label="Create channel"
                title="Create channel"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </form>
          </div>

          {/* Saved channels */}
          <div className="left-menu-content">
            <div className="left-menu-group-label">SAVED CHANNELS</div>
            <div className="left-menu-list">
              {subscriptions.length === 0 ? (
                <div className="menu-empty">
                  No saved channels yet. Tune a network and hit SAVE CHANNEL to
                  bookmark it here.
                </div>
              ) : (
                subscriptions.map((network, i) => {
                  const isActive =
                    activeQuery &&
                    network.query.toLowerCase() === activeQuery.toLowerCase();
                  return (
                    <div
                      key={`ch-${i}`}
                      className={`left-menu-item channel-row${isActive ? ' active' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectChannel(network)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectChannel(network);
                        }
                      }}
                    >
                      <span className="channel-name">{network.query}</span>
                      <span className={`channel-live${isActive ? ' on' : ''}`}>
                        <span className="channel-live-dot" />
                        LIVE
                      </span>
                      <button
                        className="channel-del-btn"
                        type="button"
                        title="Remove channel"
                        aria-label="Remove channel"
                        onClick={(e) => {
                          e.stopPropagation();
                          playClick();
                          deleteSubscription(network);
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Settings */}
          <div className="left-menu-footer">
            <button
              className="left-menu-item"
              type="button"
              onClick={openSettingsFn}
            >
              <div className="footer-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <span className="channel-name">SETTINGS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
