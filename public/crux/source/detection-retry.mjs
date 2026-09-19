// Only failures that can plausibly recover on a fresh worker/network attempt retry.
// Callers may mark an operation-specific startup/transport failure retryable=true.
export function isTransientDetectionError(error) {
  if (!error || error.name === 'AbortError' || /^(Suspended|Cancelled|Canceled)$/i.test(String(error.message || error))) return false;
  if (error.retryable === false) return false;
  if (['NotSupportedError', 'SecurityError', 'NotAllowedError', 'SyntaxError', 'ReferenceError', 'RangeError'].includes(error.name)) return false;
  if (error.retryable === true) return true;
  if (['NetworkError', 'TimeoutError'].includes(error.name)) return true;
  if (['NETWORK_ERROR', 'MODEL_DOWNLOAD_FAILED', 'WORKER_START_FAILED', 'WORKER_CRASHED', 'DETECTION_TIMEOUT', 'GPU_DEVICE_LOST'].includes(error.code)) return true;
  return /failed to fetch|fetch failed|network(?: request)? (?:failed|error)|load failed|failed to load (?:the )?(?:model|module)|loading chunk .+ failed|dynamically imported module|timed? out|took too long/i.test(String(error.message || ''));
}

function cancelled() {
  const error = new Error('Detection request is no longer current');
  error.name = 'AbortError';
  return error;
}

export async function retryDetection(operation, {isCurrent = () => true, onRetry = () => {}, attempts = 2} = {}) {
  if (typeof operation !== 'function' || typeof isCurrent !== 'function' || typeof onRetry !== 'function') throw new TypeError('Detection retry needs callable operations');
  if (!Number.isInteger(attempts) || attempts < 1) throw new RangeError('Detection attempts must be a positive integer');
  const limit = Math.min(2, attempts); // At most one automatic retry.
  for (let attempt = 1; attempt <= limit; attempt++) {
    if (!isCurrent()) throw cancelled();
    try {
      const result = await operation(attempt);
      if (!isCurrent()) throw cancelled();
      return result;
    } catch (error) {
      if (attempt === limit || !isCurrent() || !isTransientDetectionError(error)) throw error;
      await onRetry(error, {attempt, nextAttempt: attempt + 1});
      // A reset callback can await cleanup. Check ownership again before retrying.
      if (!isCurrent()) throw error;
    }
  }
}
