import { readJsonBody, sendJson, withErrorHandling, ApiError } from './_lib/http.js';
import { verifyGoogleToken } from './_lib/auth.js';

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') throw new ApiError(405, 'Method not allowed');
  const body = await readJsonBody(req);
  const { credential } = body;

  if (!credential) {
    throw new ApiError(400, 'credential is required');
  }

  const user = await verifyGoogleToken(credential);
  return sendJson(res, 200, { success: true, user });
});
