import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { ensureSampleQuiz } from './lib/sampleQuiz';
import FloatingParticles from './components/FloatingParticles';
import { sfx } from './lib/sound';

export default function DashboardView() {
  const [presentations, setPresentations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    ensureSampleQuiz();
    const saved = localStorage.getItem('kamooy_presentations');
    if (saved) {
      try {
        setPresentations(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse presentations from localStorage", e);
      }
    }
  }, []);

  const createNew = () => {
    sfx.pop();
    const newId = uuidv4();
    const newPresentation = {
      id: newId,
      title: 'สื่อการสอนชุดใหม่',
      createdAt: new Date().toISOString(),
      slides: []
    };
    const updated = [...presentations, newPresentation];
    setPresentations(updated);
    localStorage.setItem('kamooy_presentations', JSON.stringify(updated));
    navigate(`/creator/${newId}`);
  };

  const deletePresentation = (id) => {
    if (window.confirm('คุณต้องการลบสื่อการสอนนี้ใช่หรือไม่?')) {
      sfx.pop();
      const updated = presentations.filter(p => p.id !== id);
      setPresentations(updated);
      localStorage.setItem('kamooy_presentations', JSON.stringify(updated));
    }
  };

  return (
    <div style={{ padding: '30px 20px', backgroundColor: '#f3f4f6', minHeight: '100vh', position: 'relative' }}>
      <FloatingParticles count={10} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, color: '#111827', fontSize: '2.4rem', fontWeight: 900 }}>
              🎮 จัดการชุดคำถาม & สื่อการสอน
            </h1>
            <p style={{ margin: '6px 0 0 0', color: '#4b5563', fontSize: '1.1rem' }}>
              เลือกชุดคำถามเพื่อเปิดห้องเล่น (Host) หรือสร้างคำถามใหม่
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ffffff',
                color: '#374151',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '1rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              🏠 กลับหน้าแรก
            </button>

            <button
              onClick={createNew}
              className="btn-primary"
              style={{
                padding: '12px 26px',
                backgroundColor: '#1368ce',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '1.05rem',
                boxShadow: '0 4px 12px rgba(19, 104, 206, 0.35)'
              }}
            >
              + สร้างคำถามใหม่
            </button>
          </div>
        </div>

        {presentations.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '60px', background: '#fff', padding: '60px 20px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '4rem', display: 'block', marginBottom: '16px' }}>📚</span>
            <h2 style={{ fontSize: '1.8rem', color: '#111827' }}>ยังไม่มีชุดคำถาม</h2>
            <p>คลิก "+ สร้างคำถามใหม่" เพื่อเริ่มต้นสร้างสื่อการสอนของคุณ</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {presentations.map(p => (
              <div key={p.id} style={{
                backgroundColor: '#ffffff',
                padding: '24px',
                borderRadius: '18px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.07)',
                border: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: '#111827', fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.3 }}>
                    {p.title || 'ไม่มีชื่อชุดคำถาม'}
                  </h3>
                  <span style={{ background: '#f3f4f6', color: '#4b5563', padding: '4px 10px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {p.slides ? p.slides.length : 0} ข้อ
                  </span>
                </div>

                <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '24px' }}>
                  สร้างเมื่อ: {p.createdAt ? new Date(p.createdAt).toLocaleDateString('th-TH') : 'ไม่ระบุ'}
                </p>

                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                  <button
                    onClick={() => {
                      sfx.unlock();
                      window.open(`/host/${p.id}`, '_blank');
                    }}
                    className="btn-primary"
                    style={{
                      flex: 1.4,
                      padding: '12px',
                      backgroundColor: '#26890c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 800,
                      fontSize: '1rem',
                      boxShadow: '0 4px 10px rgba(38,137,12,0.3)'
                    }}
                  >
                    🚀 เล่น (Host)
                  </button>
                  <button
                    onClick={() => navigate(`/creator/${p.id}`)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: '#f3f4f6',
                      color: '#1f2937',
                      border: '1px solid #d1d5db',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 700
                    }}
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => deletePresentation(p.id)}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#fee2e2',
                      color: '#ef4444',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 700
                    }}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
