
import jwt from 'jsonwebtoken';

// Default permissions if environment variable is not set
const DEFAULT_PERMISSIONS = process.env.DEFAULT_PERMISSIONS 
  ? process.env.DEFAULT_PERMISSIONS.split(',') 
  : ['research.create', 'research.view', 'memory.query'];

// Auth configuration
const authConfig = {
  jwtSecret: process.env.AUTH_JWT_SECRET || 'default_secret_key_for_development',
  jwtOptions: process.env.AUTH_JWT_OPTIONS ? JSON.parse(process.env.AUTH_JWT_OPTIONS) : { expiresIn: '7d' }
};

/**
 * Authentication middleware to verify JWT tokens
 */
function authenticate(req, res, next) {
  const tokenHeaderPart = req.headers.authorization?.split(" ");

  // Validate Bearer schema presence before proceeding
  const isValidBearerFormat =
    Array.isArray(tokenHeaderPart) && tokenHeaderPart.length === 2;

  let errorMessage;

  try {
    // Validate header structure early
    if (
      !isValidBearerFormat ||
      tokenHeaderPart[0].toLowerCase() !== "bearer"
    ) {
      errorMessage = `Invalid authorization header format`;
      throw new Error(errorMessage);
    }

    const token = tokenHeaderPart[1];

    // Attempt verification
    const decodedTokenData = jwt.verify(
      token,
      authConfig.jwtSecret,
      { algorithms: ["HS256"] }, // Enforce secure algorithm usage
    );

    req.userContextData = {
      ...decodedTokenData,
      permissionsList: [...DEFAULT_PERMISSIONS],
    };

    next();
  } catch (verifyError) {
    let statusCode;

    switch (verifyError.name) {
      case "JsonWebTokenError":
        statusCode = 401;
        break;
      case "TokenExpiredError":
        statusCode = 401;
        break;
      default:
        statusCode = 500;
    }

    res.status(statusCode).json({
      success: false,
      message: `Authentication failed (${verifyError.name})`,
      details: `${verifyError.message}`,
    });
  }
}

/**
 * Generate a new JWT token
 */
function generateToken(userData) {
  return jwt.sign(
    userData,
    authConfig.jwtSecret,
    authConfig.jwtOptions
  );
}

/**
 * Verify a token and return decoded data
 */
function verifyToken(token) {
  return jwt.verify(token, authConfig.jwtSecret);
}

/**
 * Initialize auth routes
 */
function initializeAuthModule(app) {
  if (!app) {
    throw new Error("App instance required for Auth module");
  }

  // Basic auth status endpoint
  app.get('/auth/status', (req, res) => {
    res.json({ status: 'Authentication service active' });
  });

  // Protect API routes with authentication middleware
  app.use("/api/v1", [
    authenticate,
    ...(process.env.NODE_ENV !== "test" ? [] : []),
  ]);

  console.log('Auth module initialized successfully');

  return {
    verifyToken,
    generateToken
  };
}

// Export the module with proper initialization function
export default { init: initializeAuthModule, authenticate, generateToken, verifyToken };
