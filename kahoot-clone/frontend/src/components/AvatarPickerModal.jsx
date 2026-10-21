import React from 'react';
import { AVATAR_LIST, PLAYER_TITLES } from '../lib/avatars';
import { sfx } from '../lib/sound';

export default function AvatarPickerModal({ selectedEmoji, onSelectEmoji, selectedTitle, onSelectTitle, onClose }) {
  const rollRandom = () => {
    sfx.pop();
    const randomAvatar = AVATAR_LIST[Math.floor(Math.random() * AVATAR_LIST.length)];
    const randomTitle = PLAYER_TITLES[Math.floor(Math.random() * PLAYER_TITLES.length)];
    onSelectEmoji(randomAvatar.emoji);
    onSelectTitle(randomTitle);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '28px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        border: '3px solid #ffcc00'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#111827' }}>
            🎨 เลือกอวาตาร์ & ฉายา
          </h3>
          <button
            onClick={onClose}
            style={{
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              fontWeight: 900,
              fontSize: '1.1rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Randomizer Button */}
        <div style={{ marginBottom: '18px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={rollRandom}
            className="btn-kamooy btn-kamooy-secondary"
            style={{ width: '100%', fontSize: '1rem' }}
          >
            🎲 สุ่มอวาตาร์ & ฉายาให้ฉัน
          </button>
        </div>

        {/* Avatar Grid */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 800, color: '#4b5563', marginBottom: '10px', fontSize: '0.95rem' }}>
            ตัวละครของคุณ:
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '4px'
          }}>
            {AVATAR_LIST.map(a => {
              const isSelected = selectedEmoji === a.emoji;
              return (
                <button
                  key={a.emoji}
                  type="button"
                  onClick={() => {
                    sfx.pop();
                    onSelectEmoji(a.emoji);
                  }}
                  style={{
                    background: a.bg,
                    border: isSelected ? '4px solid #111827' : '3px solid transparent',
                    borderRadius: '16px',
                    height: '64px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                    boxShadow: isSelected ? '0 8px 18px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.1)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '1.8rem' }}>{a.emoji}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontWeight: 800, color: '#4b5563', marginBottom: '10px', fontSize: '0.95rem' }}>
            ฉายาติดตัว:
          </label>
          <select
            value={selectedTitle}
            onChange={(e) => onSelectTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '2px solid #e5e7eb',
              fontSize: '1rem',
              fontWeight: 800,
              color: '#1f2937'
            }}
          >
            {PLAYER_TITLES.map(title => (
              <option key={title} value={title}>{title}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-kamooy btn-kamooy-primary"
          style={{ width: '100%', height: '48px', fontSize: '1.1rem' }}
        >
          ✓ ยืนยัน
        </button>
      </div>
    </div>
  );
}
