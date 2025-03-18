// app/features/auth/auth.feature.js
import express from "express";
import jwt from "jsonwebtoken";
import logger from "../../services/logger";
import { AuthUser } from "./user.model"; // Adjust import based on actual export name
import { RateLimiterMemory } from "rate-limiter-flexible";
import Joi from "joi";

// Define authentication configuration
const authConfig = {
  jwtSecret: process.env.AUTH_JWT_SECRET,
  jwtOptions: {
    expiresIn: process.env.JWT_EXPIRY || "24h",
    algorithm: "HS512",
  },
};

if (!authConfig.jwtSecret) {
  throw new Error("AUTH_JWT_SECRET must be provided");
}

// Define user permissions
const USER_PERMISSIONS_ENUM = ["admin", "user", "guest"];

function getPermissionsFromEnv() {
  return (
    process.env.DEFAULT_PERMISSIONS?.split(",")
      .map((p) => p.trim().toLowerCase())
      .filter((p) => USER_PERMISSIONS_ENUM.includes(p)) || []
  );
}

const DEFAULT_PERMISSIONS = getPermissionsFromEnv();

// Rate limiter to prevent brute force attacks
const limiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

// Middleware to verify JWT token and set user data in request object
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret, {
      algorithms: [authConfig.jwtOptions.algorithm],
    });
    req.user = decoded;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
}

// Authentication error class
class AuthenticationError extends Error {
  constructor(message = "Authentication failed", errorCode = "AUTH_FAILED") {
    super(message);
    this.name = "AuthenticationError";
    this.errorCode = errorCode;
  }
}

class InvalidCredentialsError extends AuthenticationError {
  constructor() {
    super("Invalid credentials", "AUTH_INVALID_CREDENTIALS");
  }
}

class TokenExpiredError extends AuthenticationError {
  constructor() {
    super("Token has expired", "AUTH_TOKEN_EXPIRED");
  }
}

// Validate login input
function validateLoginInput(data) {
  const schema = Joi.object({
    usernameOrEmail: Joi.string().required(),
    password: Joi.string().min(8).required(),
  });

  const { error } = schema.validate(data);
  if (error) {
    throw new Error(error.details[0].message);
  }
  return data;
}

// Authenticate request
async function authenticateRequest(reqBody) {
  const { usernameOrEmail, password } = reqBody;

  const foundUser = await AuthUser.findOne({
    $or: [
      { username: usernameOrEmail },
      { email: usernameOrEmail }, // If email field exists
    ],
  });

  if (!foundUser || !(await foundUser.comparePassword(password))) {
    throw new InvalidCredentialsError();
  }

  return foundUser;
}

// Generate JWT token
async function generateToken(userDoc) {
  return jwt.sign(
    {
      sub: userDoc._id.toString(),
      perms: userDoc.permissions.filter((p) =>
        USER_PERMISSIONS_ENUM.includes(p),
      ),
      iat: Math.floor(Date.now() / 1000),
      exp:
        Math.floor(Date.now() / 1000) +
        parseInt(process.env.JWT_EXPIRY_SECONDS || "28800", 10), // 28800 seconds = 8 hours
    },
    authConfig.jwtSecret,
    authConfig.jwtOptions,
  );
}

// Login route handler
export async function loginRouteHandler(req, res, next) {
  try {
    await limiter.consume(req.ip);
  } catch (reject) {
    return res.status(429).json({
      message: "Too many attempts",
      retryAfter: Math.ceil(reject.msBeforeNext / 1000),
    });
  }

  try {
    const validatedData = validateLoginInput(req.body);
    const authenticatedUser = await authenticateRequest(validatedData);
    const accessToken = await generateToken(authenticatedUser);

    logger.info(`User authenticated ${authenticatedUser.username}`);

    res.json({
      success: true,
      accessToken: `Bearer ${accessToken}`,
      user: {
        id: authenticatedUser._id.toString(),
        username: authenticatedUser.username,
        permissions: authenticatedUser.permissions.filter((p) =>
          USER_PERMISSIONS_ENUM.includes(p),
        ),
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// Middleware to verify JWT token with optional role checking
export function verifyJWTMiddleware(options = {}) {
  const { requiredRoles = [] } = options;

  return (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    try {
      const decoded = jwt.verify(token, authConfig.jwtSecret, {
        algorithms: [authConfig.jwtOptions.algorithm],
      });

      if (requiredRoles.length > 0 && !requiredRoles.includes(decoded.perms)) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ success: false, message: "Token has expired" });
      }
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  };
}

// Create auth router
export const createAuthRouter = (app) => {
  const authRouter = express.Router();

  // Middleware to parse JSON bodies
  authRouter.use(express.json());

  // Login route
  authRouter.post("/login", loginRouteHandler);

  // Get current user route
  authRouter.get("/me", verifyJWTMiddleware(), (req, res) => {
    res.json({
      success: true,
      user: {
        id: req.user.sub,
        username: req.user.username,
        permissions: req.user.perms,
      },
    });
  });

  // Register routes under /api/v1/auth prefix
  app.use("/api/v1/auth", authRouter);

  logger.info("Authentication routes initialized");
};

// Initialize the auth feature
export async function init(app) {
  logger.info("Initializing Authentication Feature");

  // Ensure database connection is handled elsewhere to avoid direct connection here

  // Create auth router
  createAuthRouter(app);

  logger.info("Authentication initialized");
}

export default {
  init,
  middleware: authMiddleware,
};
