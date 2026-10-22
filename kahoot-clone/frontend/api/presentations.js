import { readJsonBody, sendJson, withErrorHandling, ApiError } from './_lib/http.js';
import { requireAuth } from './_lib/auth.js';
import { dbService } from './_lib/db.js';

export default withErrorHandling(async (req, res) => {
  if (req.method === 'GET') {
    // If a specific ID is requested
    const presentationId = req.query?.id;
    if (presentationId) {
      // Optional authentication check for individual presentation fetch (e.g., Host View)
      let user = null;
      try {
        user = await requireAuth(req);
      } catch {
        // Allow unauthenticated fetch if running a hosted game, or fallback to any presenter
      }
      const presentation = dbService.getPresentation(presentationId, user ? user.id : null);
      if (!presentation) {
        throw new ApiError(404, 'Presentation not found');
      }
      return sendJson(res, 200, { success: true, presentation });
    }

    // List all presentations for authenticated instructor
    const user = await requireAuth(req);
    const presentations = dbService.getPresentations(user.id);
    return sendJson(res, 200, { success: true, presentations });
  }

  if (req.method === 'POST') {
    const user = await requireAuth(req);
    const body = await readJsonBody(req);
    const presentation = body?.presentation || body;

    if (!presentation || !presentation.id) {
      throw new ApiError(400, 'presentation object with valid id is required');
    }

    const saved = dbService.savePresentation(user.id, presentation);
    return sendJson(res, 200, { success: true, presentation: saved });
  }

  if (req.method === 'DELETE') {
    const user = await requireAuth(req);
    let id = req.query?.id;
    if (!id) {
      try {
        const body = await readJsonBody(req);
        id = body?.id;
      } catch {
        // query param was empty, body empty
      }
    }

    if (!id) {
      throw new ApiError(400, 'presentation id is required');
    }

    dbService.deletePresentation(id, user.id);
    return sendJson(res, 200, { success: true });
  }

  throw new ApiError(405, 'Method not allowed');
});
