import { getStore } from './_lib/store.js';
import { advance, addReaction } from './_lib/engine.js';
import { readJsonBody, sendJson, withErrorHandling, ApiError } from './_lib/http.js';

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') throw new ApiError(405, 'Method not allowed');
  const { pin, emoji, nickname } = await readJsonBody(req);
  if (!pin || typeof pin !== 'string' || !emoji || typeof emoji !== 'string') {
    throw new ApiError(400, 'pin and emoji are required');
  }

  const cleanEmoji = emoji.trim().replace(/[<>]/g, '').slice(0, 10);
  const cleanNickname = typeof nickname === 'string'
    ? nickname.trim().replace(/[<>]/g, '').slice(0, 30)
    : 'Player';

  if (!cleanEmoji) {
    throw new ApiError(400, 'Valid emoji is required');
  }

  const store = await getStore();
  const result = await store.withGame(pin, (game, now) => {
    advance(game, now);
    addReaction(game, cleanEmoji, cleanNickname, now);
  });
  if (!result) throw new ApiError(404, 'Game not found');

  sendJson(res, 200, { success: true });
});
