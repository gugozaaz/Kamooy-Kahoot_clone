// Default fun starter trivia quiz ready to play instantly for testing
export const SAMPLE_PRESENTATION_ID = 'starter-trivia-demo-2026';

export const SAMPLE_PRESENTATION = {
  id: SAMPLE_PRESENTATION_ID,
  title: '🎮 Kamooy Gamified Challenge: ประลองปัญญาและความเร็ว',
  createdAt: new Date().toISOString(),
  settings: {
    enablePowerups: false,
    showAnswerText: true
  },
  slides: [
    {
      id: 'slide-1',
      question: 'ดาวเคราะห์ดวงใดในระบบสุริยะที่มีขนาดใหญ่ที่สุด?',
      image: null,
      isFullScreenImage: false,
      answers: [
        { id: 'a1', text: 'ดาวพฤหัสบดี (Jupiter)', isCorrect: true },
        { id: 'a2', text: 'ดาวเสาร์ (Saturn)', isCorrect: false },
        { id: 'a3', text: 'ดาวยูเรนัส (Uranus)', isCorrect: false },
        { id: 'a4', text: 'ดาวอังคาร (Mars)', isCorrect: false }
      ],
      timeLimit: 20,
      scoreMultiplier: 1
    },
    {
      id: 'slide-2',
      question: 'สัตว์ชนิดใดสามารถวิ่งได้เร็วที่สุดในโลกบนพื้นดิน?',
      image: null,
      isFullScreenImage: false,
      answers: [
        { id: 'b1', text: 'สิงโต (Lion)', isCorrect: false },
        { id: 'b2', text: 'เสือชีตาห์ (Cheetah)', isCorrect: true },
        { id: 'b3', text: 'ละมั่ง (Gazelle)', isCorrect: false },
        { id: 'b4', text: 'ม้าแข่ง (Racehorse)', isCorrect: false }
      ],
      timeLimit: 15,
      scoreMultiplier: 1
    },
    {
      id: 'slide-3',
      question: 'ในเกม Kamooy ปุ่มสีแดงตรงกับสัญลักษณ์รูปทรงเรขาคณิตใด?',
      image: null,
      isFullScreenImage: false,
      answers: [
        { id: 'c1', text: '▲ สามเหลี่ยม (Triangle)', isCorrect: true },
        { id: 'c2', text: '◆ ข้าวหลามตัด (Diamond)', isCorrect: false },
        { id: 'c3', text: '● วงกลม (Circle)', isCorrect: false },
        { id: 'c4', text: '■ สี่เหลี่ยม (Square)', isCorrect: false }
      ],
      timeLimit: 15,
      scoreMultiplier: 2 // Double points!
    },
    {
      id: 'slide-4',
      question: 'สัญลักษณ์ทางเคมีของสารประกอบ "น้ำ" คือข้อใด?',
      image: null,
      isFullScreenImage: false,
      answers: [
        { id: 'd1', text: 'CO2', isCorrect: false },
        { id: 'd2', text: 'NaCl', isCorrect: false },
        { id: 'd3', text: 'H2O', isCorrect: true },
        { id: 'd4', text: 'O2', isCorrect: false }
      ],
      timeLimit: 15,
      scoreMultiplier: 1
    },
    {
      id: 'slide-5',
      question: 'ข้อสุดท้าย! ความเร็วในการตอบคำถามมีผลต่อคะแนนที่ได้รับหรือไม่?',
      image: null,
      isFullScreenImage: false,
      answers: [
        { id: 'e1', text: 'มีผล! ตอบเร็วกว่าได้คะแนนเยอะกว่า', isCorrect: true },
        { id: 'e2', text: 'ไม่มีผล ได้คะแนนเท่ากันหมด', isCorrect: false },
        { id: 'e3', text: 'ขึ้นอยู่กับความยาวของชื่อผู้เล่น', isCorrect: false },
        { id: 'e4', text: 'แล้วแต่อารมณ์ของเซิร์ฟเวอร์', isCorrect: false }
      ],
      timeLimit: 15,
      scoreMultiplier: 2
    }
  ]
};

export function ensureSampleQuiz() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('kamooy_presentations');
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list) || list.length === 0) {
      list = [SAMPLE_PRESENTATION];
      localStorage.setItem('kamooy_presentations', JSON.stringify(list));
    } else {
      // Ensure the starter quiz exists in the list so it can always be played
      const exists = list.some(p => p.id === SAMPLE_PRESENTATION_ID);
      if (!exists) {
        list.unshift(SAMPLE_PRESENTATION);
        localStorage.setItem('kamooy_presentations', JSON.stringify(list));
      }
    }
  } catch (err) {
    console.error('Failed to init sample quiz', err);
  }
}
