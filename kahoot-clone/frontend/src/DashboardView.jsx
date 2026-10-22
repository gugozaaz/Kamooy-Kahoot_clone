import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { ensureSampleQuiz, SAMPLE_PRESENTATION } from './lib/sampleQuiz';
import FloatingParticles from './components/FloatingParticles';
import SoundToggle from './components/SoundToggle';
import { sfx } from './lib/sound';

export default function DashboardView() {
  const [presentations, setPresentations] = useState([]);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    ensureSampleQuiz();
    loadPresentations();
  }, []);

  const loadPresentations = () => {
    const saved = localStorage.getItem('kamooy_presentations');
    if (saved) {
      try {
        setPresentations(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse presentations from localStorage", e);
      }
    }
  };

  const createNew = () => {
    sfx.pop();
    const newId = uuidv4();
    const newPresentation = {
      id: newId,
      title: 'สื่อการสอนชุดใหม่',
      createdAt: new Date().toISOString(),
      settings: {
        enablePowerups: false,
        showAnswerText: true
      },
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

  const exportQuiz = (p) => {
    sfx.pop();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(p, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${p.title || 'quiz'}.kamooy.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!imported.slides || !Array.isArray(imported.slides)) {
          throw new Error('รูปแบบไฟล์ไม่ถูกต้อง (ต้องมี slides array)');
        }
        imported.id = uuidv4();
        imported.title = imported.title ? `${imported.title} (นำเข้า)` : 'ควิซนำเข้า';
        imported.createdAt = new Date().toISOString();
        const updated = [...presentations, imported];
        setPresentations(updated);
        localStorage.setItem('kamooy_presentations', JSON.stringify(updated));
        sfx.fanfare();
        alert(`นำเข้าชุดคำถาม "${imported.title}" สำเร็จ!`);
      } catch (err) {
        alert(`เกิดข้อผิดพลาดในการนำเข้า: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const loadSampleTrivia = () => {
    sfx.pop();
    const newQuiz = {
      ...SAMPLE_PRESENTATION,
      id: uuidv4(),
      title: `ชุดคำถามตัวอย่าง (${new Date().toLocaleTimeString('th-TH')})`,
      createdAt: new Date().toISOString()
    };
    const updated = [...presentations, newQuiz];
    setPresentations(updated);
    localStorage.setItem('kamooy_presentations', JSON.stringify(updated));
    sfx.fanfare();
  };

  return (
    <div style={{ padding: '30px 20px', backgroundColor: '#f3f4f6', minHeight: '100vh', position: 'relative' }}>
      <FloatingParticles count={10} />
      <SoundToggle />

      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".json"
        style={{ display: 'none' }}
      />

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

          {/* Action Buttons with Equal Sizing */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => { sfx.pop(); navigate('/'); }}
              className="btn-kamooy btn-kamooy-secondary"
            >
              🏠 กลับหน้าแรก
            </button>

            <button
              onClick={() => { sfx.pop(); fileInputRef.current?.click(); }}
              className="btn-kamooy btn-kamooy-secondary"
              title="นำเข้าชุดคำถามจากไฟล์ JSON"
            >
              📥 นำเข้า JSON
            </button>

            <button
              onClick={createNew}
              className="btn-kamooy btn-kamooy-blue"
            >
              + สร้างคำถามใหม่
            </button>
          </div>
        </div>

        {presentations.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '60px', background: '#fff', padding: '60px 20px', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
            <span style={{ fontSize: '4.5rem', display: 'block', marginBottom: '16px' }}>📚</span>
            <h2 style={{ fontSize: '1.8rem', color: '#111827', fontWeight: 900 }}>ยังไม่มีชุดคำถาม</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '24px' }}>สร้างชุดคำถามของคุณเอง หรือโหลดตัวอย่างเพื่อเริ่มเล่นได้ทันที</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={loadSampleTrivia} className="btn-kamooy btn-kamooy-secondary">
                ✨ โหลดควิซตัวอย่าง
              </button>
              <button onClick={createNew} className="btn-kamooy btn-kamooy-blue">
                + สร้างคำถามใหม่
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {presentations.map(p => (
              <div key={p.id} style={{
                backgroundColor: '#ffffff',
                padding: '24px',
                borderRadius: '20px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.07)',
                border: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: '#111827', fontSize: '1.35rem', fontWeight: 900, lineHeight: 1.3 }}>
                    {p.title || 'ไม่มีชื่อชุดคำถาม'}
                  </h3>
                  <span style={{ background: '#f3f4f6', color: '#4b5563', padding: '4px 12px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {p.slides ? p.slides.length : 0} ข้อ
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                    สร้างเมื่อ: {p.createdAt ? new Date(p.createdAt).toLocaleDateString('th-TH') : 'ไม่ระบุ'}
                  </p>
                  <button
                    onClick={() => exportQuiz(p)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4b5563',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                    title="ดาวน์โหลดชุดคำถามเป็นไฟล์ JSON"
                  >
                    📤 ส่งออก JSON
                  </button>
                </div>

                {/* 2-Tier Ergonomic Card Action Buttons - Guaranteed Zero Overflow */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', width: '100%' }}>
                  <button
                    onClick={() => {
                      sfx.unlock();
                      window.open(`/host/${p.id}`, '_blank');
                    }}
                    className="btn-kamooy btn-kamooy-primary"
                    style={{ width: '100%', height: '42px', fontSize: '0.98rem' }}
                  >
                    🚀 เล่นเกม (Host)
                  </button>
                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <button
                      onClick={() => {
                        sfx.pop();
                        navigate(`/creator/${p.id}`);
                      }}
                      className="btn-kamooy btn-kamooy-secondary"
                      style={{ flex: 1, height: '38px', fontSize: '0.88rem', padding: '0 8px' }}
                    >
                      ✏️ แก้ไข
                    </button>
                    <button
                      onClick={() => deletePresentation(p.id)}
                      className="btn-kamooy btn-kamooy-danger"
                      style={{ flex: 1, height: '38px', fontSize: '0.88rem', padding: '0 8px' }}
                    >
                      🗑️ ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
