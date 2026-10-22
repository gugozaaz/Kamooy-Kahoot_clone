import { ApiError } from './http.js';
import { dbService } from './db.js';

const tokenCache = new Map(); // token -> { user, expiresAt }

export async function verifyGoogleToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new ApiError(401, 'Google token is required');
  }

  const cached = tokenCache.get(idToken);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      throw new ApiError(401, data.error_description || 'Invalid or expired Google token');
    }

    // Verify issuer
    if (data.iss !== 'accounts.google.com' && data.iss !== 'https://accounts.google.com') {
      throw new ApiError(401, 'Invalid token issuer');
    }

    // Verify email is verified by Google
    if (data.email_verified !== 'true' && data.email_verified !== true) {
      throw new ApiError(401, 'Google account email is not verified');
    }

    // Verify audience strictly matches GOOGLE_CLIENT_ID
    const expectedClientId = process.env.GOOGLE_CLIENT_ID;
    if (expectedClientId && data.aud !== expectedClientId) {
      throw new ApiError(401, 'Token audience mismatch (Unauthorized Client ID)');
    }

    const user = {
      id: data.sub,
      email: data.email,
      name: data.name || data.email?.split('@')[0] || 'อาจารย์',
      avatar: data.picture || ''
    };

    // Upsert user into database
    dbService.upsertUser(user);

    // Cache token verification
    const expMs = (Number(data.exp) * 1000) - Date.now();
    const ttl = Math.max(10000, Math.min(expMs, 3600 * 1000));
    tokenCache.set(idToken, { user, expiresAt: Date.now() + ttl });

    return user;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, `Failed to verify Google token: ${err.message}`);
  }
}

export async function requireAuth(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'ต้องเข้าสู่ระบบด้วย Google ก่อนดำเนินการ (Missing or invalid Authorization header)');
  }

  const idToken = authHeader.slice(7).trim();
  const user = await verifyGoogleToken(idToken);
  return user;
}
