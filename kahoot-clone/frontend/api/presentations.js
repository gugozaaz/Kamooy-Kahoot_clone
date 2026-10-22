import { readJsonBody, sendJson, withErrorHandling, ApiError } from './_lib/http.js';
import { requireAuth } from './_lib/auth.js';
import { dbService } from './_lib/db.js';

export default withErrorHandling(async (req, res) => {
  // All presentation management requires an authenticated instructor
  const user = await requireAuth(req);

  if (req.method === 'GET') {
    const presentationId = req.query?.id;
    if (presentationId) {
      const presentation = dbService.getPresentation(presentationId, user.id);
      if (!presentation) {
        throw new ApiError(404, 'Presentation not found');
      }
      return sendJson(res, 200, { success: true, presentation });
    }

    // List all presentations for authenticated instructor
    const presentations = dbService.getPresentations(user.id);
    return sendJson(res, 200, { success: true, presentations });
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    const presentation = body?.presentation || body;

    if (!presentation || !presentation.id) {
      throw new ApiError(400, 'presentation object with valid id is required');
    }

    const saved = dbService.savePresentation(user.id, presentation);
    return sendJson(res, 200, { success: true, presentation: saved });
  }

  if (req.method === 'DELETE') {
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
