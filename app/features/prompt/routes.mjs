// File Path: features/prompt/routes.mjs
import { Router } from "express";

const router = Router();

router.get("/api/v1/prompts", (_, res) => {
  res.status(501).json({ error: "Endpoint under development" });
});

export default router;
