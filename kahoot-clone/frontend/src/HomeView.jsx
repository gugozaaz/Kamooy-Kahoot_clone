import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FloatingParticles from './components/FloatingParticles';
import SoundToggle from './components/SoundToggle';
import { sfx } from './lib/sound';
import './index.css';

export default function HomeView() {
  const [pin, setPin] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    sfx.unlock();
    sfx.pop();
    if (pin.trim().length === 6) {
      navigate(`/play?pin=${pin.trim()}`);
    } else {
      alert("กรุณาใส่รหัส Game PIN 6 หลัก");
    }
  };

  return (
    <div className="home-container game-bg" style={{ backgroundColor: '#ffcc00', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '20px' }}>
      <FloatingParticles />
      <SoundToggle />

      <button
        onClick={() => { sfx.unlock(); sfx.pop(); navigate('/dashboard'); }}
        className="btn-kamooy btn-kamooy-secondary"
        style={{
          position: 'absolute',
          top: '20px',
          right: '80px',
          padding: '0 24px',
          height: '46px',
          borderRadius: '999px',
          fontWeight: 800,
          background: '#ffffff',
          color: '#111827',
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
          zIndex: 10
        }}
      >
        🛠️ จัดการสื่อ / Host Game
      </button>

      <div style={{ textAlign: 'center', marginBottom: '28px', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: '5rem', color: '#fff', textShadow: '4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000', margin: 0, letterSpacing: '2px' }}>
          Kamooy!
        </h1>
        <p style={{ color: '#1f2937', fontSize: '1.3rem', fontWeight: 800, margin: '8px 0 0 0' }}>
          เกมตอบคำถามสุดมันส์ เล่นพร้อมกันได้ทุกคน 🚀
        </p>
      </div>

      <form onSubmit={handleJoin} style={{
        backgroundColor: '#fff',
        padding: '30px 24px',
        borderRadius: '24px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.22)',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '340px',
        position: 'relative',
        zIndex: 1,
        boxSizing: 'border-box'
      }}>
        <input
          type="text"
          placeholder="Game PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          style={{
            padding: '16px',
            fontSize: '1.6rem',
            textAlign: 'center',
            marginBottom: '16px',
            border: '3px solid #e5e7eb',
            borderRadius: '14px',
            fontWeight: 900,
            letterSpacing: '4px',
            fontFamily: 'monospace, sans-serif'
          }}
        />
        <button
          type="submit"
          className="btn-primary"
          style={{
            padding: '16px',
            fontSize: '1.3rem',
            backgroundColor: '#111827',
            color: '#fff',
            border: 'none',
            borderRadius: '14px',
            cursor: 'pointer',
            fontWeight: 900
          }}
        >
          Enter ➔
        </button>
      </form>
    </div>
  );
}
