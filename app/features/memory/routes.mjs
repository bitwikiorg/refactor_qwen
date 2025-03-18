// File Path: features/memory/routes.mjs
import { Router } from "express";
import { inject } from "../../../services/di-container";
import { MemoryService } from "./service";

const router = Router();
const memService = inject("MemoryService")(MemoryService); // Assuming DI container supports this pattern

//==============================================================================
// Core Endpoints
//==============================================================================

router.get("/layers", async (req, res) => {
    const layers = await memService.listLayers();
    res.status(200).json({ data: layers });
});

router.post("/store", async (req, res) => {
    try {
        const result = await memService.store(req.body.content);
        res.status(201).json({ id: result });
    } catch (e) {
        return res.status(400).send(e.message);
    }
});

router.get("/:type/stats", async (req, res) => {
    const layerStats = await memService.stats(req.params.type);
    return res.json(layerStats);
});

router.put("/promote/:entryId", async (req, res) => {
    try {
        await memservice.promoteToShortterm(req.params.entryId);
        return res.sendStatus(204);
    } catch (err) {
        return handleApiErrors(res, err); // Implement centralized error handler
    }
});

//==============================================================================
// Session Management Endpoints
//==============================================================================

router.post(
    "/session/persist/:id",
    [expressValidatorMiddleware],
    async (req, res) => {
        let success = await memservice.persistChatSession(req.params.id);
        success ? res.sendStatus(204) : res.sendStatus(503);
    },
);

//==============================================================================
// System Maintenance
//==============================================================================

router.post("/maintenance/consolidate", [adminAuthMiddleware], async () => {
    await memservice._warmupCaches(); // Consider exposing public interface instead
    return { status: "started" };
});

export default router;
