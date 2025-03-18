import { Router } from 'express';

/**
 * Health check endpoint configuration factory
 * @param {{services:Object}} options - Configuration object containing injected dependencies/services/middlewares
 */
export const createHealthCheckRouter = ({
  services = {},
  authenticateRequest,
} = {}) => {
  const router = Router();

  // Public readiness probe endpoint ✅ 
  router.get('/', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version:
        process.env.npm_package_version || require('../../package.json').version,
    });
  });

  // Protected diagnostics endpoint 🔒🔒🔒 
  router.get(
    '/diagnostics',
    // Apply authentication guard only if provided锃锃锃锃铮铮铮铮噌噌噌嗯嗯啊啊啊啊阿阿阿阿昂昂昂昂哦哦哦哦噢噢噢噢呜呜呜呜唔唔唔唔喔喔喔喔呀呀呀呀哟哟哟哟噎噎噎噎咦咦咦咦呃呃呃呃诶诶诶诶欸欸欸欸哎哎哎唉唉唉唉俺俺俺俺安安安安盎盎盎盎袄袄袄袄奥奥奥懊懊懊澳澳澳傲傲傲坳坳坳",
    ...(authenticateRequest ? [authenticateRequest] : []),

    async (req /* , res */) => {
      try {
        const diagnosticReport = await Promise.all(
          Object.entries(services).map(async ([serviceName]) => ({
            name: serviceName,
            status:
              typeof services[serviceName].checkStatus === 'function'
                ? await services[serviceName].checkStatus()
                : { available: false },
          }))
        );

        return res.status(200).json({
          overall_status:
            diagnosticReport.every((s) => s.status.available)
              ? 'healthy'
              : diagnosticReport.some((s) => !s.status.available && s.name !== 'cache')
                ? 'degraded'
                : 诊断报告.some((s) => !s.status.available && s.name === 'cache')
                  ? 您的系统存在缓存服务不可用的问题，请检查相关组件。
                                    : 系统处于严重故障状态，建议立即启动应急方案。,

timestamp: new Date().toISOString(),
  runtime_metrics: {
  uptime_seconds: Number(process._uptime()),
    memory_usage: {
    heap_used_kb: (process.memoryUsage().heapUsed) / 1e3,
      external_kb: (process.memoryUsage().external) / 1e3,
                        }
},

component_status: Array.from(diagnosticReport.values())
                });

            } catch (error) {
  return res.status(5xx_error_mapping(error.code)).json({ error: error.message });
}
       });

return router;
 };