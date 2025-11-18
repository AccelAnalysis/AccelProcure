export const cookieParser = () => (req, _res, next) => {
  const header = req.headers?.cookie;
  if (!header) {
    req.cookies = {};
    return next();
  }

  const cookies = {};
  header.split(';').forEach((chunk) => {
    const [key, ...rest] = chunk.trim().split('=');
    if (!key) return;
    cookies[key] = decodeURIComponent(rest.join('='));
  });

  req.cookies = cookies;
  return next();
};

export default cookieParser;
