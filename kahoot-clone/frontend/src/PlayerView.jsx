import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from './lib/api';
import { useGameState } from './lib/useGameState';
import { useCountUp } from './lib/useCountUp';
import { sfx } from './lib/sound';
import Confetti from './components/Confetti';
import SoundToggle from './components/SoundToggle';
import FloatingParticles from './components/FloatingParticles';
import { getAvatar } from './lib/avatars';

const CHOICE_SYMBOLS = ['▲', '◆', '●', '■', '★', '⬟'];
const CHOICE_NAMES = ['สีแดง (▲)', 'สีน้ำเงิน (◆)', 'สีเหลือง (●)', 'สีเขียว (■)'];

export default function PlayerView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialPin = searchParams.get('pin') || '';
  const [pin, setPin] = useState(initialPin);
  const [nickname, setNickname] = useState('');
  const [playerId, setPlayerId] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [previewTimeLeft, setPreviewTimeLeft] = useState(0);
  const [tappedIndex, setTappedIndex] = useState(null);
  const [pointsGained, setPointsGained] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answerTimeSeconds, setAnswerTimeSeconds] = useState(null);
  const questionStartTs = useRef(0);

  const { state } = useGameState({ pin, role: 'player', token: playerId, enabled: !!playerId });

  const gameState = state?.status || 'LOBBY';
  const currentQuestion = state?.question;
  const myScore = state?.myScore || 0;
  const resultData = state?.result;
  const finalResult = state?.finalLeaderboard;
  const myRank = resultData?.myRank || finalResult?.myRank || null;

  const currentAvatar = getAvatar(nickname || 'Player');

  useEffect(() => {
    let timer;
    if (gameState === 'QUESTION_PREVIEW' && previewTimeLeft > 0) {
      timer = setInterval(() => {
        setPreviewTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, previewTimeLeft]);

  // Seed the preview countdown from the server timestamp
  useEffect(() => {
    if (state?.status === 'QUESTION_PREVIEW') {
      setPreviewTimeLeft(Math.ceil((state.previewTimeLeftMs || 0) / 1000));
    }
  }, [state?.status, state?.currentIndex]);

  // When question becomes active, record start timestamp for speed badge
  useEffect(() => {
    if (state?.status === 'QUESTION_ACTIVE') {
      questionStartTs.current = Date.now();
    }
  }, [state?.status, state?.currentIndex]);

  // New question -> reset answering states
  useEffect(() => {
    setSelectedIndex(null);
    setSubmitted(false);
    setTappedIndex(null);
    setAnswerTimeSeconds(null);
  }, [state?.currentIndex]);

  // Survive a page refresh within the same game
  useEffect(() => {
    const savedPin = initialPin || pin;
    if (!savedPin) return;
    const savedId = sessionStorage.getItem(`kamooy:${savedPin}`);
    const savedNick = sessionStorage.getItem(`kamooy_nick:${savedPin}`);
    if (savedId) {
      setPin(savedPin);
      setPlayerId(savedId);
      if (savedNick) setNickname(savedNick);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Audio and reward feedback on phase change
  const prevPhase = useRef(null);
  const scoreBeforeResult = useRef(0);
  const wasCorrect = resultData?.correctAnswers?.includes(selectedIndex);

  useEffect(() => {
    if (!playerId) return;
    if (prevPhase.current === gameState) return;
    const leaving = prevPhase.current;
    prevPhase.current = gameState;

    switch (gameState) {
      case 'LOBBY':
        sfx.music('lobby');
        break;
      case 'QUESTION_PREVIEW':
        sfx.stopMusic();
        break;
      case 'QUESTION_ACTIVE':
        sfx.go();
        sfx.music('question');
        break;
      case 'QUESTION_RESULT': {
        sfx.stopMusic();
        const gained = Math.max(0, (resultData?.myScore ?? myScore) - scoreBeforeResult.current);
        setPointsGained(gained);
        if (wasCorrect) {
          const nextStreak = streak + 1;
          setStreak(nextStreak);
          if (nextStreak >= 2) sfx.streak(nextStreak);
          else sfx.correct();
        } else {
          setStreak(0);
          sfx.wrong();
        }
        break;
      }
      case 'QUESTION_LEADERBOARD':
        scoreBeforeResult.current = myScore;
        if (leaving) sfx.leaderboard();
        break;
      case 'GAME_OVER':
        sfx.stopMusic();
        sfx.fanfare();
        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, playerId]);

  useEffect(() => () => sfx.stopMusic(), []);

  // Preview 3-2-1 countdown beeps
  const prevPreviewTick = useRef(null);
  useEffect(() => {
    if (gameState !== 'QUESTION_PREVIEW') return;
    if (previewTimeLeft > 3 || previewTimeLeft <= 0) return;
    if (prevPreviewTick.current === previewTimeLeft) return;
    prevPreviewTick.current = previewTimeLeft;
    sfx.countdown();
  }, [gameState, previewTimeLeft]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!pin || !nickname) return;
    sfx.unlock();
    try {
      const res = await api.joinGame(pin.trim(), nickname.trim());
      sessionStorage.setItem(`kamooy:${pin.trim()}`, res.playerId);
      sessionStorage.setItem(`kamooy_nick:${pin.trim()}`, nickname.trim());
      setPlayerId(res.playerId);
      sfx.join();
    } catch (err) {
      alert(err.message || 'ไม่สามารถเข้าร่วมเกมได้');
    }
  };

  const selectChoice = (index) => {
    if (submitted) return;
    sfx.pop();
    if (navigator.vibrate) navigator.vibrate(35);

    const elapsedMs = Math.max(100, Date.now() - questionStartTs.current);
    setAnswerTimeSeconds((elapsedMs / 1000).toFixed(1));

    setTappedIndex(index);
    setSelectedIndex(index);
    setSubmitted(true);

    api.submitAnswer(pin.trim(), playerId, index).catch(() => {});
  };

  const joined = !!playerId;

  // 1. Not joined: Arcade login screen
  if (!joined) {
    return (
      <div className="player-container game-bg" style={{ backgroundColor: '#ffcc00', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative' }}>
        <FloatingParticles />
        <SoundToggle />

        <div style={{ textAlign: 'center', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '4.5rem', color: '#fff', textShadow: '3px 3px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000', margin: 0, letterSpacing: '2px' }}>
            Kamooy!
          </h1>
          <p style={{ color: '#333', fontSize: '1.2rem', fontWeight: 800, margin: '8px 0 0 0' }}>
            ประลองปัญญา ท้าความเร็ว ⚡
          </p>
        </div>

        <form className="join-form" onSubmit={handleJoin} style={{
          backgroundColor: '#fff',
          padding: '28px',
          borderRadius: '20px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '340px',
          position: 'relative',
          zIndex: 1,
          boxSizing: 'border-box'
        }}>
          {initialPin ? (
            <div style={{ textAlign: 'center', marginBottom: '14px', background: '#f3f4f6', padding: '8px', borderRadius: '10px', fontWeight: 800, color: '#374151' }}>
              PIN: {initialPin}
            </div>
          ) : (
            <input
              className="input-field"
              placeholder="Game PIN (เลข 6 หลัก)"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ marginBottom: '14px', fontSize: '1.3rem', textAlign: 'center', fontWeight: 'bold' }}
              maxLength={6}
            />
          )}

          <input
            className="input-field"
            placeholder="ใส่ชื่อเล่นของคุณ (Nickname)"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            style={{ marginBottom: '14px', fontSize: '1.2rem', textAlign: 'center', fontWeight: 'bold' }}
            maxLength={18}
          />

          {nickname && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px', background: '#f8fafc', padding: '8px', borderRadius: '12px' }}>
              <div className="avatar-bubble" style={{ background: currentAvatar.bg, width: '36px', height: '36px', fontSize: '1.2rem' }}>
                {currentAvatar.emoji}
              </div>
              <span style={{ fontWeight: 800, color: '#4b5563', fontSize: '0.95rem' }}>
                อวาตาร์ของคุณ: {currentAvatar.label}
              </span>
            </div>
          )}

          <button
            className="join-btn btn-primary"
            type="submit"
            style={{ fontSize: '1.3rem', padding: '14px', borderRadius: '12px', fontWeight: 900 }}
          >
            เข้าสู่เกม ➔
          </button>
        </form>
      </div>
    );
  }

  // 2. LOBBY: Waiting for host
  if (gameState === 'LOBBY') {
    return (
      <div className="player-container game-bg" style={{ backgroundColor: 'var(--kahoot-green)', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative' }}>
        <FloatingParticles />
        <SoundToggle />

        <div className="status-message" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div
            className="podium-avatar-circle"
            style={{
              background: currentAvatar.bg,
              width: '96px',
              height: '96px',
              fontSize: '3.4rem',
              margin: '0 auto 16px',
              animation: 'trophyIn 0.6s ease both, floatY 2.6s ease-in-out infinite'
            }}
          >
            {currentAvatar.emoji}
          </div>

          <h2 style={{ fontSize: '2.4rem', margin: '0 0 10px 0', fontWeight: 900 }}>
            ยินดีต้อนรับ {nickname}!
          </h2>
          <p style={{ fontSize: '1.3rem', opacity: 0.95, margin: 0, fontWeight: 700 }}>
            คุณเข้าร่วมห้องสำเร็จแล้ว 🎉
          </p>

          <div className="radar-scanner-box">
            <div className="radar-ring" />
            <div className="radar-ring" />
            <div className="radar-ring" />
            <div className="radar-center-icon">🎮</div>
          </div>

          <div className="waiting-dots-inline" style={{ fontSize: '1.2rem', marginTop: '14px', fontWeight: 700, opacity: 0.9 }}>
            รอโฮสต์กดเริ่มเกม
          </div>
        </div>
      </div>
    );
  }

  // 3. QUESTION_PREVIEW: Synchronized 3-2-1
  if (gameState === 'QUESTION_PREVIEW') {
    const is321 = previewTimeLeft <= 3 && previewTimeLeft > 0;
    return (
      <div className="player-container game-bg" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', backgroundColor: 'var(--theme-yellow)', overflow: 'hidden' }}>
        <FloatingParticles />
        <SoundToggle />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '90%', maxWidth: '600px' }}>
          <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.18)', color: '#333', padding: '6px 20px', borderRadius: '999px', fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>
            ⚡ คำถามข้อที่ {(state?.currentIndex || 0) + 1}
          </div>

          <div className="preview-question" style={{ backgroundColor: '#ffffff', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 6px 18px rgba(0,0,0,0.15)', fontSize: '2rem', fontWeight: 800, color: '#1f2937', marginBottom: '28px', width: '100%', boxSizing: 'border-box' }}>
            {currentQuestion?.text}
          </div>

          <div style={{ minHeight: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {is321 ? (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div key={`wave-${previewTimeLeft}`} className="countdown-shockwave" />
                <span key={`count-${previewTimeLeft}`} className="countdown-pop-321" style={{ fontSize: '7rem' }}>
                  {previewTimeLeft}
                </span>
              </div>
            ) : previewTimeLeft === 0 ? (
              <span className="countdown-pop-321" style={{ fontSize: '5rem', color: '#26890c' }}>GO!</span>
            ) : (
              <div className="preview-dots"><span /><span /><span /></div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. QUESTION_ACTIVE - Submitted (Answer Locked)
  if (gameState === 'QUESTION_ACTIVE' && submitted) {
    return (
      <div className="player-container game-bg" style={{ backgroundColor: 'var(--theme-yellow)', color: '#333', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative' }}>
        <FloatingParticles />
        <SoundToggle />

        <div className="status-message" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div className="radar-scanner-box">
            <div className="radar-ring" />
            <div className="radar-ring" />
            <div className="radar-center-icon">🔒</div>
          </div>

          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 10px 0', color: '#1f2937' }}>
            ส่งคำตอบแล้ว!
          </h2>

          {answerTimeSeconds && (
            <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.12)', padding: '6px 18px', borderRadius: '999px', fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: '8px 0 16px 0' }}>
              ⚡ ตอบในเวลา: {answerTimeSeconds} วินาที!
            </div>
          )}

          <div className="waiting-dots-inline" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4b5563' }}>
            รอลุ้นเฉลยพร้อมเพื่อนๆ
          </div>
        </div>
      </div>
    );
  }

  // 5. QUESTION_ACTIVE - Not submitted (Arcade Game Controller Pad)
  if (gameState === 'QUESTION_ACTIVE' && !submitted) {
    return (
      <div className="player-container game-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '16px', position: 'relative' }}>
        <FloatingParticles />
        <SoundToggle />

        <div style={{ textAlign: 'center', margin: '10px 0', position: 'relative', zIndex: 1 }}>
          <span style={{ background: 'rgba(255,255,255,0.9)', color: '#111827', padding: '6px 20px', borderRadius: '999px', fontSize: '1.1rem', fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            🎮 กดเลือกสัญลักษณ์คำตอบ
          </span>
        </div>

        <div className="pad-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', position: 'relative', zIndex: 1, margin: '10px 0' }}>
          {Array.from({ length: currentQuestion?.choicesCount || 4 }).map((_, i) => (
            <button
              key={i}
              className={`pad-btn pad-btn-arcade c-${i % 6}${tappedIndex === i ? ' tapped' : ''}`}
              style={{ animationDelay: `${i * 0.06}s`, minHeight: '120px' }}
              aria-label={`Answer ${i + 1}`}
              onClick={() => selectChoice(i)}
            >
              <span className="pad-symbol" style={{ fontSize: '4.5rem' }}>
                {CHOICE_SYMBOLS[i % CHOICE_SYMBOLS.length]}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 6. QUESTION_RESULT: High emotion victory or sympathy
  if (gameState === 'QUESTION_RESULT') {
    const isCorrect = wasCorrect;

    return (
      <div
        className={`player-container game-bg ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`}
        style={{
          backgroundColor: isCorrect ? 'var(--kahoot-green)' : 'var(--kahoot-red)',
          color: 'white',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          position: 'relative'
        }}
      >
        <FloatingParticles />
        <SoundToggle />
        {isCorrect && <Confetti count={140} duration={3500} spread="burst" />}

        <div className="status-message" style={{ animation: 'none', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <span className="feedback-icon" style={{ fontSize: '6rem' }}>{isCorrect ? '🎉' : '💥'}</span>

          <h2 style={{ fontSize: '3rem', fontWeight: 900, margin: '0 0 10px 0' }}>
            {isCorrect ? 'ถูกต้องแล้ว!' : 'ยังไม่ถูกนะ!'}
          </h2>

          {isCorrect && pointsGained > 0 && (
            <div className="score-pop" style={{ fontSize: '3.2rem', color: '#ffeb3b', textShadow: '0 4px 12px rgba(0,0,0,0.35)' }}>
              +{pointsGained} คะแนน
            </div>
          )}

          {isCorrect && streak >= 2 && (
            <div style={{ marginTop: '16px' }}>
              <span className="streak-badge" style={{ fontSize: '1.4rem', padding: '10px 24px' }}>
                🔥 STREAK COMBO x{streak}! กำลังไฟลุก!
              </span>
            </div>
          )}

          {!isCorrect && (
            <div style={{ marginTop: '16px', fontSize: '1.3rem', fontWeight: 700, opacity: 0.95 }}>
              {resultData?.correctAnswers?.length > 0 && (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 20px', borderRadius: '12px', display: 'inline-block', marginBottom: '10px' }}>
                  💡 ข้อที่ถูกคือ: {CHOICE_NAMES[resultData.correctAnswers[0]] || 'คำตอบที่ถูก'}
                </div>
              )}
              <div>ไม่ต้องเสียใจ ข้อต่อไปเอาใหม่นะ! 💪</div>
            </div>
          )}

          {myRank && (
            <div style={{ marginTop: '20px' }}>
              <span className="rank-plate">
                🏆 คุณอยู่อันดับที่ #{myRank}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 7. QUESTION_LEADERBOARD: Personal score progress
  if (gameState === 'QUESTION_LEADERBOARD') {
    return (
      <div className="player-container game-bg" style={{ backgroundColor: 'var(--theme-yellow)', color: '#333', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
        <FloatingParticles />
        <SoundToggle />

        <div className="status-message" style={{ animation: 'none', position: 'relative', zIndex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.95)', padding: '36px 28px', borderRadius: '24px', boxShadow: '0 12px 30px rgba(0,0,0,0.18)', width: '100%', maxWidth: '360px' }}>
          <div className="avatar-bubble" style={{ background: currentAvatar.bg, width: '64px', height: '64px', fontSize: '2.4rem', margin: '0 auto 12px' }}>
            {currentAvatar.emoji}
          </div>

          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4b5563', margin: '0 0 6px 0' }}>
            {nickname}
          </h3>

          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#6b7280' }}>
            คะแนนสะสมของคุณ
          </div>
          <AnimatedScore value={myScore} size="3.5rem" />

          {myRank && (
            <div style={{ marginTop: '16px' }}>
              <span className="rank-plate" style={{ background: '#f3f4f6', color: '#111827', fontSize: '1.3rem', padding: '8px 20px' }}>
                🏅 อันดับที่ #{myRank}
              </span>
            </div>
          )}

          {streak >= 2 && (
            <div style={{ marginTop: '14px' }}>
              <span className="streak-badge" style={{ fontSize: '1.1rem', padding: '6px 18px' }}>
                🔥 {streak} Streak
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 8. GAME_OVER: Final celebration
  if (gameState === 'GAME_OVER') {
    const rank = finalResult?.myRank;
    const podium = rank && rank <= 3;

    return (
      <div className="player-container game-bg" style={{ backgroundColor: podium ? 'var(--kahoot-green)' : 'var(--kahoot-purple)', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
        <SoundToggle />
        <Confetti count={podium ? 220 : 100} duration={8000} />
        <FloatingParticles />

        <div className="status-message" style={{ animation: 'none', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <span className="trophy" style={{ fontSize: '6.5rem' }}>{podium ? '🏆' : '🎮'}</span>

          <h1 style={{ fontSize: '3rem', fontWeight: 900, margin: '10px 0' }}>
            {podium ? 'ยินดีด้วย! คุณติดอันดับท็อป!' : 'จบเกมแล้ว! เก่งมาก!'}
          </h1>

          <div style={{ fontSize: '1.3rem', opacity: 0.95 }}>คะแนนรวมสุดท้ายของคุณ</div>
          <AnimatedScore value={finalResult?.myScore ?? myScore} size="3.8rem" />

          {rank ? (
            <div style={{ marginTop: '16px' }}>
              <span className="rank-plate" style={{ fontSize: '1.8rem', background: '#ffd700', color: '#111827', fontWeight: 900 }}>
                🎖️ อันดับที่ #{rank}
              </span>
            </div>
          ) : null}

          <div style={{ marginTop: '28px' }}>
            <button
              className="btn-primary"
              style={{ fontSize: '1.2rem', padding: '12px 32px', borderRadius: '999px', background: '#ffffff', color: '#111827' }}
              onClick={() => navigate('/')}
            >
              กลับหน้าแรก
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Score that ticks up to its new value
function AnimatedScore({ value, size }) {
  const shown = useCountUp(value, 1200);
  return <div style={{ fontSize: size, margin: '10px 0', fontWeight: 900, color: '#111827' }}>{shown}</div>;
}
