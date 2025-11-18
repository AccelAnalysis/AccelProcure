const parseOrigins = (origins) => {
  if (!origins) return ['*'];
  if (origins === '*') return ['*'];
  if (Array.isArray(origins)) return origins;
  return origins.split(',').map((origin) => origin.trim());
};

export const cors = (options = {}) => {
  const allowedOrigins = parseOrigins(options.origin || process.env.API_ALLOWED_ORIGINS || '*');
  const allowCredentials = options.credentials ?? true;
  const allowHeaders = options.allowedHeaders || 'Content-Type, Authorization, X-Requested-With';
  const allowMethods = options.methods || 'GET,POST,PUT,PATCH,DELETE,OPTIONS';

  return (req, res, next) => {
    const requestOrigin = req.headers.origin;
    const originToUse = allowedOrigins.includes('*')
      ? requestOrigin || '*'
      : allowedOrigins.includes(requestOrigin)
        ? requestOrigin
        : allowedOrigins[0];

    if (originToUse) {
      res.setHeader('Access-Control-Allow-Origin', originToUse);
    }
    if (allowCredentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Headers', allowHeaders);
    res.setHeader('Access-Control-Allow-Methods', allowMethods);

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    return next();
  };
};

export default cors;
