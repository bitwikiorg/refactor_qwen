// API Endpoint Definitions
import express from "../../../infrastructure/express";

const router = express.Router();

router.post("/sync-prompts", async (req, res) => {
  try {
    const success = await gitSvc.syncCorePrompts();
    res.status(200).json({ status: success ? "success" : "error" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
