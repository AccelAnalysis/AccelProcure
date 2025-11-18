import { Router } from 'express';
import { requireAuth } from '../middleware/authGuard.js';
import { validateRequest } from '../middleware/validateRequest.js';
import createRfxHandler from '../rfx/createRfx.js';
import getRfxListHandler from '../rfx/getRfxList.js';
import getRfxByIdHandler from '../rfx/getRfxById.js';
import respondToRfxHandler from '../rfx/respondToRfx.js';
import evaluateResponsesHandler from '../rfx/evaluateResponses.js';
import matchRespondersHandler from '../rfx/matchResponders.js';

const router = Router();

router.get('/', requireAuth, getRfxListHandler);
router.post(
  '/',
  requireAuth,
  validateRequest({
    body: {
      title: { type: 'string', required: true },
      description: { type: 'string', required: true },
      submission_deadline: { type: 'string', required: true },
      budget_range: { type: 'string' },
      requirements: { type: 'string', required: true },
      category: { type: 'string' },
      location: { type: 'string' },
      naics_codes: { type: 'array', items: { type: 'string' } },
      status: { type: 'string' },
    },
  }),
  createRfxHandler,
);

router.get(
  '/:rfxId',
  requireAuth,
  validateRequest({ params: { rfxId: { type: 'string', required: true } } }),
  getRfxByIdHandler,
);

router.post(
  '/:rfxId/respond',
  requireAuth,
  validateRequest({
    params: { rfxId: { type: 'string', required: true } },
    body: {
      content: { type: 'string', required: true },
      attachments: { type: 'array', items: { type: 'object' } },
      bid_amount: { type: 'number' },
      availability: { type: 'string' },
    },
  }),
  respondToRfxHandler,
);

router.post(
  '/:rfxId/evaluate',
  requireAuth,
  validateRequest({ params: { rfxId: { type: 'string', required: true } } }),
  evaluateResponsesHandler,
);

router.post(
  '/:rfxId/match',
  requireAuth,
  validateRequest({
    params: { rfxId: { type: 'string', required: true } },
    query: {
      limit: {
        type: 'string',
        custom: (value) =>
          value && Number.isNaN(Number(value)) ? 'query.limit must be numeric when provided' : undefined,
      },
    },
  }),
  matchRespondersHandler,
);

export default router;
