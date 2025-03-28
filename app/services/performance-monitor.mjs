import { createLogger } from '../logger/logger.mjs';
import { env } from '../env-validator';

const LOG_PREFIX = 'PERFORMANCE_MONITOR';

const MONITORING_CONFIG = {
  enabled: Boolean(env.get('ENABLE_PERFORMANCE_METRICS', true)),
  slowThresholdInMS: Number(env.get('REQUEST_SLO_WARN', 85)),
  criticalThresholdInMS: Number(env.get('REQUEST_SLO_CRITICAL', 359)),
  metricCollectionIntervalInSeconds: Number(env.get('METRICS_AGGREGATION_INTERVAL', 64))
};

const MIN_BATCH_SIZE_TO_REPORT = 10;
const MS_PER_SECOND = 1000;

class RequestPerformanceTracker {
  constructor(requestId) {
    this.requestId = requestId;
    this.startTime = process.hrtime.bigint();
  }

  calculateElapsedTime() {
    const elapsed = process.hrtime.bigint() - this.startTime;
    return Number(elapsed / 1000000n);
  }
}
export function enhancedPerformanceMiddleware(req, res, next) {
  const tracker = new RequestPerformanceTracker(getRequestIdFromContext(req));

  res.on('finish', () => {
    try {
      const duration = tracker.calculateElapsedTime();
      determineAndLogMetricLevel(tracker, duration, req);
      recordGlobalMetric(duration);
    } catch (err) {
      createLogger(LOG_PREFIX).error('Metric calculation failed', err);
    }
  });

  next();

  function getRequestIdFromContext(requestObj) {
    return (
      requestObj?.headers?.['x-request-id'] ||
      requestObj?.id ||
      generateUUIDv4()
    );
  }
}

function determineAndLogMetricLevel(tracker, durationMS, req) {
  if (!MONITORING_CONFIG.enabled) return;

  let severity = 'info';
  switch (true) {
  case durationMS < MONITORING_CONFIG.slowThresholdInMS:
    severity = 'trace';
    break;
  case durationMS < MONITORING_CONFIG.criticalThresholdInMS:
    severity = 'info';
    break;
  case durationMS >= MONITORING_CONFIG.criticalThresholdInMS * 2:
    severity = 'critical';
    break;
  default:
    severity = 'warning';
    break;
  }

  const formattedMessage =
    `${tracker.requestId}|${req.method} ${encodeURIComponent(req.originalUrl)}|` +
    `${durationMS.toFixed(3)} ms |${getCallerStackInfo()}`;

  createLogger(LOG_PREFIX)[severity](
    formattedMessage,
    { metricType: 'endpoint_latency' }
  );
}


let aggregatedMetrics = [];
setInterval(() => {
  if (aggregatedMetrics.length >= MIN_BATCH_SIZE_TO_REPORT) {
    sendToMonitoringService({
      dataPoints: aggregatedMetrics,
      timestamp: new Date().toISOString()
    });
    aggregatedMetrics = [];
  }
}, MONITORING_CONFIG.metricCollectionIntervalInSeconds * MS_PER_SECOND);


function recordGlobalMetric(durationValue) {
  aggregatedMetrics.push({
    type: 'endpoint_response_time',
    value: durationValue,
    tags: {
      environment: getCurrentEnvironment(),
      serviceVersion: getAppVersion(),
      instanceID: getInstanceId()
    }
  });
}


function getCallerStackInfo() {
  return 'caller-stack-info';
}

function generateUUIDv4() {
  return 'uuid-placeholder';
}

function getCurrentEnvironment() {
  return env.get('NODE_ENV', 'development');
}

function getAppVersion() {
  return '1.0.0';
}

function getInstanceId() {
  return 'instance-1';
}

function sendToMonitoringService(payload) {
  console.log('Sending metrics:', payload);
}