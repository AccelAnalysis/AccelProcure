export const notFoundHandler = (req, res) => {
  return res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
  });
};

export const errorHandler = (err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const isServerError = status >= 500;
  if (isServerError) {
    console.error('API error:', err);
  }

  return res.status(status).json({
    error: err.message || 'Internal server error',
    ...(err.details ? { details: err.details } : {}),
  });
};

export default errorHandler;
