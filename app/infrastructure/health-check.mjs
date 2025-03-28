import { Router } from 'express';

export const createHealthCheckRouter = ({
  services = {},
  authenticateRequest,
} = {}) => {
  const router = Router();

  router.get('/', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || require('../../package.json').version
    });
  });

  router.get(
    '/diagnostics',
    ...(authenticateRequest ? [authenticateRequest] : []),
    async (_req, res) => {
      try {
        const diagnosticReport = await Promise.all(
          Object.entries(services).map(async ([serviceName, service]) => ({
            name: serviceName,
            status: typeof service.checkStatus === 'function'
              ? await service.checkStatus()
              : { available: false }
          }))
        );
        const overallStatus = diagnosticReport.every(s => s.status.available)
          ? 'healthy'
          : diagnosticReport.some(s => !s.status.available && s.name !== 'cache')
            ? 'degraded'
            : 'critical';
        res.status(200).json({
          overall_status: overallStatus,
          timestamp: new Date().toISOString(),
          runtime_metrics: {
            uptime_seconds: process.uptime(),
            memory_usage: {
              heap_used_kb: process.memoryUsage().heapUsed / 1024,
              external_kb: process.memoryUsage().external / 1024
            }
          },
          component_status: diagnosticReport
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  return router;
};