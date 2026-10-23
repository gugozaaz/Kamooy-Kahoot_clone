import React, { useState, useEffect } from 'react';
import { sfx } from '../lib/sound';

export default function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggle = () => {
    sfx.pop();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <button
      type="button"
      className="fullscreen-toggle"
      onClick={handleToggle}
      aria-label={isFullscreen ? 'ออกจากโหมดเต็มจอ' : 'แสดงเต็มจอ'}
      title={isFullscreen ? 'ออกจากโหมดเต็มจอ' : 'แสดงเต็มจอ'}
      style={{
        position: 'fixed',
        top: '16px',
        left: '70px',
        right: 'auto',
        bottom: 'auto',
        margin: 0,
        zIndex: 9999,
        width: '46px',
        height: '46px',
        borderRadius: '50%',
        border: 'none',
        background: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        fontSize: '1.25rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease'
      }}
    >
      {isFullscreen ? '🗗' : '⛶'}
    </button>
  );
}
