import axios from "axios";
import express from "express";
import { BraveService } from "./service.mjs";
import logger from "../../../services/logger.mjs"; // Corrected import path and default import

const MAX_RESULTS_PER_PAGE = 50;

export default {
  init(app, io) {
    logger.info("Initializing Brave module");

    const service = new BraveService();
    try {
      service.initialize();
    } catch (err) {
      logger.error("Failed to initialize Brave service:", { message: err.message, stack: err.stack });
      throw err; // Propagate error
    }

    const router = express.Router();

    router.get("/search", async (req, res) => {
      try {
        const query = req.query.q;
        if (!query || typeof query !== "string") {
          return res.status(400).json({ error: "Invalid or missing query parameter" });
        }
        const count = Math.min(parseInt(req.query.count || 10, 10), MAX_RESULTS_PER_PAGE);
        // Use service.execute with query and pageSize (offset not supported so omitted)
        const results = await service.execute({ query: query.trim(), pageSize: count });
        res.json(results);
      } catch (err) {
        logger.error(`Search error: ${err.message}`, { stack: err.stack });
        res.status(500).json({ error: "Internal server error" });
      }
    });

    router.get("/status", (req, res) => {
      res.json(service.getStatus());
    });

    app.use("/api/v2/brave", router);

    if (io) {
      const braveNamespace = io.of("/core-brave");
      braveNamespace.on("connection", (socket) => {
        logger.info(`Brave client connected [${socket.id}]`);

        socket.on("search-request", async (data, callback) => {
          try {
            const results = await performSearch(data.query.trim(), data.options || {});
            callback({ success: true, data: results });
          } catch (err) {
            logger.error(`Socket search error: ${err.message}`, { stack: err.stack });
            callback({ success: false, error: { message: "API Error" } });
          }
        });

        socket.on("disconnect", () => {
          logger.info(`Brave client disconnected [${socket.id}]`);
        });

        socket.on("error", (error) => {
          logger.error(`Socket error on Brave namespace: ${error.message}`, { stack: error.stack });
        });
      });
    }

    return service;
  },
};