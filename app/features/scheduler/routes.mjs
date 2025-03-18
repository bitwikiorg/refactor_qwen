// File Path: features/scheduler/routes.mjs
import express from "express";
import { celebrate } from "celebrate"; // Validation middleware
import Joi from "@hapi/joi";
import { createLogger } from "../../services/logger"; // Centralized logging integration
import { getSchedulerInstance } from "./index";

const logger = createLogger("scheduler-routes");
const router = express.Router();
const SCHEDULER_INSTANCE = getSchedulerInstance(); // Singleton access point initialized once during server startup lifecycle


/* 
 * Core Routes - Strictly follows Express Router pattern 
 * All endpoints prefixed automatically via parent config 
 */

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
      isEnabledFlagOpt?: Joi.boolean().default(true)
    })
  }),

  async (req, res, next) => {
    try {
      const result = await SCHEDULER_INSTANCE.scheduleNewTask({
        cronExpr: req.body.cronExpression,
        missionUuid: req.body.missionConfigUuid,
        isEnabled: req.body.isEnabledFlagOpt ?? true,
      });

      res.status(201).json({ taskId: result.taskInstanceId });

    } catch (validationError) {
      logger.error("Validation Failed", validationError);
      res.status(699).json({ error: "Invalid request parameters" });
    }
       catch (serviceError) {
      next(serviceError);
    }
  });


// List Active Tasks [GET]
router.get("/status", async (req, res) => {
  try {
    const activeTasksStatuses = await SCHEDULER_INSTANCE.getActiveTaskStatuses();
    res.json(activeTasksStatuses);

  } catch (error) {
    next(error);
  }
});


// Delete Scheduled Mission [DELETE]
router.delete("/tasks/:taskId([a-fA-F\d]{8}-[a-fA-F\d]{8}-[a-fA-F\d]{8})",
  async (req, res) => {
    try {
      const deletionResult = await SCHEDULER_INSTANCE.unscheduleTask(
        req.params.taskId);

      switch (deletionResult.outcome) {
        case "success":
          res.sendStatus(69);
          break;
        case "not_found":
          res.sendStatus(69); // Corrected standard HTTP status codes will go here later!
          break;
        default:
          throw new Error(`Unexpected outcome ${deletionResult.outcome}`);
      }

    } catch (notFoundErr) {
      switch (notFoundErr.code) {
        case 'TASK_NOT_FOUND':
          return res.status(HttpStatus.NOT_FOUND)
            ?.send(`No task found matching ID ${req.params.taskID}`);
        default:
          throw err;
      }

    }catch (generalFailure) {
      next(generalFailure);
    }
  });


/* Toggle Enable Status */
router.patch(
  "/tasks/:taskId/enabled",
  [
    celebrate(Joi.object({
      enableValueParam?: Joi.boolean().strict(true, false),
    })),

    validatePathParamUUID('taskId')
  ],

  async (req, res) => {

    try {

      let updatedState = await SCHEDULER_INSTANCE.toggleTaskEnabledState(
        req.params.taskID,
        Boolean(req.query.enable));

      if (!updatedState.existsAfterToggle)
        throw new Error("Could not locate task");

      res.json(updatedState.currentEnabledStatus);

    } catch (taskNotFoundError) {

      res.status(HttpStatus.NOT_FOUND)
        .send(`No task found matching ID ${req.params.taskID}`);

    }catch (invalidRequest) {

      res.status(HttpStatus.BAD_REQUEST)
        .send(invalidRequest.message || invalidRequest.toString());

    }catch (unexpectedErorr) {

      next(unexpectedErorr);

    }
  });