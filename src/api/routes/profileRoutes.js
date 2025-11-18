import { Router } from 'express';
import getProfileHandler from '../profiles/getProfile.js';
import updateProfileHandler from '../profiles/updateProfile.js';
import enrichProfileHandler from '../profiles/enrichProfile.js';
import { requireAuth } from '../middleware/authGuard.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.get('/me', requireAuth, getProfileHandler);

router.put(
  '/me',
  requireAuth,
  validateRequest({
    body: {
      company_name: { type: 'string' },
      contact_name: { type: 'string' },
      phone_number: { type: 'string' },
      website: { type: 'string' },
      capabilities: { type: 'array', items: { type: 'string' } },
      naics_codes: { type: 'array', items: { type: 'string' } },
    },
  }),
  updateProfileHandler,
);

router.post('/enrich', requireAuth, enrichProfileHandler);

router.get(
  '/:profileId',
  requireAuth,
  validateRequest({ params: { profileId: { type: 'string', required: true } } }),
  getProfileHandler,
);

export default router;
