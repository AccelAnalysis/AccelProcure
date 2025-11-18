/**
 * @jest-environment node
 */
import request from 'supertest';

const mockHandler = (label) => jest.fn((req, res) =>
  res.status(200).json({ label, body: req.body, params: req.params, query: req.query })
);

jest.mock('../middleware/authGuard.js', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 'test-user' };
    next();
  },
  optionalAuth: (_req, _res, next) => next(),
}));

jest.mock('../middleware/validateRequest.js', () => ({
  validateRequest: () => (_req, _res, next) => next(),
}));

jest.mock('../middleware/rateLimit.js', () => ({
  rateLimit: () => (_req, _res, next) => next(),
}));

jest.mock('../ai/generateProposal.js', () => ({
  __esModule: true,
  default: mockHandler('ai:proposal'),
}));

jest.mock('../ai/generateResponse.js', () => ({
  __esModule: true,
  default: mockHandler('ai:response'),
}));

jest.mock('../ai/suggestMatches.js', () => ({
  __esModule: true,
  default: mockHandler('ai:matches'),
}));

jest.mock('../ai/mapInsights.js', () => ({
  __esModule: true,
  default: mockHandler('ai:map-insights'),
  mapInsightMetricsHandler: mockHandler('ai:map-insights-metrics'),
}));

jest.mock('../map/getMapData.js', () => ({
  __esModule: true,
  default: mockHandler('map:data'),
}));

jest.mock('../map/get3DTerrain.js', () => ({
  __esModule: true,
  default: mockHandler('map:terrain'),
}));

jest.mock('../map/updateHeatmap.js', () => ({
  __esModule: true,
  default: mockHandler('map:heatmap'),
}));

jest.mock('../profiles/getProfile.js', () => ({
  __esModule: true,
  default: mockHandler('profile:get'),
}));

jest.mock('../profiles/updateProfile.js', () => ({
  __esModule: true,
  default: mockHandler('profile:update'),
}));

jest.mock('../profiles/enrichProfile.js', () => ({
  __esModule: true,
  default: mockHandler('profile:enrich'),
}));

jest.mock('../rfx/createRfx.js', () => ({
  __esModule: true,
  default: mockHandler('rfx:create'),
}));

jest.mock('../rfx/getRfxList.js', () => ({
  __esModule: true,
  default: mockHandler('rfx:list'),
}));

jest.mock('../rfx/getRfxById.js', () => ({
  __esModule: true,
  default: mockHandler('rfx:get'),
}));

jest.mock('../rfx/respondToRfx.js', () => ({
  __esModule: true,
  default: mockHandler('rfx:respond'),
}));

jest.mock('../rfx/evaluateResponses.js', () => ({
  __esModule: true,
  default: mockHandler('rfx:evaluate'),
}));

jest.mock('../rfx/matchResponders.js', () => ({
  __esModule: true,
  default: mockHandler('rfx:match'),
}));

jest.mock('../auth/login.js', () => ({
  __esModule: true,
  default: mockHandler('auth:login'),
}));

jest.mock('../auth/register.js', () => ({
  __esModule: true,
  default: mockHandler('auth:register'),
}));

jest.mock('../auth/resetPassword.js', () => ({
  __esModule: true,
  default: mockHandler('auth:reset'),
}));

jest.mock('../auth/verifySession.js', () => ({
  __esModule: true,
  default: mockHandler('auth:verify'),
}));

import app from '../index.js';

describe('service/API route alignment', () => {
  test('POST /api/ai/proposal resolves through the router', async () => {
    await request(app)
      .post('/api/ai/proposal')
      .send({ rfxId: 'rfx-1' })
      .expect(200);
  });

  test('POST /api/ai/response resolves through the router', async () => {
    await request(app)
      .post('/api/ai/response')
      .send({ rfxId: 'rfx-1' })
      .expect(200);
  });

  test('POST /api/ai/matches resolves through the router', async () => {
    await request(app)
      .post('/api/ai/matches')
      .send({ rfxId: 'rfx-1', limit: 3 })
      .expect(200);
  });

  test('GET /api/map returns data', async () => {
    await request(app)
      .get('/api/map?status=open')
      .expect(200);
  });

  test('GET /api/map/terrain supports bbox query', async () => {
    await request(app)
      .get('/api/map/terrain?bbox=-77,38,-76,39')
      .expect(200);
  });

  test('POST /api/profiles/enrich completes', async () => {
    await request(app)
      .post('/api/profiles/enrich')
      .send({})
      .expect(200);
  });

  test('POST /api/rfx/:id/respond completes', async () => {
    await request(app)
      .post('/api/rfx/rfx-123/respond')
      .send({ content: 'hello' })
      .expect(200);
  });
});
