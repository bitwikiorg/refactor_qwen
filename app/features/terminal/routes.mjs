import { Router } from "express";
import * as terminalService from "./service.mjs"; // Fixed service file import
import { getLogger } from "../../services/logger"; // Assuming centralized logging system

const log = getLogger("TerminalRoutes");

/**
 * Terminal API Routes Configuration
 * @param {Express} app - Main Express application instance
 * @param {object} diContainer - Dependency Injection container object
 */
export default function configureTerminalRoutes(app /* , diContainer */) {
        const router = Router(); // Create isolated scoped router instance

        // Error Handling Middleware Pipeline
        const errorHandlerMiddleware = async (err, req, res /* , next */) => {
                log.error(`Route Error ${req.path}:`, err.stack);
                return res
                        .status(500)
                        .json({ message: "Internal server error" });
        };

        // Validation Middleware Example:
        const validateCommandInput = (req /* , res */, next) => {
                if (!req.body?.command?.trim()) {
                        return next(
                                new Error("Missing required command input"),
                        );
                }
                next();
        };

        /** Terminal UI Endpoint */
        router.get(["/", "/console"], async (_, res) => {
                try {
                        await renderTemplateWithDefaults(res);
                } catch (e) {
                        log.error("Template rendering failed:", e);
                        return sendError(res, e);
                }
        });

        /**
         * Execute Command API Endpoint
         * @route POST /api/v1/console/command-execution/
         */
        router.post("/api/v1/console/command-execution/", [
                validateCommandInput,
                async (req, res) => {
                        try {
                                const result =
                                        await terminalService.executeCommand({
                                                cmd: req.body.command,
                                                sessionID:
                                                        req.session.id ||
                                                        crypto.randomUUID(),
                                        });
                                return res.json({
                                        status: "success",
                                        ...result,
                                });
                        } catch (e) {
                                log.warn(
                                        `Failed executing command ${req.body.command}:`,
                                        e.message,
                                );
                                throw new Error(e.message);
                        }
                },
        ]);

        /** Secure Health Check Endpoint */
        router.get("/status/ping", (_, res) => res.sendStatus(204));

        // Register the error handling middleware for all routes in this router
        router.use(errorHandlerMiddleware);

        // Register routes & middlewares
        app.use("/terminal", router);
}

// Utility Functions Section -------------------------

async function renderTemplateWithDefaults(responseObj) {
        await responseObj
                .render("partials/global-terminal", {
                        pageTitle: "Advanced Terminal Interface",
                        versionNumber: process.env.COREAI_VERSION || "2.x",
                })
                .catch((err) => {
                        throw new TypeError(`Rendering failed ${err}`);
                });
}

function sendError(res, error, status = 500) {
        return res.status(status).json({
                code: error.code || status,
                message: error.message || "Unknown failure",
        });
}
