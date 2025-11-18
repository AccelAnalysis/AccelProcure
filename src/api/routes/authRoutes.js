import { Router } from 'express';
import loginHandler from '../auth/login.js';
import registerHandler from '../auth/register.js';
import resetPasswordHandler from '../auth/resetPassword.js';
import verifySessionHandler from '../auth/verifySession.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

const authRateLimit = rateLimit({ keyPrefix: 'auth', windowMs: 60 * 1000, max: 15 });

router.post(
  '/login',
  authRateLimit,
  validateRequest({
    body: {
      email: { type: 'string', format: 'email', required: true },
      password: { type: 'string', minLength: 6, required: true },
      provider: { type: 'string', enum: ['supabase', 'firebase'] },
    },
  }),
  loginHandler,
);

router.post(
  '/register',
  authRateLimit,
  validateRequest({
    body: {
      email: { type: 'string', format: 'email', required: true },
      password: { type: 'string', minLength: 8, required: true },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      company: { type: 'string' },
      provider: { type: 'string', enum: ['supabase', 'firebase'] },
    },
  }),
  registerHandler,
);

router.post(
  '/reset-password',
  authRateLimit,
  validateRequest({
    body: {
      email: { type: 'string', format: 'email', required: true },
      provider: { type: 'string', enum: ['supabase', 'firebase'] },
      redirectTo: { type: 'string' },
    },
  }),
  resetPasswordHandler,
);

router.get(
  '/verify',
  authRateLimit,
  validateRequest({
    query: {
      token: { type: 'string', required: false },
    },
  }),
  verifySessionHandler,
);

export default router;
