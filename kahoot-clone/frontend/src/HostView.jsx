import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from './lib/api';
import { useGameState } from './lib/useGameState';
import { useCountUp } from './lib/useCountUp';
import { sfx } from './lib/sound';
import Confetti from './components/Confetti';
import SoundToggle from './components/SoundToggle';
import CountdownRing from './components/CountdownRing';
import FloatingParticles from './components/FloatingParticles';
import Podium from './components/Podium';
import { getAvatar } from './lib/avatars';
import { ensureSampleQuiz } from './lib/sampleQuiz';

const CHOICE_COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#2eb8a6', '#8e44ad'];
const CHOICE_SYMBOLS = ['▲', '◆', '●', '■', '★', '⬟'];
const MEDALS = ['🥇', '🥈', '🥉'];

export default function HostView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pin, setPin] = useState(null);
  const [hostId, setHostId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [previewTimeLeft, setPreviewTimeLeft] = useState(0);
  const [playerBump, setPlayerBump] = useState(false);
  const [answerBump, setAnswerBump] = useState(false);
  const [copied, setCopied] = useState(false);

  const { state, injectState } = useGameState({ pin, role: 'host', token: hostId, enabled: !!pin });

  const gameState = !pin ? 'INIT' : state?.status || 'LOBBY';
  const players = state?.players || [];
  const currentQuestion = state?.question;
  const answersCount = state?.answersCount || 0;
  const resultData = state?.result;
  const leaderboard = state?.finalLeaderboard;
  const questionTotal = currentQuestion?.timeLimit || 30;

  useEffect(() => {
    let timer;
    if (gameState === 'QUESTION_ACTIVE' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  useEffect(() => {
    let timer;
    if (gameState === 'QUESTION_PREVIEW' && previewTimeLeft > 0) {
      timer = setInterval(() => {
        setPreviewTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, previewTimeLeft]);

  // Seed countdowns from server timestamps whenever a phase/question changes
  useEffect(() => {
    if (!state) return;
    if (state.status === 'QUESTION_ACTIVE') {
      setTimeLeft(Math.ceil((state.timeLeftMs || 0) / 1000));
    } else if (state.status === 'QUESTION_PREVIEW') {
      setPreviewTimeLeft(Math.ceil((state.previewTimeLeftMs || 0) / 1000));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.status, state?.currentIndex]);

  // --- Audio cues per phase transition ---
  const prevPhase = useRef(null);
  useEffect(() => {
    if (prevPhase.current === gameState) return;
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
      case 'QUESTION_RESULT':
        sfx.stopMusic();
        sfx.reveal();
        break;
      case 'QUESTION_LEADERBOARD':
        sfx.leaderboard();
        break;
      case 'GAME_OVER':
        sfx.stopMusic();
        break;
      default:
        break;
    }
  }, [gameState]);

  useEffect(() => () => sfx.stopMusic(), []);

  // Clock ticks
  const prevTick = useRef(null);
  useEffect(() => {
    if (gameState !== 'QUESTION_ACTIVE' || timeLeft <= 0) return;
    if (prevTick.current === timeLeft) return;
    prevTick.current = timeLeft;
    if (timeLeft <= 5) sfx.urgentTick();
    else if (timeLeft % 2 === 0) sfx.tick();
  }, [gameState, timeLeft]);

  // Preview 3-2-1 countdown beeps
  const prevPreviewTick = useRef(null);
  useEffect(() => {
    if (gameState !== 'QUESTION_PREVIEW') return;
    if (previewTimeLeft > 3 || previewTimeLeft <= 0) return;
    if (prevPreviewTick.current === previewTimeLeft) return;
    prevPreviewTick.current = previewTimeLeft;
    sfx.countdown();
  }, [gameState, previewTimeLeft]);

  // Player joins lobby -> blip sound + bump
  const prevPlayerCount = useRef(0);
  useEffect(() => {
    if (players.length > prevPlayerCount.current && gameState === 'LOBBY') {
      sfx.join();
      setPlayerBump(true);
      const t = setTimeout(() => setPlayerBump(false), 400);
      prevPlayerCount.current = players.length;
      return () => clearTimeout(t);
    }
    prevPlayerCount.current = players.length;
    return undefined;
  }, [players.length, gameState]);

  // Answer counter bump
  const prevAnswers = useRef(0);
  useEffect(() => {
    if (answersCount > prevAnswers.current) {
      setAnswerBump(true);
      const t = setTimeout(() => setAnswerBump(false), 360);
      prevAnswers.current = answersCount;
      return () => clearTimeout(t);
    }
    prevAnswers.current = answersCount;
    return undefined;
  }, [answersCount]);

  useEffect(() => {
    createGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runHostAction = async (action) => {
    try {
      const res = await api.hostAction(pin, hostId, action);
      if (res.state) injectState(res.state);
    } catch (err) {
      alert(err.message);
    }
  };

  const createGame = () => {
    ensureSampleQuiz();
    const saved = localStorage.getItem('kamooy_presentations');
    let parsed = [];
    try {
      parsed = saved ? JSON.parse(saved) : [];
    } catch {
      parsed = [];
    }

    let presentation = parsed.find(p => p.id === id);
    if (!presentation || !presentation.slides || presentation.slides.length === 0) {
      presentation = parsed[0];
    }
    if (!presentation || !presentation.slides) {
      alert('ไม่พบชุดคำถาม กรุณาสร้างชุดคำถามก่อนเริ่มเล่น');
      return navigate('/dashboard');
    }

    const questions = presentation.slides.map(slide => {
      const validAnswers = slide.answers.filter(a => a.text.trim() !== '');
      const choices = validAnswers.map(a => a.text);
      const correctAnswers = validAnswers.map((a, i) => a.isCorrect ? i : -1).filter(i => i !== -1);

      return {
        text: slide.question,
        image: slide.image,
        isFullScreenImage: slide.isFullScreenImage,
        choices,
        correctAnswers,
        timeLimit: slide.timeLimit || 30,
        scoreMultiplier: slide.scoreMultiplier !== undefined ? slide.scoreMultiplier : 1
      };
    });

    api.createGame(questions)
      .then(res => {
        setPin(res.pin);
        setHostId(res.hostId);
      })
      .catch(err => {
        alert(`ไม่สามารถสร้างเกมได้: ${err.message}`);
        navigate('/dashboard');
      });
  };

  const handleCopyPin = () => {
    if (!pin) return;
    sfx.pop();
    navigator.clipboard?.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (gameState === 'INIT') {
    return (
      <div className="host-container game-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <FloatingParticles />
        <SoundToggle />
        <h1 style={{ fontSize: '4.5rem', color: '#fff', textShadow: '3px 3px 0 #000', margin: 0 }}>Kamooy!</h1>
        <p style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', marginTop: '16px' }}>กำลังสร้างห้องเล่นเกม...</p>
        <div className="spinner" style={{ borderTopColor: '#fff', width: '50px', height: '50px', marginTop: '16px' }}></div>
      </div>
    );
  }

  if (gameState === 'LOBBY') {
    return (
      <div className="host-container game-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', position: 'relative' }}>
        <FloatingParticles />
        <SoundToggle />

        <div className="lobby-header" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {/* PIN Arcade Card */}
            <div
              className="pin-card-arcade"
              onClick={handleCopyPin}
              title="คลิกเพื่อคัดลอก PIN"
            >
              <span className="pin-label-arcade">Game PIN</span>
              <span className="pin-number-arcade">{pin}</span>
              <span className="copy-badge">{copied ? '✓ คัดลอกแล้ว!' : '📋 คลิกเพื่อคัดลอก'}</span>
            </div>

            {/* QR Code */}
            <div style={{
              background: '#ffffff',
              padding: '14px',
              borderRadius: '20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              border: '3px solid #ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <QRCodeSVG value={`${window.location.origin}/play?pin=${pin}`} size={160} />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4b5563', marginTop: '6px' }}>
                📱 สแกนเพื่อเข้าเล่นทันที
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <span className={`player-count${playerBump ? ' bump' : ''}`} style={{ fontSize: '1.4rem' }}>
              <span>👥</span> ผู้เล่นที่เข้าร่วมแล้ว: {players.length} คน
            </span>
          </div>
        </div>

        {/* Players Grid with Avatars */}
        <div className="players-grid" style={{ position: 'relative', zIndex: 1, minHeight: '120px', width: '100%', maxWidth: '1000px', marginBottom: '30px' }}>
          {players.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.3rem', fontWeight: 'bold', gridColumn: '1 / -1', textAlign: 'center', animation: 'floatY 2s ease-in-out infinite' }}>
              🎮 กำลังรอผู้เล่นใส่ PIN เพื่อเข้าสู่เกม...
            </div>
          ) : (
            players.map((p, i) => {
              const avatar = getAvatar(p.nickname);
              return (
                <div key={i} className="player-badge-arcade" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="avatar-bubble" style={{ background: avatar.bg }}>
                    {avatar.emoji}
                  </div>
                  <span>{p.nickname}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Start Game Button */}
        {players.length > 0 && (
          <button
            className="btn-primary btn-glow"
            style={{ position: 'relative', zIndex: 1, fontSize: '1.8rem', padding: '16px 48px', borderRadius: '999px' }}
            onClick={() => { sfx.unlock(); sfx.start(); runHostAction('start-game'); }}
          >
            🚀 เริ่มเกมเลย! (Start Game)
          </button>
        )}
      </div>
    );
  }

  if (gameState === 'QUESTION_PREVIEW') {
    const is321 = previewTimeLeft <= 3 && previewTimeLeft > 0;
    return (
      <div className="host-container game-bg" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', overflow: 'hidden', backgroundColor: 'var(--theme-yellow)' }}>
        <FloatingParticles />
        <SoundToggle />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '90%', maxWidth: '1000px' }}>
          <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.18)', color: '#333', padding: '8px 24px', borderRadius: '999px', fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px' }}>
            ⚡ คำถามข้อที่ {(state?.currentIndex || 0) + 1}
          </div>

          <div className="preview-question" style={{ backgroundColor: '#ffffff', padding: '24px 40px', borderRadius: '18px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', fontSize: '3.2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '36px', display: 'inline-block', width: '100%', boxSizing: 'border-box' }}>
            {currentQuestion?.text}
          </div>

          <div style={{ minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {is321 ? (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div key={`wave-${previewTimeLeft}`} className="countdown-shockwave" />
                <span key={`count-${previewTimeLeft}`} className="countdown-pop-321">
                  {previewTimeLeft}
                </span>
              </div>
            ) : previewTimeLeft === 0 ? (
              <span className="countdown-pop-321" style={{ color: '#26890c' }}>GO!</span>
            ) : (
              <div className="preview-dots"><span /><span /><span /></div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'QUESTION_ACTIVE') {
    return (
      <div className="host-container game-bg" style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '20px', overflow: 'hidden' }}>
        <FloatingParticles />
        <SoundToggle />

        {currentQuestion?.image && currentQuestion?.isFullScreenImage && (
          <img src={currentQuestion.image} alt="Background" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 0, opacity: 0.8 }} />
        )}

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '1200px', margin: '0 auto', width: '100%', flex: 1 }}>

          {/* Top Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <CountdownRing value={timeLeft} total={questionTotal} size={96} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {currentQuestion?.scoreMultiplier > 1 && (
                <span className="streak-badge" style={{ margin: 0, padding: '8px 20px', fontSize: '1.2rem' }}>
                  🔥 คะแนน x{currentQuestion.scoreMultiplier}!
                </span>
              )}
              <span className={`answer-counter${answerBump ? ' bump' : ''}`} style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1f2937', background: 'white', padding: '10px 22px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                ⚡ ตอบแล้ว: {answersCount} / {players.length} คน
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="question-headline" style={{ textAlign: 'center', backgroundColor: '#fff', padding: '22px 32px', borderRadius: '16px', fontSize: '2.5rem', fontWeight: 800, color: '#111827', boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}>
            {currentQuestion?.text}
          </div>

          {/* Middle Image Area */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px 0', minHeight: '120px' }}>
            {currentQuestion?.image && !currentQuestion?.isFullScreenImage && (
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '16px', borderRadius: '16px', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
                <img src={currentQuestion.image} alt="Slide" style={{ maxHeight: '220px', maxWidth: '100%', objectFit: 'contain', borderRadius: '10px' }} />
              </div>
            )}
          </div>

          {/* 4 Answers Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: 'auto' }}>
            {currentQuestion?.choices.map((choice, i) => (
              <div
                key={i}
                className="choice-anim"
                style={{
                  animationDelay: `${i * 0.08}s`,
                  backgroundColor: CHOICE_COLORS[i % CHOICE_COLORS.length],
                  color: 'white',
                  padding: '22px 28px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  fontWeight: 800,
                  fontSize: '1.8rem',
                  minHeight: '84px',
                  boxShadow: '0 6px 0 rgba(0,0,0,0.22), 0 10px 20px rgba(0,0,0,0.15)'
                }}
              >
                <span style={{ fontSize: '2.2rem', opacity: 0.95, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  {CHOICE_SYMBOLS[i % CHOICE_SYMBOLS.length]}
                </span>
                <div style={{ flex: 1 }}>{choice}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'QUESTION_RESULT') {
    const totalVotes = Object.values(resultData?.answersStats || {}).reduce((a, b) => a + b, 0);

    return (
      <div className="host-container game-bg" style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '20px', overflow: 'hidden' }}>
        <FloatingParticles />
        <SoundToggle />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '1200px', margin: '0 auto', width: '100%', flex: 1 }}>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              className="btn-primary btn-glow"
              style={{ fontSize: '1.4rem', padding: '12px 36px', borderRadius: '999px' }}
              onClick={() => runHostAction('show-leaderboard')}
            >
              ดูคะแนนสรุป ➔
            </button>
          </div>

          <div className="question-headline" style={{ textAlign: 'center', backgroundColor: '#fff', padding: '20px 30px', borderRadius: '16px', fontSize: '2.3rem', fontWeight: 800, boxShadow: '0 6px 20px rgba(0,0,0,0.1)' }}>
            📊 ผลการตอบ: {currentQuestion?.text}
          </div>

          {/* Bar Chart Race */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', padding: '24px 0', minHeight: '220px', gap: '40px' }}>
            {currentQuestion?.choices.map((choice, i) => {
              const votes = resultData?.answersStats[i] || 0;
              const percent = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
              const height = Math.max(percent, 8);
              const isCorrect = resultData?.correctAnswers.includes(i);

              return (
                <div key={`poll-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: '120px', height: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                    <VoteCount value={votes} />
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: isCorrect ? '#26890c' : '#6b7280' }}>
                      {percent}%
                    </span>
                  </div>
                  <div
                    className={`c-${i} poll-bar${isCorrect ? ' correct' : ''}`}
                    style={{
                      width: '100%',
                      height: `${height}%`,
                      opacity: isCorrect ? 1 : 0.45,
                      borderRadius: '12px 12px 0 0',
                      boxShadow: isCorrect ? '0 0 25px rgba(38,137,12,0.8)' : '0 2px 8px rgba(0,0,0,0.2)'
                    }}
                  ></div>
                </div>
              );
            })}
          </div>

          {/* Choices summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: 'auto' }}>
            {currentQuestion?.choices.map((choice, i) => {
              const isCorrect = resultData?.correctAnswers.includes(i);
              return (
                <div
                  key={i}
                  className={isCorrect ? 'choice-correct' : 'choice-wrong'}
                  style={{
                    backgroundColor: CHOICE_COLORS[i % CHOICE_COLORS.length],
                    color: 'white',
                    padding: '20px 28px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '18px',
                    fontWeight: 800,
                    fontSize: '1.8rem',
                    minHeight: '80px',
                    boxShadow: isCorrect ? '0 0 25px rgba(38,137,12,0.9)' : '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  <span style={{ fontSize: '2.2rem', opacity: 0.95 }}>{CHOICE_SYMBOLS[i % CHOICE_SYMBOLS.length]}</span>
                  <div style={{ flex: 1 }}>{choice}</div>
                  {isCorrect && <span className="check-mark" style={{ fontSize: '2.6rem' }}>✔</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'QUESTION_LEADERBOARD') {
    return (
      <div className="host-container game-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative' }}>
        <FloatingParticles />
        <SoundToggle />

        <div className="leaderboard" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '750px', background: 'rgba(255, 255, 255, 0.95)', padding: '36px', borderRadius: '24px', boxShadow: '0 16px 40px rgba(0,0,0,0.2)' }}>
          <h2 style={{ fontSize: '2.6rem', fontWeight: 900, textAlign: 'center', color: '#111827', margin: '0 0 24px 0' }}>
            🏆 ตารางคะแนนผู้นำ (Top Players)
          </h2>

          {resultData?.leaderboard.map((p, i) => (
            <LeaderRow key={i} player={p} index={i} />
          ))}

          <button
            className="btn-primary btn-glow"
            onClick={() => runHostAction('next-question')}
            style={{ width: '100%', marginTop: '28px', fontSize: '1.5rem', padding: '16px', borderRadius: '14px' }}
          >
            คำถามถัดไป ➔
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'GAME_OVER') {
    return (
      <div className="host-container game-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 20px', position: 'relative', backgroundColor: 'var(--kahoot-purple)' }}>
        <SoundToggle />
        <Confetti count={260} duration={9000} />
        <FloatingParticles />

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '1000px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3.6rem', fontWeight: 900, color: '#ffffff', textShadow: '0 4px 12px rgba(0,0,0,0.3)', margin: '0 0 20px 0' }}>
            🎉 สรุปผลการแข่งขันรอบชิงชนะเลิศ!
          </h1>

          {/* 3-Tier Olympic Podium */}
          <Podium players={leaderboard || []} />

          <div style={{ marginTop: '36px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button
              className="btn-primary btn-glow"
              onClick={() => navigate('/dashboard')}
              style={{ fontSize: '1.4rem', padding: '14px 36px', borderRadius: '999px' }}
            >
              กลับหน้าจัดการ (Dashboard)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Vote tally that counts up as the bar grows
function VoteCount({ value }) {
  const shown = useCountUp(value, 900);
  return <span style={{ fontWeight: 900, fontSize: '2rem', color: '#111827' }}>{shown}</span>;
}

// Staggered leaderboard row with avatar and crown
function LeaderRow({ player, index, showRankChange = true }) {
  const score = useCountUp(player.score, 1100);
  const avatar = getAvatar(player.nickname);

  useEffect(() => {
    if (showRankChange && player.rankChange === 'up' && index < 3) {
      const t = setTimeout(() => sfx.rankUp(), 400 + index * 120);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`lb-row rank-anim${index === 0 ? ' is-leader' : ''}`}
      style={{
        animationDelay: `${index * 0.12}s`,
        display: 'flex',
        alignItems: 'center',
        padding: '14px 20px',
        marginBottom: '10px',
        borderRadius: '14px',
        background: index === 0 ? 'linear-gradient(90deg, #fff9db, #fff3bf)' : '#f9fafb',
        border: index === 0 ? '2px solid #ffd43b' : '1px solid #e5e7eb',
        boxShadow: index === 0 ? '0 4px 14px rgba(255, 212, 59, 0.35)' : 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '1.4rem', fontWeight: 900, minWidth: '32px' }}>
          {MEDALS[index] || `${index + 1}.`}
        </span>
        <div className="avatar-bubble" style={{ background: avatar.bg, width: '36px', height: '36px', fontSize: '1.2rem' }}>
          {avatar.emoji}
        </div>
        <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1f2937' }}>
          {player.nickname}
        </span>
      </div>

      <span style={{ flex: 1 }}></span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#111827' }}>{score} pts</span>
        {showRankChange && (
          <span className={`rank-indicator ${player.rankChange || 'same'}`} style={{ fontWeight: 900 }}>
            {player.rankChange === 'up' ? '▲' : player.rankChange === 'down' ? '▼' : '-'}
          </span>
        )}
      </div>
    </div>
  );
}
