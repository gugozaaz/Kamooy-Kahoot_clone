import React, { useEffect, useState, useRef } from 'react';
import { sfx } from '../lib/sound';

export default function FloatingReactions({ reactions = [], playSound = true }) {
  const [activeItems, setActiveItems] = useState([]);
  const seenIds = useRef(new Set());

  useEffect(() => {
    if (!reactions || reactions.length === 0) return;

    const newReactions = reactions.filter(r => !seenIds.current.has(r.id));
    if (newReactions.length === 0) return;

    if (playSound) {
      sfx.reaction();
    }

    const created = newReactions.map(r => {
      seenIds.current.add(r.id);
      return {
        id: r.id,
        emoji: r.emoji,
        nickname: r.nickname,
        left: 10 + Math.random() * 80, // 10% to 90%
        rot: (Math.random() - 0.5) * 30, // -15deg to +15deg
        size: 2.2 + Math.random() * 1.2 // 2.2rem to 3.4rem
      };
    });

    setActiveItems(prev => [...prev.slice(-30), ...created]);

    // Cleanup after animation completes (2.5s)
    const timer = setTimeout(() => {
      setActiveItems(prev => prev.filter(item => !created.some(c => c.id === item.id)));
    }, 2600);

    return () => clearTimeout(timer);
  }, [reactions, playSound]);

  return (
    <div className="floating-reactions-layer">
      {activeItems.map(item => (
        <div
          key={item.id}
          className="floating-emoji-item"
          style={{
            left: `${item.left}%`,
            fontSize: `${item.size}rem`,
            '--rot': `${item.rot}deg`
          }}
        >
          {item.emoji}
        </div>
      ))}
    </div>
  );
}
