// app/features/research/socket.mjs
import { createLogger } from '../../services/logger.mjs';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('research.socket');
const TASK_CLEANUP_TIMEOUT = process.env.TASK_TTL_MS || 300_000;

class TaskRegistry {
    #tasks = new WeakMap();
    #timeoutIds = new WeakMap();

    addTask(taskId, options) {
        const entry = {
            ...options,
            status: 'initialized',
            created: new Date(),
            progressLog: [],
            startTime: +new Date()
        };

        const timer = setTimeout(() => {
            this.removeTask(taskId);
            try {
                inject('researchService').abortTask(taskId);
                logger.info(`Auto-cleanup triggered ${taskId}`);
            } catch (err) {
                logger.error("Cleanup failed:", err.stack || err.message);
            }
        }, TASK_CLEANUP_TIMEOUT);

        this.#tasks.set(taskId, {
            ...entry,
            _cleanupTimerRef: timer
        });
    }

    getTask(taskId) {
        return this.#tasks.get(taskId) || null;
    }

    updateProgress(taskId, message, newProgress) {
        const existing = this.getTask(taskId);
        if (!existing) return false;

        Object.assign(existing, {
            ...(message && { lastMessage: message }),
            ...(newProgress !== undefined && { progress: newProgress }),
            progressLog: [
                ...existing.progressLog.slice(-19),
                [Date.now(), newProgress || existing.progress]
            ],
            lastUpdated: new Date()
        });

        return true;
    }

    removeTask(id) {
        const entry = this.#tasks.get(id);
        if (entry && entry._cleanupTimerRef) {
            clearTimeout(entry._cleanupTimerRef);
        }
        return this.#tasks.delete(id);
    }
}

export const initSocketHandlers = (namespace, serviceHandlers, diContainer) => {
    const researchService = diContainer.resolve('researchService') || (() => {
        throw new Error("Missing research service dependency");
    })();

    const registry = new TaskRegistry();

    namespace.on('connection', (socket) => {
        logger.info(`Research session established ${socket.id}`);
        logger.info(`Research socket connected: ${socket.id}`);

        socket.on('research-query', async (data) => {
            try {
                const result = await researchService.executeQuery(data.query, data.options);
                socket.emit('research-complete', result);
            } catch (error) {
                socket.emit('research-error', { message: error.message });
            }
        });

        function emitError(errorCode, msg, params = {}) {
            params.error = msg || "Unknown";
            switch (errorCode) {
                case "invalid_query":
                    params.code = "EINVQUERY";
                    break;
                default:
                    params.code = `ESOCKET${errorCode.toUpperCase()}`;
            }
            socket.emit("error", params);
        }

        function validateRequestData(data, paramName = "request") {
            if (!data?.query?.trim()) {
                emitError("invalid_query", "Missing valid query parameter");
                return false;
            }
            return true;
        }

        async function handleResearchRequest(data, callback) {
            try {
                if (!validateRequestData(data)) return;

                const options = {
                    depth: Number(data.depth) || 2,
                    breadth: Number(data.breadth) || 2,
                    onUpdate: (pct, msg) => {
                        registry.updateProgress(data.task_id, msg, pct);
                        socket.emit('research-progress', {
                            id: data.task_id,
                            value: pct.toFixed(2),
                            message: msg
                        });
                    }
                };

                const result = await researchService.executeQuery({
                    ...options,
                    onAbort: async () => {
                        registry.updateProgress(data.task_id, 'aborted');
                        try { await options.onCancel(); } catch { }
                    },
                    cancelToken: createCancellationSource()
                });

                registry.updateProgress(data.task_id, 'completed');
                callback && callback(result);
            } catch (err) {
                logger.error(`Execution failure ${data.task_id}:`, err.stack || err.message);
                registry.updateProgress(data.task_id, 'failed', { reason: getSafeErrorMessage(err) });
                emitError("execution_failed", `Research execution failed (${getSafeErrorMessage(err)})`);
            }
        }

        async function handleQueryEvent(data, callback) {
            try {
                if (!validateRequestData(data)) return;

                const newTask = {
                    id: uuidv4(),
                    userId: socket.user?.id,
                    created: +new Date(),
                    status: 'pending'
                };

                registry.addTask(newTask.id, { socketId: socket.id });

                await registry.startTracking(newTask, (updateCb) => {
                    handleResearchRequest({ ...data, ...newTask }, updateCb)
                        .catch((finalErr) => {
                            logger.error(finalErr, "Final handler failure");
                        });
                });
            } catch (finalErr) {
                logger.fatal(finalErr, "Critical initialization failure");
                process.exit(1);
            }
        }

        async function cancelActiveSession(req, callback, reject) {
            try {
                const target = req.target_task || req.params?.taskId || req.query?.taskId;
                if (!target) return reject ? reject({ code: "ENOTASK" }) : undefined;

                const found = registry.getTask(target);

                if (!found) return reject && reject({ code: "ENOTFOUND" });

                found.abortRequested = true;
                await researchService.cancelOperation(target);
                callback && callback({ ...found, status: "cancelled" });
            } catch (cancelErr) {
                reject && reject(cancelErr);
                throw cancelErr;
            }
        }

        namespace.use((sock, next) => {
            sock.user = sock.request?.session?.passport.user;
            next();
        });

        namespace.on('query:start', (rawData, callback) => handleQueryEvent(rawData, callback));

        namespace.on('/cancel', (req, callback, reject) => cancelActiveSession(req, callback, reject));
    });

    logger.info('Research socket handlers initialized');
    return namespace;
};

export default { initSocketHandlers };