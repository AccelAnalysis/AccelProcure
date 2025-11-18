import { Router } from 'express';
import { requireAuth } from '../middleware/authGuard.js';
import { validateRequest } from '../middleware/validateRequest.js';
import generateProposalHandler from '../ai/generateProposal.js';
import generateResponseHandler from '../ai/generateResponse.js';
import suggestMatchesHandler from '../ai/suggestMatches.js';
import mapInsightsHandler, { mapInsightMetricsHandler } from '../ai/mapInsights.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();
const aiLimiter = rateLimit({ keyPrefix: 'ai', windowMs: 60 * 1000, max: 10 });

router.post(
  '/proposal',
  requireAuth,
  aiLimiter,
  validateRequest({
    body: {
      rfxId: { type: 'string', required: true },
      vendorId: { type: 'string' },
      tone: { type: 'string' },
    },
  }),
  generateProposalHandler,
);

router.post(
  '/response',
  requireAuth,
  aiLimiter,
  validateRequest({
    body: {
      question: { type: 'string', required: true },
      context: { type: 'string' },
    },
  }),
  generateResponseHandler,
);

router.post(
  '/matches',
  requireAuth,
  aiLimiter,
  validateRequest({
    body: {
      rfxId: { type: 'string', required: true },
      limit: { type: 'number' },
    },
  }),
  suggestMatchesHandler,
);

router.get('/map-insights', requireAuth, aiLimiter, mapInsightsHandler);
router.get('/map-insights/metrics', requireAuth, aiLimiter, mapInsightMetricsHandler);

export default router;
