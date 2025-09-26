/**
 * Logger utility class for centralized logging across the application
 */
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  /**
   * Format timestamp for log messages
   */
  _getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log message with timestamp and context
   */
  _formatMessage(level, context, message, ...args) {
    const timestamp = this._getTimestamp();
    const formattedMessage =
      args.length > 0 ? `${message} ${args.join(' ')}` : message;

    return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${formattedMessage}`;
  }

  /**
   * Log info messages
   */
  info(context, message, ...args) {
    console.log(this._formatMessage('info', context, message, ...args));
  }

  /**
   * Log error messages
   */
  error(context, message, ...args) {
    console.error(this._formatMessage('error', context, message, ...args));
  }

  /**
   * Log warning messages
   */
  warn(context, message, ...args) {
    console.warn(this._formatMessage('warn', context, message, ...args));
  }

  /**
   * Log debug messages (only in development)
   */
  debug(context, message, ...args) {
    if (this.isDevelopment) {
      console.log(this._formatMessage('debug', context, message, ...args));
    }
  }

  /**
   * Log API request information
   */
  request(method, path, ip, duration = null) {
    const durationStr = duration !== null ? ` (${duration}ms)` : '';
    this.info('REQUEST', `${method} ${path} - ${ip}${durationStr}`);
  }

  /**
   * Log fusion generation with Pokemon details
   */
  fusion(headPokemon, headIndex, bodyPokemon, bodyIndex) {
    this.info(
      'FUSION',
      `Generating fusion: ${headPokemon} (#${headIndex}) + ${bodyPokemon} (#${bodyIndex})`
    );
  }

  /**
   * Log fusion completion
   */
  fusionComplete() {
    this.info('FUSION', 'Fusion generation complete (local data)');
  }

  /**
   * Log server startup
   */
  serverStart(port) {
    this.info('SERVER', `Server running on port ${port}`);
  }

  /**
   * Log server shutdown
   */
  serverShutdown(signal) {
    this.info('SERVER', `Received ${signal}, shutting down gracefully`);
  }

  /**
   * Log API endpoint responses with timing
   */
  apiResponse(endpoint, duration) {
    this.info('API', `${endpoint} completed in ${duration}ms`);
  }

  /**
   * Log API endpoint requests
   */
  apiRequest(endpoint) {
    this.info('API', `Request for ${endpoint}`);
  }
}

// Export a singleton instance
module.exports = new Logger();
