import React, { useEffect } from 'react';
import { getAvatar } from '../lib/avatars';
import { useCountUp } from '../lib/useCountUp';
import { sfx } from '../lib/sound';

export default function Podium({ players = [] }) {
  const p1 = players[0]; // 1st Place - Gold
  const p2 = players[1]; // 2nd Place - Silver
  const p3 = players[2]; // 3rd Place - Bronze
  const runnersUp = players.slice(3, 5); // 4th & 5th place

  // Play fanfare sequence as each step reveals
  useEffect(() => {
    const t3 = p3 ? setTimeout(() => sfx.streak(3), 600) : null;
    const t2 = p2 ? setTimeout(() => sfx.streak(5), 1800) : null;
    const t1 = p1 ? setTimeout(() => sfx.fanfare(), 3000) : null;

    return () => {
      if (t3) clearTimeout(t3);
      if (t2) clearTimeout(t2);
      if (t1) clearTimeout(t1);
    };
  }, [p1, p2, p3]);

  return (
    <div className="podium-wrapper">
      <div className="podium-stage">
        {/* 2nd Place (Silver - Left) */}
        <div className="podium-col col-2nd">
          {p2 ? (
            <PodiumPlayer
              player={p2}
              rank={2}
              medal="🥈"
              delay="1.2s"
              pillarHeight="clamp(95px, 13vh, 130px)"
              pillarClass="pillar-silver"
            />
          ) : (
            <div className="podium-empty" style={{ height: 'clamp(95px, 13vh, 130px)' }} />
          )}
        </div>

        {/* 1st Place (Gold - Center) */}
        <div className="podium-col col-1st">
          {p1 ? (
            <PodiumPlayer
              player={p1}
              rank={1}
              medal="🥇"
              delay="2.6s"
              pillarHeight="clamp(130px, 18vh, 180px)"
              pillarClass="pillar-gold"
              isWinner
            />
          ) : (
            <div className="podium-empty" style={{ height: 'clamp(130px, 18vh, 180px)' }} />
          )}
        </div>

        {/* 3rd Place (Bronze - Right) */}
        <div className="podium-col col-3rd">
          {p3 ? (
            <PodiumPlayer
              player={p3}
              rank={3}
              medal="🥉"
              delay="0.3s"
              pillarHeight="clamp(65px, 9vh, 90px)"
              pillarClass="pillar-bronze"
            />
          ) : (
            <div className="podium-empty" style={{ height: 'clamp(65px, 9vh, 90px)' }} />
          )}
        </div>
      </div>

      {/* Runners-up ticker (#4, #5) */}
      {runnersUp.length > 0 && (
        <div className="runners-up-row">
          <div className="runners-up-title">ชมเชย (Honorable Mentions)</div>
          <div className="runners-up-grid">
            {runnersUp.map((p, idx) => {
              const avatar = getAvatar(p.nickname);
              return (
                <div key={idx} className="runner-up-card">
                  <span className="runner-up-rank">#{idx + 4}</span>
                  <span className="runner-up-avatar">{avatar.emoji}</span>
                  <span className="runner-up-name">{p.nickname}</span>
                  <span className="runner-up-score">{p.score} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PodiumPlayer({ player, rank, medal, delay, pillarHeight, pillarClass, isWinner }) {
  const avatar = getAvatar(player.nickname);
  const score = useCountUp(player.score, 1200);

  return (
    <div className={`podium-card ${isWinner ? 'winner-card' : ''}`} style={{ animationDelay: delay }}>
      <div className="podium-avatar-box">
        {isWinner && <div className="winner-crown">👑</div>}
        <div className="podium-avatar-circle" style={{ background: avatar.bg }}>
          <span className="avatar-emoji">{avatar.emoji}</span>
        </div>
        <div className="podium-player-name">{player.nickname}</div>
        <div className="podium-player-score">{score} pts</div>
      </div>

      <div
        className={`podium-pillar ${pillarClass}`}
        style={{ height: pillarHeight, animationDelay: delay }}
      >
        <span className="pillar-medal">{medal}</span>
        <span className="pillar-rank-num">{rank}</span>
      </div>
    </div>
  );
}
