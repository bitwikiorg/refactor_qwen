// File Path: features/scheduler/routes.mjs
import express from "express";
import { celebrate, Joi } from "celebrate";
import { createLogger } from "../../services/logger.mjs";
import schedulerService from "../../services/scheduler.mjs"; // Use the real scheduler service

const logger = createLogger("scheduler-routes");
const router = express.Router();
const SCHEDULER_INSTANCE = schedulerService.getSchedulerInstance(); // Production scheduler instance

// Create New Scheduled Task [POST]
router.post(
  "/tasks",
  celebrate({
    body: Joi.object({
      cronExpression: Joi.string()
        .pattern(/^(\*|\d+|\d+,\d+|\d+-\d+)( \S+){5}$/)
        .required()
        .messages({ "string.pattern.base": "Invalid cron expression format" }),
      missionConfigUuid: Joi.string()
        .uuid({ version: ["uuidv3", "uuidv5"] })
        .required(),
      isEnabledFlagOpt: Joi.boolean().default(true),
    }),
  }),
  async (req, res, next) => {
    try {
      const result = await SCHEDULER_INSTANCE.scheduleNewTask({
        cronExpr: req.body.cronExpression,
        missionUuid: req.body.missionConfigUuid,
        isEnabled: req.body.isEnabledFlagOpt ?? true,
      });
      res.status(201).json({ taskId: result.taskInstanceId });
    } catch (error) {
      if (error.joi) {
        logger.error("Validation Failed", error);
        res.status(400).json({ error: "Invalid request parameters" });
      } else {
        next(error);
      }
    }
  }
);

// List Active Tasks [GET]
router.get("/status", async (req, res, next) => {
  try {
    const activeTasksStatuses = await SCHEDULER_INSTANCE.getActiveTaskStatuses();
    res.json(activeTasksStatuses);
  } catch (error) {
    next(error);
  }
});

// Delete Scheduled Mission [DELETE]
router.delete(
  "/tasks/:taskId([a-fA-F0-9]{8}-[a-fA-F0-9]{8}-[a-fA-F0-9]{8})",
  async (req, res, next) => {
    const { taskId } = req.params;
    try {
      const deletionResult = await SCHEDULER_INSTANCE.unscheduleTask(taskId);
      switch (deletionResult.outcome) {
        case "success":
          res.sendStatus(200);
          break;
        case "not_found":
          res.sendStatus(404);
          break;
        default:
          throw new Error(`Unexpected outcome ${deletionResult.outcome}`);
      }
    } catch (error) {
      if (error.code === "TASK_NOT_FOUND") {
        res.status(404).send(`No task found matching ID ${taskId}`);
      } else {
        next(error);
      }
    }
  }
);

// Toggle Enable Status [PATCH]
router.patch(
  "/tasks/:taskId/enabled",
  celebrate({
    body: Joi.object({
      enableValueParam: Joi.boolean(),
    }),
  }),
  async (req, res, next) => {
    const { taskId } = req.params;
    const { enableValueParam } = req.body;
    try {
      const updatedState = await SCHEDULER_INSTANCE.toggleTaskEnabledState(
        taskId,
        Boolean(enableValueParam)
      );
      if (!updatedState.existsAfterToggle) {
        res.status(404).send("Could not locate task");
        return;
      }
      res.json(updatedState.currentEnabledStatus);
    } catch (error) {
      if (error.message === "No task found") {
        res.status(404).send(`No task found matching ID ${taskId}`);
      } else if (error.name === "ValidationError") {
        res.status(400).send(error.message || error.toString());
      } else {
        next(error);
      }
    }
  }
);

export default router;