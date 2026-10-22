import React, { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../lib/auth.js';
import { api } from '../lib/api.js';

export default function GoogleSignInButton({ onSuccess, onError }) {
  const buttonRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let checkInterval = null;

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return false;

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (!response?.credential) {
              const err = 'ไม่ได้รับ Credential จาก Google';
              setErrorMsg(err);
              if (onError) onError(err);
              return;
            }

            setLoading(true);
            setErrorMsg(null);
            try {
              const res = await api.authGoogle(response.credential);
              if (res.success && res.user) {
                if (onSuccess) onSuccess({ token: response.credential, user: res.user });
              } else {
                throw new Error('ไม่สามารถยืนยันตัวตนได้');
              }
            } catch (err) {
              console.error('Google auth verification error:', err);
              const msg = err.message || 'การเข้าสู่ระบบล้มเหลว';
              setErrorMsg(msg);
              if (onError) onError(msg);
            } finally {
              setLoading(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (buttonRef.current) {
          buttonRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'filled_blue',
            size: 'large',
            text: 'signin_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 280,
          });
        }
        return true;
      } catch (err) {
        console.error('Failed to init Google Identity Services:', err);
        return false;
      }
    };

    if (!initGoogle()) {
      checkInterval = setInterval(() => {
        if (initGoogle()) {
          clearInterval(checkInterval);
        }
      }, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [onSuccess, onError]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div ref={buttonRef} style={{ minHeight: '44px', display: 'flex', justifyContent: 'center' }} />
      {loading && (
        <div style={{ fontSize: '0.9rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="spinner" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          กำลังเข้าสู่ระบบและโหลดข้อมูลของคุณ...
        </div>
      )}
      {errorMsg && (
        <div style={{ fontSize: '0.88rem', color: '#ef4444', background: '#fee2e2', padding: '6px 12px', borderRadius: '8px', maxWidth: '320px', textAlign: 'center' }}>
          ⚠️ {errorMsg}
        </div>
      )}
    </div>
  );
}
