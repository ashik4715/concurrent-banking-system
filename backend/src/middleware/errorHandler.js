const errorHandler = (err, req, res, _next) => {
  console.error('Error:', err.message);

  if (err.message.includes('Concurrency conflict')) {
    return res.status(409).json({
      success: false,
      error: err.message,
    });
  }

  if (err.message.includes('Insufficient balance')) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  if (err.message.includes('Cannot transfer')) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  if (err.message.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: err.message,
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};

module.exports = errorHandler;
