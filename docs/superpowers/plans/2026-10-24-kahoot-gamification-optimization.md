# Kahoot-Grade Gamification Optimization & Multi-Device Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate Kamooy into a full Kahoot-grade gamification experience with authentic streak bonus algorithms, tension-building audio/visual feedback, dramatic podium ceremonies, and verified responsive layouts across Windows 11 Desktop (Landscape), Android Phone (Portrait), iPhone Safari (Portrait), Android Tablet (Landscape), and iPad Safari (Landscape).

**Architecture:** 
1. Pure engine mathematical improvements in `frontend/api/_lib/engine.js` (streak bonus formula, leader point delta calculations, enhanced projections).
2. WebAudio sound escalation in `frontend/src/lib/sound.js` (tempo pitch rush for final 5s countdown, drumroll climax).
3. Fullscreen host mode and staggered animated podium reveal in `frontend/src/HostView.jsx` and `frontend/src/components/Podium.jsx`.
4. iOS safe-area insets, tactile pad grid ergonomics, and behind-leader dynamic messaging in `frontend/src/PlayerView.jsx` and CSS files.
5. End-to-end multi-device verification via Chrome DevTools MCP device emulation with screenshots and Docker restart.

**Tech Stack:** React 19, Vite, Node.js 22, Express, WebAudio API, CSS3 (dvh, safe-area-insets, keyframe animations), Docker, Nginx, Chrome DevTools MCP.

**Spec:** `Kahoot.txt` & user request in conversation history.

## Global Constraints
- Must maintain 100% backward compatibility with existing tests in `kahoot-clone/test/engine.test.mjs` and `security.test.mjs`.
- Audio must remain pure WebAudio API (no external heavy MP3/WAV files that require internet connection or CDN).
- Strictly adhere to workspace rules: automatic `git add .`, `git commit`, `git push origin main`, and `docker compose up -d --build` after changes.
- Responsive layout must work without horizontal scrollbars or element clipping on all 5 target device viewports.

## Review Focus
1. **Streak bonus edge cases:** When player answers wrong, streak resets to 0 (unless protected by Streak Shield). If streak >= 2, streak bonus (+100, +200, +300, max +500) must be included in `pointsGained` and total score.
2. **Leader gap delta calculation:** When player is #1, delta message praises first place. When rank > 1, exact difference from #1 (`leaderScore - myScore`) must never be negative or NaN.
3. **Audio context unlocked:** Audio must not throw `InvalidStateError` or crash if browser restricts autoplay before user interaction.
4. **iOS Safari Viewport (`100dvh` & Safe Area):** Avoid bottom bar cutoff on iPhone Safari by setting `padding-bottom: max(12px, env(safe-area-inset-bottom))`.
5. **Multi-device pad grid:** On tablets and desktops in landscape, the 4-choice pad grid must not collapse into a thin slit or expand beyond screen bounds.

---

### Task 1: Backend Streak Bonus Algorithm & Leader Gap Calculations

**Files:**
- Modify: `kahoot-clone/frontend/api/_lib/engine.js:100-149`, `293-332`
- Modify: `kahoot-clone/backend/index.js:65-125`
- Test: `kahoot-clone/test/engine.test.mjs`

**Interfaces:**
- Consumes: `game.answers`, `game.players`, `q.correctAnswers`, `q.timeLimit`
- Produces: `player.streak`, `answerData.streakBonus`, `answerData.pointsGained`, `playerProjection.result.pointsBehindLeader`, `playerProjection.result.streakBonus`

- [ ] **Step 1: Add failing test for streak bonus and pointsBehindLeader in `kahoot-clone/test/engine.test.mjs`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement streak bonus logic and projection in `frontend/api/_lib/engine.js` and `backend/index.js`**
- [ ] **Step 4: Run test to verify all 40+ assertions pass**
- [ ] **Step 5: Commit changes with git**

---

### Task 2: Sound Tension Escalation & WebAudio Polish

**Files:**
- Modify: `kahoot-clone/frontend/src/lib/sound.js`

**Interfaces:**
- Produces: `sfx.urgentTick()`, `sfx.drumroll()`, `sfx.tensionMusic(timeLeft)`

- [ ] **Step 1: Add urgent tension tick and drumroll sweep in `frontend/src/lib/sound.js`**
- [ ] **Step 2: Connect countdown acceleration in `HostView.jsx` and `PlayerView.jsx`**
- [ ] **Step 3: Verify no syntax errors in sound engine**
- [ ] **Step 4: Commit changes with git**

---

### Task 3: Host View Gamification & Fullscreen Projector Mode

**Files:**
- Modify: `kahoot-clone/frontend/src/HostView.jsx`
- Modify: `kahoot-clone/frontend/src/components/Podium.jsx`
- Modify: `kahoot-clone/frontend/src/gamify.css`

**Interfaces:**
- Produces: Fullscreen toggle button, staggered podium reveals (3rd -> 2nd -> 1st with drumroll), enhanced bar chart glow.

- [ ] **Step 1: Add Fullscreen toggle button in `HostView.jsx`**
- [ ] **Step 2: Enhance `Podium.jsx` with authentic drumroll timing and podium rising step keyframes**
- [ ] **Step 3: Verify Host View layout under widescreen landscape**
- [ ] **Step 4: Commit changes with git**

---

### Task 4: Player View Gamification, Streak Flames & Cross-Device Ergonomics

**Files:**
- Modify: `kahoot-clone/frontend/src/PlayerView.jsx`
- Modify: `kahoot-clone/frontend/src/index.css`
- Modify: `kahoot-clone/frontend/src/gamify.css`

**Interfaces:**
- Consumes: `state.result.pointsBehindLeader`, `state.result.streakBonus`
- Produces: Behind-leader motivator banner ("คุณตามหลังอันดับ 1 อยู่ X แต้ม!"), streak bonus badge, safe area padding for iPhone Safari.

- [ ] **Step 1: Add Leaderboard Delta banner and Streak Bonus chip to `PlayerView.jsx`**
- [ ] **Step 2: Update CSS with `env(safe-area-inset-bottom)`, `100dvh`, and tablet landscape grid styles**
- [ ] **Step 3: Commit changes with git**

---

### Task 5: Docker Compose Rebuild & Automated Multi-Device UI Verification

**Files:**
- Run: `docker-compose.yml`
- Emulate & Screenshot: Windows 11 Chrome Desktop, Android Chrome Phone, iPhone Safari, Android Tablet Chrome, iPad Safari.

- [ ] **Step 1: Run `docker compose up -d --build` and check container health**
- [ ] **Step 2: Run all backend tests in container / local node**
- [ ] **Step 3: Use Chrome DevTools MCP to test all 5 device views with viewport emulation and capture screenshots**
- [ ] **Step 4: Verify screenshots meet aesthetic and usability standards**
- [ ] **Step 5: Perform final Git commit and push to remote origin**
