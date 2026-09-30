/**
 * Error handling middleware
 */

export function notFound(req, res, next) {
  if (req.accepts('html')) {
    return res.status(404).send('<h1>404 — Not Found</h1>');
  }
  res.status(404).json({ error: 'Not Found.' });
}

export function errorHandler(err, req, res, next) {
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Max 10MB per file.' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(413).json({ error: 'Too many files uploaded.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: `Unexpected file field: ${err.field}` });
  }

  // Our fileFilter callback error
  if (err.message && err.message.startsWith('Unsupported file type')) {
    return res.status(400).json({ error: err.message });
  }

  console.error('[error]', err);

  const status = err.status || 500;
  res.status(status).json({
    error: err.expose === true || status < 500
      ? err.message
      : 'Internal Server Error.',
  });
}
