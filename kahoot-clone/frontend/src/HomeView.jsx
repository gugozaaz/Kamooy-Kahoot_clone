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
    <div className="home-container game-bg" style={{
      backgroundColor: '#ffcc00',
      minHeight: '100vh',
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      padding: '20px 16px',
      boxSizing: 'border-box'
    }}>
      <FloatingParticles />
      <SoundToggle />

      {/* Top Bar for Desktop & Mobile */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '72px',
        zIndex: 10
      }}>
        <button
          onClick={() => { sfx.unlock(); sfx.pop(); navigate('/dashboard'); }}
          className="btn-kamooy btn-kamooy-secondary"
          style={{
            padding: '0 20px',
            height: '42px',
            borderRadius: '999px',
            fontWeight: 800,
            background: '#ffffff',
            color: '#111827',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            fontSize: '0.9rem'
          }}
        >
          🛠️ จัดการสื่อ / Host Game
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '24px', position: 'relative', zIndex: 1, maxWidth: '90%' }}>
        <h1 style={{
          fontSize: 'clamp(3rem, 10vw, 5rem)',
          color: '#fff',
          textShadow: '4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
          margin: 0,
          letterSpacing: '2px',
          lineHeight: 1.15
        }}>
          Kamooy!
        </h1>
        <p style={{
          color: '#1f2937',
          fontSize: 'clamp(1rem, 3.6vw, 1.3rem)',
          fontWeight: 800,
          margin: '10px 0 0 0'
        }}>
          เกมตอบคำถามสุดมันส์ เล่นพร้อมกันได้ทุกคน 🚀
        </p>
      </div>

      <form onSubmit={handleJoin} style={{
        backgroundColor: '#fff',
        padding: '28px 20px',
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
        <input
          type="text"
          placeholder="Game PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          style={{
            padding: '14px',
            fontSize: 'clamp(1.4rem, 5vw, 1.7rem)',
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
          className="btn-kamooy btn-kamooy-primary"
          style={{
            width: '100%',
            height: '52px',
            fontSize: '1.25rem',
            borderRadius: '14px'
          }}
        >
          Enter ➔
        </button>
      </form>
    </div>
  );
}
