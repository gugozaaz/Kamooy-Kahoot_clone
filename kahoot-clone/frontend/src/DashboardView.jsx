import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { ensureSampleQuiz, SAMPLE_PRESENTATION } from './lib/sampleQuiz';
import FloatingParticles from './components/FloatingParticles';
import SoundToggle from './components/SoundToggle';
import GoogleSignInButton from './components/GoogleSignInButton';
import { getStoredAuth, saveAuth, clearAuth } from './lib/auth';
import { api } from './lib/api';
import { sfx } from './lib/sound';

export default function DashboardView() {
  const [auth, setAuth] = useState(getStoredAuth());
  const [presentations, setPresentations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [localLegacyQuizzes, setLocalLegacyQuizzes] = useState([]);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Check legacy local storage quizzes for migration
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kamooy_presentations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalLegacyQuizzes(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch presentations when user is authenticated
  useEffect(() => {
    if (auth?.user) {
      loadUserPresentations();
    }
  }, [auth]);

  const loadUserPresentations = async () => {
    setLoading(true);
    try {
      const res = await api.getPresentations();
      if (res.success && Array.isArray(res.presentations)) {
        setPresentations(res.presentations);
        // Sync to local cache so HostView can quickly read offline/instant
        localStorage.setItem('kamooy_presentations', JSON.stringify(res.presentations));
      }
    } catch (err) {
      console.error('Failed to load user presentations:', err);
      // Fallback to local storage if API call fails
      const saved = localStorage.getItem('kamooy_presentations');
      if (saved) {
        try {
          setPresentations(JSON.parse(saved));
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = ({ token, user }) => {
    saveAuth(token, user);
    setAuth({ token, user });
    sfx.fanfare();
  };

  const handleLogout = () => {
    if (window.confirm('คุณต้องการออกจากระบบผู้สอนใช่หรือไม่?')) {
      sfx.pop();
      clearAuth();
      setAuth(null);
      setPresentations([]);
    }
  };

  const handleMigrateLocalQuizzes = async () => {
    if (!auth?.user || localLegacyQuizzes.length === 0) return;
    setMigrating(true);
    sfx.pop();
    try {
      let count = 0;
      for (const p of localLegacyQuizzes) {
        await api.savePresentation({
          ...p,
          id: p.id || uuidv4(),
          title: p.title || 'ชุดคำถามนำเข้า',
          createdAt: p.createdAt || new Date().toISOString()
        });
        count++;
      }
      sfx.fanfare();
      alert(`ย้ายสื่อการสอนเข้าสู่บัญชีสำเร็จทั้งหมด ${count} ชุด!`);
      setLocalLegacyQuizzes([]);
      await loadUserPresentations();
    } catch (err) {
      alert(`เกิดข้อผิดพลาดในการย้ายข้อมูล: ${err.message}`);
    } finally {
      setMigrating(false);
    }
  };

  const createNew = async () => {
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

    try {
      await api.savePresentation(newPresentation);
      const updated = [newPresentation, ...presentations];
      setPresentations(updated);
      localStorage.setItem('kamooy_presentations', JSON.stringify(updated));
      navigate(`/creator/${newId}`);
    } catch (err) {
      alert(`ไม่สามารถสร้างสื่อการสอนได้: ${err.message}`);
    }
  };

  const deletePresentation = async (id) => {
    if (window.confirm('คุณต้องการลบสื่อการสอนนี้ใช่หรือไม่? ข้อมูลจะถูกลบออกจากฐานข้อมูลของคุณ')) {
      sfx.pop();
      try {
        await api.deletePresentation(id);
        const updated = presentations.filter(p => p.id !== id);
        setPresentations(updated);
        localStorage.setItem('kamooy_presentations', JSON.stringify(updated));
      } catch (err) {
        alert(`เกิดข้อผิดพลาดในการลบ: ${err.message}`);
      }
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

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!imported.slides || !Array.isArray(imported.slides)) {
          throw new Error('รูปแบบไฟล์ไม่ถูกต้อง (ต้องมี slides array)');
        }
        imported.id = uuidv4();
        imported.title = imported.title ? `${imported.title} (นำเข้า)` : 'ควิซนำเข้า';
        imported.createdAt = new Date().toISOString();

        await api.savePresentation(imported);
        const updated = [imported, ...presentations];
        setPresentations(updated);
        localStorage.setItem('kamooy_presentations', JSON.stringify(updated));
        sfx.fanfare();
        alert(`นำเข้าชุดคำถาม "${imported.title}" เข้าสู่บัญชีของคุณสำเร็จ!`);
      } catch (err) {
        alert(`เกิดข้อผิดพลาดในการนำเข้า: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const loadSampleTrivia = async () => {
    sfx.pop();
    const newQuiz = {
      ...SAMPLE_PRESENTATION,
      id: uuidv4(),
      title: `ชุดคำถามตัวอย่าง (${new Date().toLocaleTimeString('th-TH')})`,
      createdAt: new Date().toISOString()
    };
    try {
      await api.savePresentation(newQuiz);
      const updated = [newQuiz, ...presentations];
      setPresentations(updated);
      localStorage.setItem('kamooy_presentations', JSON.stringify(updated));
      sfx.fanfare();
    } catch (err) {
      alert(`ไม่สามารถโหลดตัวอย่างได้: ${err.message}`);
    }
  };

  // --- 1. RENDER INSTRUCTOR LOGIN SCREEN IF NOT AUTHENTICATED ---
  if (!auth?.user) {
    return (
      <div style={{
        backgroundColor: '#f3f4f6',
        minHeight: '100vh',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative'
      }}>
        <FloatingParticles count={12} />
        <SoundToggle />

        <div style={{
          backgroundColor: '#ffffff',
          padding: '40px 32px',
          borderRadius: '28px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          border: '1px solid #e5e7eb',
          boxSizing: 'border-box'
        }}>
          <div style={{
            width: '76px',
            height: '76px',
            backgroundColor: '#ffcc00',
            borderRadius: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            margin: '0 auto 20px',
            boxShadow: '0 8px 20px rgba(255, 204, 0, 0.4)'
          }}>
            🎓
          </div>

          <h1 style={{ margin: 0, color: '#111827', fontSize: '1.9rem', fontWeight: 900 }}>
            ระบบผู้สอน Kamooy!
          </h1>
          <p style={{ margin: '10px 0 24px', color: '#4b5563', fontSize: '1.05rem', lineHeight: 1.5 }}>
            เข้าสู่ระบบด้วย Google เพื่อจัดการสื่อการสอน คลังคำถาม และแยกข้อมูลของคุณอย่างเป็นส่วนตัว
          </p>

          {/* Benefits List */}
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '16px 18px',
            borderRadius: '16px',
            marginBottom: '28px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            border: '1px solid #f3f4f6'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2rem' }}>🔒</span>
              <span style={{ fontSize: '0.92rem', color: '#374151', fontWeight: 600 }}>
                ข้อมูลชุดคำถามจัดเก็บแยกเฉพาะบัญชี ปลอดภัย 100%
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2rem' }}>💾</span>
              <span style={{ fontSize: '0.92rem', color: '#374151', fontWeight: 600 }}>
                บันทึกเข้าสู่ฐานข้อมูลในเซิร์ฟเวอร์ เปลี่ยนเครื่องข้อมูลไม่หาย
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2rem' }}>📱</span>
              <span style={{ fontSize: '0.92rem', color: '#374151', fontWeight: 600 }}>
                ผู้เรียนยังเข้าเล่นด้วย Game PIN ตามเดิม ไม่ต้องล็อกอิน
              </span>
            </div>
          </div>

          {/* Google Sign In Component */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <GoogleSignInButton
              onSuccess={handleLoginSuccess}
              onError={(err) => console.error(err)}
            />
          </div>

          {/* Test Bypass Login for Local Dev & Testing */}
          <div style={{ marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => {
                sfx.fanfare();
                const mockUser = {
                  id: 'test-instructor-1',
                  name: 'ผู้สอน (โหมดทดสอบ)',
                  email: 'instructor@kamooy.local',
                  picture: 'https://api.dicebear.com/7.x/bottts/svg?seed=instructor'
                };
                saveAuth('test-token-bypass', mockUser);
                setAuth({ token: 'test-token-bypass', user: mockUser });
                ensureSampleQuiz();
                const saved = localStorage.getItem('kamooy_presentations');
                if (saved) {
                  try {
                    setPresentations(JSON.parse(saved));
                  } catch {}
                }
              }}
              className="btn-kamooy btn-kamooy-secondary"
              style={{
                width: '100%',
                height: '42px',
                fontSize: '0.92rem',
                fontWeight: 800,
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                color: '#92400e'
              }}
            >
              ⚡ เข้าสู่ระบบผู้สอนทันที (โหมดทดสอบ)
            </button>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
            <button
              onClick={() => { sfx.pop(); navigate('/'); }}
              className="btn-kamooy btn-kamooy-secondary"
              style={{ width: '100%', height: '44px', fontSize: '0.95rem' }}
            >
              🏠 กลับหน้าหลักสำหรับผู้เรียน
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. RENDER INSTRUCTOR DASHBOARD WHEN AUTHENTICATED ---
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
        {/* User Profile Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '12px 20px',
          borderRadius: '16px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
          border: '1px solid #e5e7eb',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {auth.user.avatar ? (
              <img
                src={auth.user.avatar}
                alt={auth.user.name}
                style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ffcc00' }}
              />
            ) : (
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                {auth.user.name?.[0] || 'T'}
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, color: '#111827', fontSize: '1.05rem' }}>
                  {auth.user.name}
                </span>
                <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px' }}>
                  ผู้สอน
                </span>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                {auth.user.email}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => { sfx.pop(); navigate('/'); }}
              className="btn-kamooy btn-kamooy-secondary"
              style={{ height: '38px', padding: '0 14px', fontSize: '0.85rem' }}
            >
              🏠 หน้าเล่นเกม
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: '#fee2e2',
                color: '#b91c1c',
                border: 'none',
                borderRadius: '10px',
                padding: '0 14px',
                height: '38px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🚪 ออกจากระบบ
            </button>
          </div>
        </div>

        {/* Migration Banner if user has legacy local quizzes not yet in DB */}
        {localLegacyQuizzes.length > 0 && presentations.length === 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
            border: '2px dashed #6366f1',
            borderRadius: '18px',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h4 style={{ margin: 0, color: '#1e1b4b', fontSize: '1.15rem', fontWeight: 800 }}>
                📥 พบสื่อการสอนเดิมในเครื่องนี้ ({localLegacyQuizzes.length} ชุด)
              </h4>
              <p style={{ margin: '4px 0 0', color: '#4338ca', fontSize: '0.95rem' }}>
                ต้องการย้ายเข้าสู่บัญชี Google ของคุณเพื่อบันทึกลงฐานข้อมูลถาวรหรือไม่?
              </p>
            </div>
            <button
              onClick={handleMigrateLocalQuizzes}
              disabled={migrating}
              className="btn-kamooy btn-kamooy-primary"
              style={{ height: '42px', fontSize: '0.92rem' }}
            >
              {migrating ? '⏳ กำลังบันทึก...' : '✨ ย้ายเข้าสู่บัญชีของฉันทันที'}
            </button>
          </div>
        )}

        {/* Dashboard Title & Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, color: '#111827', fontSize: '2.2rem', fontWeight: 900 }}>
              🎮 คลังสื่อการสอนของคุณ
            </h1>
            <p style={{ margin: '6px 0 0 0', color: '#4b5563', fontSize: '1.05rem' }}>
              สื่อการสอนทั้งหมดนี้ผูกกับบัญชี {auth.user.email} แยกเฉพาะของคุณ
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => { sfx.pop(); fileInputRef.current?.click(); }}
              className="btn-kamooy btn-kamooy-secondary"
              title="นำเข้าชุดคำถามจากไฟล์ JSON"
              style={{ height: '42px' }}
            >
              📥 นำเข้า JSON
            </button>

            <button
              onClick={createNew}
              className="btn-kamooy btn-kamooy-blue"
              style={{ height: '42px' }}
            >
              + สร้างคำถามใหม่
            </button>
          </div>
        </div>

        {/* Presentations List or Loading/Empty State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6366f1', fontSize: '1.2rem', fontWeight: 800 }}>
            <span className="spinner" style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }} />
            <div>กำลังโหลดข้อมูลสื่อการสอนของคุณ...</div>
          </div>
        ) : presentations.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '20px', background: '#fff', padding: '60px 20px', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
            <span style={{ fontSize: '4.5rem', display: 'block', marginBottom: '16px' }}>📚</span>
            <h2 style={{ fontSize: '1.8rem', color: '#111827', fontWeight: 900 }}>ยังไม่มีชุดคำถามในบัญชีนี้</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '24px' }}>สร้างชุดคำถามของคุณเอง หรือโหลดตัวอย่างเพื่อเริ่มเปิดห้องเล่นเกมได้ทันที</p>
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

                {/* 2-Tier Ergonomic Card Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', width: '100%' }}>
                  <button
                    onClick={() => {
                      sfx.unlock();
                      navigate(`/host/${p.id}`);
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
