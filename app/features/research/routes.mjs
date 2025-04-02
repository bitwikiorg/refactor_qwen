import { Router } from 'express';
const { StatusCodes } = require('http-status-codes');

// Dependency Injection Setup
const inject = require('../../services/di-container').inject;

const router = Router();

// Core API Endpoints
router.post(
  '/run',
  validateResearchQuery(),
  async (req, res) => {
    const researchService = inject('researchService');
    const memorySystem = inject('memorySystem');

    try {
      const queryConfig = await researchService.validateQuery({
        query: req.body.query,
        depth:
          Math.max(
            Number(req.body.depth),
            process.env.MIN_RESEARCH_DEPTH || 1,
          ) || undefined,
        breadth:
          Math.min(
            Number(req.body.breadth),
            process.env.MAX_RESEARCH_BREADTH || Infinity,
          ) || undefined,
      });

      const memoryLayer = memorySystem.getLayer('semantic');
      if (!memoryLayer) {
        throw new Error("Missing semantic layer");
      }

      const taskId = await researchService.startTask({
        type: 'DEEP',
        params: {
          ...queryConfig,
          memoryLayerId: memoryLayer.id,
        },
      });

      return res.status(StatusCodes.ACCEPTED).json({ taskId });
    } catch (err) {
      return handleAPIError(res)(err);
    }
  }
);

// File Retrieval Endpoint
router.get(
  '/results/:fileId([a-zA-Z0-9\\-\\.]+)',
  validateFileRequest(),
  async (req, res) => {
    try {
      const contentBuffer = await inject('researchRepository')
        .load(req.params.fileId);

      return res.type('.md')
        .attachment(req.params.fileId)
        .send(contentBuffer);
    } catch (err) {
      return handleAPIError(res)(err);
    }
  });

// Status Endpoint with Validation
router.get(
  '/status/:taskId([0-9a-fA-F]{24})', // MongoDB ObjectId pattern example
  asyncValidationMiddleware(validateTaskStatusRequest()),
  async (req, res) => {
    try {
      const status = await inject('researchService').getTaskStatus(req.params.taskId);

      return res.json(status);
    } catch (err) {
      handleAPIError(res)(err);
    }
  });

// Validation Functions
export function validateResearchQuery() {
  return [
    // Implement validation logic using joi/express-validator etc.
  ];
}

export function validateFileRequest() {
  return [
    // Validate filename against regex pattern /^[a-z0-9\-\.]+$/i etc.
  ];
}

export function validateTaskStatusRequest() {
  return () => ({
    // Implement task ID format validation middleware here
  });
}

// Error Handling Function
function handleAPIError(res) {
  return err => {
    let statusCode = 500;
    let errorMessage = 'INTERNAL_SERVER_ERROR';

    switch (true) {
      case err instanceof ResearchValidationError:
        statusCode = 400;
        errorMessage = err.message;
        break;
      case err.code === 'ENOENT':
        statusCode = 404;
        errorMessage = 'FILE_NOT_FOUND';
        break;
    }

    logger.error(errorMessage, err.stack);

    return res.status(statusCode).json({
      success: false,
      error: {
        message: errorMessages[errorMessage] ?? errorMessage,
        code: errorCodes[errorMessage] ?? errorMessage.toLowerCase()
      }
    });
  };
}