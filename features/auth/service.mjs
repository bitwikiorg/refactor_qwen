// Authentication Service Module
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import * as userRepositoryMod from "./repo"; // Assuming repository exists here per file tree docs

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

export class AuthenticationService {
  constructor(userRepository = userRepositoryMod.default(), tokenSecret) {
    this._userRepository = userRepository;
    this._tokenSecret = tokenSecret ?? this._getDefaultTokenSecret();
  }

  _getDefaultTokenSecret() {
    if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
      throw new Error("Missing mandatory JWT_SECRET in production");
    }
    return process.env.JWT_SECRET || "__DEV_JWT_KEY__";
  }

  static _getArgonOptions() {
    return {
      type: "argon2id",
      memoryCost: parseInt(process.env.ARGON_MEMORY_COST || "65536", 10),
      timeCost: parseInt(process.env.ARGON_TIME_COST || "4", 10),
    };
  }

  async hashPassword(password) {
    // @type {string} password
    return await argon2.hash(password, this.constructor._getArgonOptions());
  }

  async verifyPassword(hash, password) {
    // @type {string} hash
    // @type {string} password
    return await argon2.verify(hash, password);
  }

  generateAuthToken(user, extraClaims = {}) {
    // @type {{id: number}} user
    // @type {object} extraClaims
    const basePayload = {
      user_id: user.id.toString(),
      exp: this.getTokenExpirationTime(),
    };

    const finalPayload = { ...basePayload, ...extraClaims };

    return jwt.sign(finalPayload, this._tokenSecret, {
      expiresIn: this.getJwtExpiryDuration(),
    });
  }

  getJwtExpiryDuration() {
    return (
      process.env.JWT_ACCESS_TOKEN_LIFETIME ||
      (process.env.NODE_ENV === "test" ? "1m" : "8h")
    );
  }

  getTokenExpirationTime() {
    const now = Math.floor(Date.now() / 1000);
    const expiryDuration = this.getJwtExpiryDuration();
    const durationInSeconds = expiryDuration.endsWith("m")
      ? parseInt(expiryDuration, 10) * 60
      : parseInt(expiryDuration, 10) * 3600;
    return now + durationInSeconds;
  }

  verifyAndDecode(token) {
    // @type {string} token
    try {
      const decoded = jwt.verify(token, this._tokenSecret);
      return typeof decoded === "object" ? decoded : undefined;
    } catch (e) {
      return undefined;
    }
  }

  createAuthMiddleware(requiredRole = []) {
    // @type {number[]} requiredRole
    const authGuard = (req, res, next) => {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const decoded = this.verifyAndDecode(token);

      if (!decoded) {
        return res.status(401).json({ error: "Invalid token" });
      }

      req.user = decoded;

      if (requiredRole.length > 0 && !requiredRole.includes(decoded.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      next();
    };

    return authGuard;
  }

  async login(usernameOrEmail, passwordAttempted) {
    // @type {string} usernameOrEmail
    // @type {string} passwordAttempted
    const foundUser = await this._userRepository.findByUsernameOrEmail(
      usernameOrEmail,
      { select: ["id", "password_hash", "role"] },
    );

    if (!foundUser) {
      throw new InvalidCredentialsError();
    }

    if (
      !(await this.verifyPassword(foundUser.password_hash, passwordAttempted))
    ) {
      throw new InvalidCredentialsError();
    }

    // Rate limiting and logging can be added here

    const accessToken = this.generateAuthToken(foundUser, {
      iat: Date.now(), // Include timestamp for drift detection
      client_ip: req.ip, // If accessible contextually somehow...
    });

    return {
      access_token: `Bearer ${accessToken}`,
      expires_in: this.getJwtExpiryDuration(),
    };
  }

  static validateRequiredRoles(...roles) {
    if (!roles.every((r) => typeof r === "number")) {
      throw new Error("Invalid roles format");
    }
  }
}
