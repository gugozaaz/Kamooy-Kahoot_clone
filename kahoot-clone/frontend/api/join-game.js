import { getStore } from './_lib/store.js';
import { joinPlayer } from './_lib/engine.js';
import { readJsonBody, sendJson, withErrorHandling, ApiError } from './_lib/http.js';

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') throw new ApiError(405, 'Method not allowed');
  const { pin, nickname } = await readJsonBody(req);
  if (!pin || typeof pin !== 'string') throw new ApiError(400, 'Valid PIN is required');
  if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
    throw new ApiError(400, 'Valid nickname is required');
  }
  const cleanNickname = nickname.trim().slice(0, 30);

  const store = await getStore();
  const playerId = crypto.randomUUID();
  const result = await store.withGame(pin.trim(), (game, now) => {
    joinPlayer(game, playerId, cleanNickname, now);
  });
  if (!result) throw new ApiError(404, 'Game not found');

  sendJson(res, 200, { success: true, pin, playerId });
});
