export interface StructuredJobLog {
  event:
    | 'job_created'
    | 'ai_brain_started'
    | 'ai_brain_completed'
    | 'provider_selected'
    | 'provider_request_started'
    | 'provider_request_completed'
    | 'provider_request_failed'
    | 'job_completed'
    | 'job_failed'
    | 'job_cancelled';
  jobId: string;
  userId?: string;
  mode?: string;
  provider?: string;
  model?: string;
  durationMs?: number;
  errorCategory?: string;
  error?: string;
  details?: Record<string, any>;
  timestamp: number;
}

export function logJobEvent(event: Omit<StructuredJobLog, 'timestamp'>): void {
  const timestamp = Date.now();
  const logEntry: StructuredJobLog = {
    ...event,
    timestamp,
  };

  // Redact any accidental keys or base64 in details
  if (logEntry.error) {
    logEntry.error = logEntry.error.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]');
  }

  // Format as readable structured JSON log
  console.log(`[JOB_EVENT] ${JSON.stringify(logEntry)}`);
}
