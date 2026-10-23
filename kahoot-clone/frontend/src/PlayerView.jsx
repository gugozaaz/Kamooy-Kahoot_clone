import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from './lib/api';
import { useGameState } from './lib/useGameState';
import { useCountUp } from './lib/useCountUp';
import { sfx } from './lib/sound';
import Confetti from './components/Confetti';
import SoundToggle from './components/SoundToggle';
import FloatingParticles from './components/FloatingParticles';
import FloatingReactions from './components/FloatingReactions';
import ReactionDock from './components/ReactionDock';
import AvatarPickerModal from './components/AvatarPickerModal';
import { getAvatar } from './lib/avatars';

const CHOICE_SYMBOLS = ['▲', '◆', '●', '■', '★', '⬟'];
const CHOICE_NAMES = ['สีแดง (▲)', 'สีน้ำเงิน (◆)', 'สีเหลือง (●)', 'สีเขียว (■)', 'สีฟ้า (★)', 'สีม่วง (⬟)'];

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

  // Avatar & Title customization
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customEmoji, setCustomEmoji] = useState(null);
  const [customTitle, setCustomTitle] = useState('⚡ สายฟ้าแลบ');

  // Gamification: Power-Ups (1 of each per game)
  const [powerupsUsed, setPowerupsUsed] = useState({
    fiftyFifty: false,
    doublePoints: false,
    streakShield: false,
  });
  const [activePowerup, setActivePowerup] = useState(null); // '2x' | 'shield'
  const [eliminatedChoices, setEliminatedChoices] = useState([]);
  const [shieldProtected, setShieldProtected] = useState(false);

  const { state } = useGameState({ pin, role: 'player', token: playerId, enabled: !!playerId });

  const gameState = state?.status || 'LOBBY';
  const currentQuestion = state?.question;
  const myScore = state?.myScore || 0;
  const resultData = state?.result;
  const finalResult = state?.finalLeaderboard;
  const myRank = resultData?.myRank || finalResult?.myRank || null;

  const currentAvatar = getAvatar(nickname || 'Player', customEmoji);

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

  // New question -> reset answering and round powerups
  useEffect(() => {
    setSelectedIndex(null);
    setSubmitted(false);
    setTappedIndex(null);
    setAnswerTimeSeconds(null);
    setActivePowerup(null);
    setEliminatedChoices([]);
    setShieldProtected(false);
  }, [state?.currentIndex]);

  // Survive a page refresh within the same game
  useEffect(() => {
    const savedPin = initialPin || pin;
    if (!savedPin) return;
    const savedId = sessionStorage.getItem(`kamooy:${savedPin}`);
    const savedNick = sessionStorage.getItem(`kamooy_nick:${savedPin}`);
    const savedEmoji = sessionStorage.getItem(`kamooy_emoji:${savedPin}`);
    const savedTitle = sessionStorage.getItem(`kamooy_title:${savedPin}`);
    if (savedId) {
      setPin(savedPin);
      setPlayerId(savedId);
      if (savedNick) setNickname(savedNick);
      if (savedEmoji) setCustomEmoji(savedEmoji);
      if (savedTitle) setCustomTitle(savedTitle);
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
          if (activePowerup === 'shield') {
            setShieldProtected(true);
            sfx.powerup();
          } else {
            setStreak(0);
            sfx.wrong();
          }
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
      const displayName = customTitle ? `${nickname.trim()} (${customTitle})` : nickname.trim();
      const res = await api.joinGame(pin.trim(), displayName);
      sessionStorage.setItem(`kamooy:${pin.trim()}`, res.playerId);
      sessionStorage.setItem(`kamooy_nick:${pin.trim()}`, displayName);
      if (customEmoji) sessionStorage.setItem(`kamooy_emoji:${pin.trim()}`, customEmoji);
      if (customTitle) sessionStorage.setItem(`kamooy_title:${pin.trim()}`, customTitle);
      setPlayerId(res.playerId);
      sfx.join();
    } catch (err) {
      alert(err.message || 'ไม่สามารถเข้าร่วมเกมได้');
    }
  };

  // Power-up triggers
  const activateFiftyFifty = () => {
    if (powerupsUsed.fiftyFifty || submitted || gameState !== 'QUESTION_ACTIVE') return;
    sfx.unlock();
    sfx.powerup();
    setPowerupsUsed(prev => ({ ...prev, fiftyFifty: true }));

    // Pick up to 2 choices that are eliminated (not choice 0 if only 2 choices)
    const choicesCount = currentQuestion?.choicesCount || 4;
    if (choicesCount > 2) {
      // Pick 2 random choices to eliminate
      const allIndices = Array.from({ length: choicesCount }, (_, i) => i);
      const shuffled = allIndices.sort(() => Math.random() - 0.5);
      setEliminatedChoices(shuffled.slice(0, 2));
    }
  };

  const activateDoublePoints = () => {
    if (powerupsUsed.doublePoints || submitted || gameState !== 'QUESTION_ACTIVE') return;
    sfx.unlock();
    sfx.powerup();
    setPowerupsUsed(prev => ({ ...prev, doublePoints: true }));
    setActivePowerup('2x');
  };

  const activateStreakShield = () => {
    if (powerupsUsed.streakShield || submitted || gameState !== 'QUESTION_ACTIVE') return;
    sfx.unlock();
    sfx.powerup();
    setPowerupsUsed(prev => ({ ...prev, streakShield: true }));
    setActivePowerup('shield');
  };

  const selectChoice = (index) => {
    if (submitted) return;
    if (eliminatedChoices.includes(index)) return;
    sfx.pop();
    if (navigator.vibrate) navigator.vibrate(35);

    const elapsedMs = Math.max(100, Date.now() - questionStartTs.current);
    setAnswerTimeSeconds((elapsedMs / 1000).toFixed(1));

    setTappedIndex(index);
    setSelectedIndex(index);
    setSubmitted(true);

    api.submitAnswer(pin.trim(), playerId, index, activePowerup).catch(() => {});
  };

  const joined = !!playerId;

  // 1. Not joined: Arcade login screen
  if (!joined) {
    return (
      <div className="player-container game-bg player-scrollable" style={{ backgroundColor: '#ffcc00', minHeight: '100vh', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', position: 'relative' }}>
        <FloatingParticles />
        <SoundToggle />

        {showAvatarModal && (
          <AvatarPickerModal
            selectedEmoji={customEmoji || currentAvatar.emoji}
            onSelectEmoji={setCustomEmoji}
            selectedTitle={customTitle}
            onSelectTitle={setCustomTitle}
            onClose={() => setShowAvatarModal(false)}
          />
        )}

        <div style={{ textAlign: 'center', marginBottom: '20px', position: 'relative', zIndex: 1, maxWidth: '90%' }}>
          <h1 style={{ fontSize: 'clamp(2.8rem, 8vw, 4.5rem)', color: '#fff', textShadow: '3px 3px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000', margin: 0, letterSpacing: '2px', lineHeight: 1.15 }}>
            Kamooy!
          </h1>
          <p style={{ color: '#333', fontSize: 'clamp(1rem, 3.5vw, 1.2rem)', fontWeight: 800, margin: '8px 0 0 0' }}>
            ประลองปัญญา ท้าความเร็ว ⚡
          </p>
        </div>

        <form className="join-form" onSubmit={handleJoin} style={{
          backgroundColor: '#fff',
          padding: '24px 20px',
          borderRadius: '24px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.22)',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '350px',
          position: 'relative',
          zIndex: 1,
          boxSizing: 'border-box'
        }}>
          {initialPin ? (
            <div style={{ textAlign: 'center', marginBottom: '14px', background: '#f3f4f6', padding: '10px', borderRadius: '12px', fontWeight: 900, color: '#111827', fontSize: '1.2rem' }}>
              PIN: {initialPin}
            </div>
          ) : (
            <input
              className="input-field"
              placeholder="Game PIN (เลข 6 หลัก)"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ marginBottom: '14px', fontSize: '1.25rem', textAlign: 'center', fontWeight: 'bold' }}
              maxLength={6}
            />
          )}

          <input
            className="input-field"
            placeholder="ใส่ชื่อเล่นของคุณ (Nickname)"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            style={{ marginBottom: '14px', fontSize: '1.15rem', textAlign: 'center', fontWeight: 'bold' }}
            maxLength={18}
          />

          {/* Clickable Avatar Card */}
          <div
            onClick={() => { sfx.pop(); setShowAvatarModal(true); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              background: '#f8fafc',
              padding: '8px 12px',
              borderRadius: '16px',
              border: '2px dashed #cbd5e1',
              cursor: 'pointer',
              transition: 'transform 0.15s ease'
            }}
            title="คลิกเพื่อเลือกอวาตาร์ & ฉายา"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="avatar-bubble" style={{ background: currentAvatar.bg, width: '40px', height: '40px', fontSize: '1.4rem' }}>
                {customEmoji || currentAvatar.emoji}
              </div>
              <div style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontWeight: 800, color: '#1f2937', fontSize: '0.9rem' }}>
                  {customTitle}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  คลิกเพื่อเปลี่ยนตัวละคร
                </span>
              </div>
            </div>
            <span style={{ fontSize: '1rem' }}>✏️</span>
          </div>

          <button
            className="btn-kamooy btn-kamooy-primary"
            type="submit"
            style={{ width: '100%', height: '50px', fontSize: '1.2rem', borderRadius: '14px' }}
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
      <div className="player-container game-bg player-scrollable" style={{ backgroundColor: 'var(--kahoot-green)', color: 'white', minHeight: '100vh', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', position: 'relative' }}>
        <FloatingParticles />
        <FloatingReactions reactions={state?.reactions} />
        <SoundToggle />

        <div className="status-message" style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '380px' }}>
          <div
            className="podium-avatar-circle"
            style={{
              background: currentAvatar.bg,
              width: 'clamp(76px, 20vw, 96px)',
              height: 'clamp(76px, 20vw, 96px)',
              fontSize: 'clamp(2.8rem, 8vw, 3.4rem)',
              margin: '0 auto 12px',
              animation: 'trophyIn 0.6s ease both, floatY 2.6s ease-in-out infinite'
            }}
          >
            {customEmoji || currentAvatar.emoji}
          </div>

          <h2 style={{ fontSize: 'clamp(1.8rem, 6vw, 2.4rem)', margin: '0 0 6px 0', fontWeight: 900, lineHeight: 1.2 }}>
            ยินดีต้อนรับ {nickname}!
          </h2>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '4px 14px', borderRadius: '999px', fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px' }}>
            ฉายา: {customTitle}
          </div>
          <p style={{ fontSize: 'clamp(1rem, 3.5vw, 1.2rem)', opacity: 0.95, margin: 0, fontWeight: 700 }}>
            คุณเข้าร่วมห้องสำเร็จแล้ว 🎉
          </p>

          <div className="radar-scanner-box" style={{ width: '130px', height: '130px', margin: '14px auto' }}>
            <div className="radar-ring" />
            <div className="radar-ring" />
            <div className="radar-ring" />
            <div className="radar-center-icon" style={{ fontSize: '2.8rem' }}>🎮</div>
          </div>

          <div className="waiting-dots-inline" style={{ fontSize: '1.1rem', marginTop: '10px', fontWeight: 700, opacity: 0.9 }}>
            รอโฮสต์กดเริ่มเกม
          </div>

          {/* Player Live Emoji Dock */}
          <div style={{ marginTop: '16px' }}>
            <ReactionDock pin={pin} nickname={nickname} />
          </div>
        </div>
      </div>
    );
  }

  // 3. QUESTION_PREVIEW: Synchronized 3-2-1
  if (gameState === 'QUESTION_PREVIEW') {
    const is321 = previewTimeLeft <= 3 && previewTimeLeft > 0;
    return (
      <div className="player-container game-bg" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', height: '100dvh', maxHeight: '100dvh', padding: '16px', backgroundColor: 'var(--theme-yellow)', overflow: 'hidden' }}>
        <FloatingParticles />
        <FloatingReactions reactions={state?.reactions} />
        <SoundToggle />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%', maxWidth: '440px' }}>
          <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.18)', color: '#333', padding: '4px 16px', borderRadius: '999px', fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>
            ⚡ คำถามข้อที่ {(state?.currentIndex || 0) + 1}
          </div>

          <div className="preview-question" style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '16px', boxShadow: '0 6px 18px rgba(0,0,0,0.15)', fontSize: 'clamp(1.2rem, 4.5vw, 1.8rem)', fontWeight: 800, color: '#1f2937', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
            {currentQuestion?.text}
          </div>

          <div style={{ minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {is321 ? (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div key={`wave-${previewTimeLeft}`} className="countdown-shockwave" style={{ width: '110px', height: '110px' }} />
                <span key={`count-${previewTimeLeft}`} className="countdown-pop-321" style={{ fontSize: 'clamp(5rem, 16vw, 7rem)' }}>
                  {previewTimeLeft}
                </span>
              </div>
            ) : previewTimeLeft === 0 ? (
              <span className="countdown-pop-321" style={{ fontSize: '4.5rem', color: '#26890c' }}>GO!</span>
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
      <div className="player-container game-bg" style={{ backgroundColor: 'var(--theme-yellow)', color: '#333', height: '100vh', height: '100dvh', maxHeight: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', position: 'relative' }}>
        <FloatingParticles />
        <FloatingReactions reactions={state?.reactions} />
        <SoundToggle />

        {streak >= 2 && <div className="streak-fire-border" />}

        <div className="status-message" style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '380px' }}>
          <div className="radar-scanner-box" style={{ width: '130px', height: '130px', margin: '12px auto' }}>
            <div className="radar-ring" />
            <div className="radar-ring" />
            <div className="radar-center-icon" style={{ fontSize: '2.8rem' }}>🔒</div>
          </div>

          <h2 style={{ fontSize: 'clamp(1.8rem, 6vw, 2.3rem)', fontWeight: 900, margin: '0 0 8px 0', color: '#1f2937' }}>
            ส่งคำตอบแล้ว!
          </h2>

          {activePowerup && (
            <div style={{ display: 'inline-block', background: '#fef08a', color: '#854d0e', border: '2px solid #ca8a04', padding: '4px 14px', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 800, margin: '4px 0' }}>
              {activePowerup === '2x' ? '🌟 ใช้พลังคะแนนคูณสอง!' : '🛡️ เปิดเกราะป้องกันคอมโบ!'}
            </div>
          )}

          {answerTimeSeconds && (
            <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.12)', padding: '5px 16px', borderRadius: '999px', fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: '6px 0 12px 0' }}>
              ⚡ ตอบในเวลา: {answerTimeSeconds} วินาที!
            </div>
          )}

          <div className="waiting-dots-inline" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4b5563' }}>
            รอลุ้นเฉลยพร้อมเพื่อนๆ
          </div>

          <div style={{ marginTop: '18px' }}>
            <ReactionDock pin={pin} nickname={nickname} />
          </div>
        </div>
      </div>
    );
  }

  // 5. QUESTION_ACTIVE - Not submitted (Arcade Game Controller Pad - Smartphone Portrait First)
  if (gameState === 'QUESTION_ACTIVE' && !submitted) {
    const choicesCount = currentQuestion?.choicesCount || 4;
    const gridLayoutClass = choicesCount === 2 ? 'balanced-pad-grid-2' : choicesCount === 3 ? 'balanced-pad-grid-3' : 'balanced-pad-grid-4';
    const enablePowerups = state?.settings?.enablePowerups ?? false;
    const showAnswerText = state?.settings?.showAnswerText ?? true;

    return (
      <div className="player-container game-bg" style={{
        height: '100vh',
        height: '100dvh',
        maxHeight: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '10px 12px',
        position: 'relative',
        boxSizing: 'border-box'
      }}>
        <FloatingParticles />
        <FloatingReactions reactions={state?.reactions} />
        <SoundToggle />

        {streak >= 2 && <div className="streak-fire-border" />}

        {/* Top Header / Streak info with safe left padding for top-left SoundToggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0', paddingLeft: '48px', position: 'relative', zIndex: 1 }}>
          <span style={{ background: 'rgba(255,255,255,0.92)', color: '#111827', padding: '4px 14px', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            🎮 เลือกคำตอบ
          </span>

          {streak >= 2 && (
            <span className="streak-badge" style={{ margin: 0, padding: '4px 14px', fontSize: '0.9rem' }}>
              🔥 {streak} Streak!
            </span>
          )}
        </div>

        {/* Tactical Power-Ups Bar (Only displayed if enabled in quiz settings, default: OFF) */}
        {enablePowerups && (
          <div className="powerup-bar" style={{ position: 'relative', zIndex: 1 }}>
            <button
              type="button"
              onClick={activateFiftyFifty}
              disabled={powerupsUsed.fiftyFifty || choicesCount <= 2}
              className={`powerup-btn${eliminatedChoices.length > 0 ? ' active-glow' : ''}`}
              title="ตัด 2 คำตอบที่ผิดออก (ใช้ได้ 1 ครั้ง)"
            >
              ⚡ 50:50 {powerupsUsed.fiftyFifty ? '✓' : ''}
            </button>

            <button
              type="button"
              onClick={activateDoublePoints}
              disabled={powerupsUsed.doublePoints}
              className={`powerup-btn${activePowerup === '2x' ? ' active-glow' : ''}`}
              title="คะแนนสองเท่าในข้อนี้ (ใช้ได้ 1 ครั้ง)"
            >
              🌟 x2 {powerupsUsed.doublePoints ? '✓' : ''}
            </button>

            <button
              type="button"
              onClick={activateStreakShield}
              disabled={powerupsUsed.streakShield}
              className={`powerup-btn${activePowerup === 'shield' ? ' active-glow' : ''}`}
              title="เกราะป้องกันคอมโบไม่ให้หลุดหากตอบผิด (ใช้ได้ 1 ครั้ง)"
            >
              🛡️ ป้องกัน {powerupsUsed.streakShield ? '✓' : ''}
            </button>
          </div>
        )}

        {/* Symmetrically Balanced Pad Grid - Fills 100% available space */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative', zIndex: 1, margin: '6px 0', display: 'flex', flexDirection: 'column' }}>
          <div className={gridLayoutClass}>
            {Array.from({ length: choicesCount }).map((_, i) => {
              const isEliminated = eliminatedChoices.includes(i);
              const choiceText = currentQuestion?.choices?.[i];

              return (
                <button
                  key={i}
                  disabled={isEliminated}
                  className={`pad-btn pad-btn-arcade c-${i % 6}${tappedIndex === i ? ' tapped' : ''}${isEliminated ? ' pad-btn-eliminated' : ''}`}
                  aria-label={`Answer ${i + 1}`}
                  onClick={() => selectChoice(i)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: showAnswerText && choiceText ? '10px 12px' : '0'
                  }}
                >
                  {showAnswerText && choiceText ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', boxSizing: 'border-box' }}>
                      <span className="pad-symbol" style={{ fontSize: choicesCount <= 2 ? '2.4rem' : '1.8rem', opacity: 0.85, marginBottom: '6px' }}>
                        {isEliminated ? '✕' : CHOICE_SYMBOLS[i % CHOICE_SYMBOLS.length]}
                      </span>
                      <span style={{
                        fontSize: choicesCount <= 2 ? 'clamp(1.4rem, 5.5vw, 2.2rem)' : 'clamp(1.15rem, 4.2vw, 1.65rem)',
                        fontWeight: 800,
                        lineHeight: 1.25,
                        textAlign: 'center',
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        color: '#ffffff',
                        textShadow: '0 2px 4px rgba(0,0,0,0.35)'
                      }}>
                        {isEliminated ? 'ตัดออกแล้ว' : choiceText}
                      </span>
                    </div>
                  ) : (
                    <span className="pad-symbol" style={{ fontSize: choicesCount <= 2 ? 'clamp(4.5rem, 15vw, 6rem)' : 'clamp(3.8rem, 12vw, 5rem)' }}>
                      {isEliminated ? '✕' : CHOICE_SYMBOLS[i % CHOICE_SYMBOLS.length]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reaction Dock */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <ReactionDock pin={pin} nickname={nickname} />
        </div>
      </div>
    );
  }

  // 6. QUESTION_RESULT: High emotion victory or sympathy
  if (gameState === 'QUESTION_RESULT') {
    const isCorrect = wasCorrect;

    return (
      <div
        className={`player-container game-bg player-scrollable ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`}
        style={{
          backgroundColor: isCorrect ? 'var(--kahoot-green)' : 'var(--kahoot-red)',
          color: 'white',
          minHeight: '100vh',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 16px',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        <FloatingParticles />
        <FloatingReactions reactions={state?.reactions} />
        <SoundToggle />
        {isCorrect && <Confetti count={140} duration={3500} spread="burst" />}

        {streak >= 2 && <div className="streak-fire-border" />}

        <div className="status-message" style={{ animation: 'none', position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <span className="feedback-icon" style={{ fontSize: 'clamp(4rem, 13vw, 5.5rem)' }}>{isCorrect ? '🎉' : '💥'}</span>

          <h2 style={{ fontSize: 'clamp(1.8rem, 6vw, 2.6rem)', fontWeight: 900, margin: '4px 0 10px 0', lineHeight: 1.2 }}>
            {isCorrect ? 'ถูกต้องแล้ว!' : 'ยังไม่ถูกนะ!'}
          </h2>

          {isCorrect && pointsGained > 0 && (
            <div className="score-pop" style={{ fontSize: 'clamp(2.2rem, 7vw, 3rem)', color: '#ffeb3b', textShadow: '0 4px 12px rgba(0,0,0,0.35)' }}>
              +{pointsGained} คะแนน {activePowerup === '2x' ? ' (x2 Booster!)' : ''}
              {resultData?.streakBonus > 0 && (
                <div style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 800, marginTop: '4px' }}>
                  🔥 รวม Streak Bonus +{resultData.streakBonus} แต้ม!
                </div>
              )}
            </div>
          )}

          {isCorrect && streak >= 2 && (
            <div style={{ marginTop: '12px' }}>
              <span className="streak-badge" style={{ fontSize: 'clamp(1rem, 3.5vw, 1.25rem)', padding: '8px 20px' }}>
                🔥 STREAK COMBO x{streak}! กำลังไฟลุก!
              </span>
            </div>
          )}

          {!isCorrect && (
            <div style={{ marginTop: '12px', fontSize: '1.1rem', fontWeight: 700, opacity: 0.95 }}>
              {shieldProtected && (
                <div style={{ background: '#ca8a04', color: '#fff', padding: '8px 16px', borderRadius: '12px', display: 'inline-block', marginBottom: '10px', fontWeight: 800, fontSize: '0.95rem' }}>
                  🛡️ คอมโบยังอยู่! Streak Shield ปกป้องคะแนนต่อเนื่องของคุณไว้!
                </div>
              )}
              {resultData?.correctAnswers?.length > 0 && (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 16px', borderRadius: '12px', display: 'inline-block', marginBottom: '8px' }}>
                  💡 ข้อที่ถูกคือ: {CHOICE_NAMES[resultData.correctAnswers[0]] || 'คำตอบที่ถูก'}
                </div>
              )}
              <div>ไม่ต้องเสียใจ ข้อต่อไปเอาใหม่นะ! 💪</div>
            </div>
          )}

          {myRank && (
            <div style={{ marginTop: '18px' }}>
              {myRank === 1 ? (
                <span className="rank-plate" style={{ fontSize: 'clamp(1.1rem, 4vw, 1.35rem)', background: '#ffd700', color: '#111827', fontWeight: 900 }}>
                  🥇 คุณคือผู้นำอันดับ 1! ยอดเยี่ยมมาก!
                </span>
              ) : (
                <div>
                  <span className="rank-plate" style={{ fontSize: 'clamp(1.1rem, 4vw, 1.3rem)' }}>
                    🏆 คุณอยู่อันดับที่ #{myRank}
                  </span>
                  {resultData?.pointsBehindLeader > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '1.05rem', fontWeight: 800, color: 'rgba(255,255,255,0.95)', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                      ⚡ ตามหลังอันดับ 1 อยู่เพียง {resultData.pointsBehindLeader} คะแนน!
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <ReactionDock pin={pin} nickname={nickname} />
          </div>
        </div>
      </div>
    );
  }

  // 7. QUESTION_LEADERBOARD: Personal score progress
  if (gameState === 'QUESTION_LEADERBOARD') {
    return (
      <div className="player-container game-bg player-scrollable" style={{ backgroundColor: 'var(--theme-yellow)', color: '#333', minHeight: '100vh', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', position: 'relative', boxSizing: 'border-box' }}>
        <FloatingParticles />
        <FloatingReactions reactions={state?.reactions} />
        <SoundToggle />

        {streak >= 2 && <div className="streak-fire-border" />}

        <div className="status-message" style={{ animation: 'none', position: 'relative', zIndex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.95)', padding: 'clamp(24px, 6vw, 36px) clamp(16px, 5vw, 28px)', borderRadius: '24px', boxShadow: '0 12px 30px rgba(0,0,0,0.18)', width: '100%', maxWidth: '380px', boxSizing: 'border-box' }}>
          <div className="avatar-bubble" style={{ background: currentAvatar.bg, width: '68px', height: '68px', fontSize: '2.6rem', margin: '0 auto 12px' }}>
            {customEmoji || currentAvatar.emoji}
          </div>

          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0 0 4px 0' }}>
            {nickname}
          </h3>
          <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 700, marginBottom: '12px' }}>
            {customTitle}
          </div>

          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#6b7280' }}>
            คะแนนสะสมของคุณ
          </div>
          <AnimatedScore value={myScore} size="clamp(2.8rem, 8vw, 3.5rem)" />

          {myRank && (
            <div style={{ marginTop: '14px' }}>
              {myRank === 1 ? (
                <span className="rank-plate" style={{ background: '#ffd700', color: '#111827', fontWeight: 900, fontSize: 'clamp(1.1rem, 3.8vw, 1.35rem)', padding: '8px 20px' }}>
                  🥇 คุณคือผู้นำอันดับ 1!
                </span>
              ) : (
                <div>
                  <span className="rank-plate" style={{ background: '#f3f4f6', color: '#111827', fontSize: 'clamp(1.1rem, 3.8vw, 1.3rem)', padding: '8px 20px' }}>
                    🏅 อันดับที่ #{myRank}
                  </span>
                  {state?.pointsBehindLeader > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '0.95rem', fontWeight: 800, color: '#4b5563' }}>
                      ตามหลังอันดับ 1 อยู่ {state.pointsBehindLeader} คะแนน
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {streak >= 2 && (
            <div style={{ marginTop: '14px' }}>
              <span className="streak-badge" style={{ fontSize: '1.05rem', padding: '6px 18px' }}>
                🔥 {streak} Streak
              </span>
            </div>
          )}

          <div style={{ marginTop: '18px' }}>
            <ReactionDock pin={pin} nickname={nickname} />
          </div>
        </div>
      </div>
    );
  }

  // 8. GAME_OVER: Final celebration
  if (gameState === 'GAME_OVER') {
    const rank = finalResult?.myRank;
    const podium = rank && rank <= 3;

    return (
      <div className="player-container game-bg player-scrollable" style={{ backgroundColor: podium ? 'var(--kahoot-green)' : 'var(--kahoot-purple)', color: 'white', minHeight: '100vh', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', position: 'relative', boxSizing: 'border-box' }}>
        <SoundToggle />
        <FloatingReactions reactions={state?.reactions} />
        <Confetti count={podium ? 220 : 100} duration={8000} />
        <FloatingParticles />

        <div className="status-message" style={{ animation: 'none', position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '420px', width: '100%' }}>
          <span className="trophy" style={{ fontSize: 'clamp(4rem, 13vw, 6rem)' }}>{podium ? '🏆' : '🎮'}</span>

          <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 2.6rem)', fontWeight: 900, margin: '8px 0', lineHeight: 1.2 }}>
            {podium ? 'ยินดีด้วย! คุณติดอันดับท็อป!' : 'จบเกมแล้ว! เก่งมาก!'}
          </h1>

          <div style={{ fontSize: '1.2rem', opacity: 0.95 }}>คะแนนรวมสุดท้ายของคุณ</div>
          <AnimatedScore value={finalResult?.myScore ?? myScore} size="clamp(3rem, 9vw, 3.8rem)" />

          {rank ? (
            <div style={{ marginTop: '14px' }}>
              <span className="rank-plate" style={{ fontSize: 'clamp(1.3rem, 4.5vw, 1.7rem)', background: '#ffd700', color: '#111827', fontWeight: 900 }}>
                🎖️ อันดับที่ #{rank}
              </span>
            </div>
          ) : null}

          <div style={{ marginTop: '24px' }}>
            <button
              className="btn-kamooy btn-kamooy-secondary"
              style={{ fontSize: '1.15rem', padding: '0 32px', height: '50px', borderRadius: '999px', background: '#ffffff', color: '#111827' }}
              onClick={() => navigate('/')}
            >
              กลับหน้าแรก
            </button>
          </div>

          <div style={{ marginTop: '20px' }}>
            <ReactionDock pin={pin} nickname={nickname} />
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
