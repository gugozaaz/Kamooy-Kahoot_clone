import React from 'react';
import { api } from '../lib/api';
import { sfx } from '../lib/sound';

const EMOJIS = ['🔥', '❤️', '🚀', '👏', '😱', '💯'];

export default function ReactionDock({ pin, nickname }) {
  const sendEmoji = (emoji) => {
    sfx.unlock();
    sfx.pop();
    if (navigator.vibrate) navigator.vibrate(25);
    if (!pin) return;
    api.sendReaction(pin, emoji, nickname).catch(() => {});
  };

  return (
    <div className="player-reaction-dock">
      <span className="reaction-dock-label" style={{ fontSize: '0.85rem', fontWeight: 800, color: '#6b7280', marginRight: '4px' }}>
        เชียร์:
      </span>
      {EMOJIS.map(emoji => (
        <button
          key={emoji}
          type="button"
          onClick={() => sendEmoji(emoji)}
          className="reaction-btn"
          aria-label={`Reaction ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
