import React, { useState } from 'react';
import { sfx } from '../lib/sound';

export default function HostSoundboard() {
  const [open, setOpen] = useState(false);

  const trigger = (action) => {
    sfx.unlock();
    switch (action) {
      case 'airhorn':
        sfx.airhorn();
        break;
      case 'applause':
        sfx.applause();
        break;
      case 'drumroll':
        sfx.drumroll();
        break;
      case 'tick':
        sfx.urgentTick();
        break;
      case 'fanfare':
        sfx.fanfare();
        break;
      default:
        sfx.pop();
    }
  };

  return (
    <div className="soundboard-panel">
      {open && (
        <div className="soundboard-popup">
          <button
            onClick={() => trigger('airhorn')}
            className="reaction-btn"
            title="แตรแอร์ฮอร์น (Airhorn)"
          >
            🎺
          </button>
          <button
            onClick={() => trigger('applause')}
            className="reaction-btn"
            title="เสียงปรบมือ (Applause)"
          >
            👏
          </button>
          <button
            onClick={() => trigger('drumroll')}
            className="reaction-btn"
            title="กลองลุ้นระทึก (Drumroll)"
          >
            🥁
          </button>
          <button
            onClick={() => trigger('tick')}
            className="reaction-btn"
            title="เร่งเวลา (Urgent Tick)"
          >
            ⏰
          </button>
          <button
            onClick={() => trigger('fanfare')}
            className="reaction-btn"
            title="ชัยชนะ (Fanfare)"
          >
            🎉
          </button>
        </div>
      )}

      <button
        onClick={() => {
          sfx.unlock();
          sfx.pop();
          setOpen(prev => !prev);
        }}
        className="soundboard-trigger-btn"
        title={open ? "ปิดซาวด์บอร์ด" : "เปิด DJ Soundboard สำหรับอาจารย์"}
      >
        {open ? '✖️' : '🔊'}
      </button>
    </div>
  );
}
