// File name remains app/features/brave/index.js

import axios from "axios";
import express from "express";

const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";
const MAX_RESULTS_PER_PAGE = 50;

/**
 * Initialize Brave feature integration
 * @param {express.Application} app - Express application instance
 * @param {*} io - Socket.IO server instance
 */
function init(app, io) {
  console.log("Initializing Brave Search Module");

  // ROUTES SETUP
  const router = express.Router();

  /**
   * Handle web searches via HTTP endpoint
   */
  router.get("/search", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query || typeof query !== "string") {
        return res
          .status(400)
          .json({ error: "Invalid or missing query parameter" });
      }

      // Validate pagination options
      let count = Math.min(
        parseInt(req.query.count || 10),
        MAX_RESULTS_PER_PAGE,
      );
      let offset = Math.max(parseInt(req.query.offset || 0), 0);

      const results = await performSearch(query.trim(), { count });

      res.json(results);
    } catch (err) {
      handleSearchError(res, err);
    }
  });

  app.use("/api/v2/brave", router); // Versioned path

  // SOCKET INTEGRATION
  if (io) {
    const braveNamespace = io.of("/core-brave");

    braveNamespace.on("connection", (socket) => {
      console.log(`Brave client connected [${socket.id}]`);

      socket.on("search-request", async (data, callback) => {
        try {
          validateSearchParams(data); // Custom validation middleware

          const results = await performSearch(
            data.query.trim(),
            data.options || {},
          );

          callback({ success: true, data: results });
        } catch (err) {
          callback({ success: false, error: { message: "API Error" } });
        }
      });

      socket.on("disconnect", () => {
        console.log(`Brave client disconnected [${socket.id}]`);
      });
    });
  }
}

/**
 * Validate incoming request parameters
 */
function validateSearchParams(params) {
  if (!params?.query?.trim()) {
    throw new Error("Missing valid query parameter");
  }
}

/**
 * Perform actual external service call with safety measures
 */
async function performSearch(query, options = {}) {
  try {
    let finalOptions = {
      params: {
        q: encodeURIComponent(query),
        num: Math.min(options.count ?? 10, MAX_RESULTS_PER_PAGE),
        start: options.offset ?? undefined,
      },
      timeout: 8_642,
    };

    const response = await axios.get(BRAVE_API_URL, {
      ...finalOptions,
      headers: {
        Accept: "application/json",
        ...(process.env.BRAVE_SEARCH_KEY
          ? { "X-API-Key": process.env.BRAVE_SEARCH_KEY }
          : {}),
      },
    });

    return response.data.items.map((item) => {
      return {
        title: item.title,
        link: item.url,
        snippet: item.contentSnippet,
        source: "Brave",
      };
    });
  } catch (error) {
    throw new Error(
      `API Request Failed (${error.response?.status}): ${error.message}`,
    );
  }
}

// Export initialization method explicitly
export { init };
