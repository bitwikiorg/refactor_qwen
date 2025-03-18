// File name remains app/features/brave/routes.js
import express from "express";
import { validateSearchParams } from "./middleware/validation"; // Assuming created folder/file
import BraverySearchController from "./controller";

const router = express.Router();

// Base path configuration
router.use((req, res, next) => {
    res.header("X-API-Version", "v2");
    res.header("X-Rate-Limit", process.env.RATE_LIMIT || "");
    next();
});

// Core search endpoint
router.get("/search", [
    validateSearchParams,
    async (req, res, next) => {
        try {
            const results = await BraverySearchController.handleQuery(
                req.query,
            );
            return res.status(200).json({ data: { results } });
        } catch (err) {
            return next(err); // Let global error handler format response
        }
    },
]);

// Advanced query endpoint supporting POST body parameters
router.post("/advanced", [
    validateAdvancedQuery,
    async (req, res) => {
        const results = await BraverySearchController.executeAdvanced({
            query: req.body.q,
            filters: req.body.filters || {},
            sort: req.body.sort || [],
        });

        return res.json(results);
    },
]);

export default router;
