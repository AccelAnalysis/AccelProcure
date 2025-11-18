import { Router } from 'express';
import getMapDataHandler from '../map/getMapData.js';
import get3dTerrainHandler from '../map/get3DTerrain.js';
import updateHeatmapHandler from '../map/updateHeatmap.js';
import { requireAuth } from '../middleware/authGuard.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.get('/', requireAuth, getMapDataHandler);
router.get('/terrain', requireAuth, get3dTerrainHandler);
router.post(
  '/heatmap',
  requireAuth,
  validateRequest({ body: { points: { type: 'array', required: true, items: { type: 'object' } } } }),
  updateHeatmapHandler,
);

export default router;
