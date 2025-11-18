import { getSupabaseClient } from '../utils/supabaseClient.js';
import { getFirebaseAdminApp } from '../utils/firebaseAdmin.js';

const TOKEN_REGEX = /Bearer\s+(.*)$/i;

const extractToken = (req) => {
  const authHeader = req.headers?.authorization;
  if (authHeader && TOKEN_REGEX.test(authHeader)) {
    return authHeader.match(TOKEN_REGEX)[1];
  }

  const cookieToken = req.cookies?.session || req.cookies?.['accelrfx-session'];
  if (cookieToken) {
    return cookieToken;
  }

  if (req.query?.access_token) {
    return req.query.access_token;
  }

  return null;
};

const resolveSupabaseUser = async (token) => {
  const supabase = getSupabaseClient();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }
  return data.user;
};

const resolveFirebaseUser = async (token) => {
  const firebaseApp = await getFirebaseAdminApp();
  if (!firebaseApp || !token) {
    return null;
  }

  try {
    const decoded = await firebaseApp.auth().verifyIdToken(token);
    return {
      id: decoded.uid,
      email: decoded.email,
      firebase: true,
      role: decoded.role || 'user',
      app_metadata: decoded,
    };
  } catch (error) {
    return null;
  }
};

export const requireAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }

    const supabaseUser = await resolveSupabaseUser(token);
    if (supabaseUser) {
      req.user = supabaseUser;
      return next();
    }

    const firebaseUser = await resolveFirebaseUser(token);
    if (firebaseUser) {
      req.user = firebaseUser;
      return next();
    }

    return res.status(401).json({ error: 'Invalid or expired token' });
  } catch (error) {
    return next(error);
  }
};

export const optionalAuth = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }

    const supabaseUser = await resolveSupabaseUser(token);
    if (supabaseUser) {
      req.user = supabaseUser;
      return next();
    }

    const firebaseUser = await resolveFirebaseUser(token);
    if (firebaseUser) {
      req.user = firebaseUser;
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export default requireAuth;
