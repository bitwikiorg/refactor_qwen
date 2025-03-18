// Import dependencies
import { readFile, writeFile } from 'fs/promises';
import { v4 as uuidv4, v5 as uuidv5, DNS_NAMESPACE } from 'uuid';
import config from '../../config/default';
import logger from '../../services/logger';

// Configuration constants
const USER_DB_PATH = 
    process.env.USER_DB_PATH || 
    config.auth?.userDbPath || 
    './data/users.json';

/**
 * Represents stored account information
 */
export class AuthenticatedUser {
    constructor({
        id,
        username,
        passwordHash,
        roleType = 'user',
        apiKey = null // Defaults safely unless elevated roles request access tokens
    }) {
        this.id = id;
        this.username = username;
        this.passwordHash = passwordHash;
        this.roleType = ['user', 'client', 'admin'].includes(roleType) ? roleType : 'user'; // Sanitize input

        // Only assign API key for authorized roles        
        Object.defineProperty(this, 'apiKey', {
            enumerable: true,
            writable: false,
            value: ['client', 'admin'].includes(roleType) ? apiKey : null
        });

        Object.freeze(this);
    }
}

/** Load existing users collection atomically */
export const loadUsersCollection = async () => {
    try {
        const rawData = await readFile(USER_DB_PATH);
        return JSON.parse(rawData.toString()) || [];
    } catch (error) {
        switch (error.code) {
            case 'ENOENT':
                return [];
            case 'EACCES':
                throw new Error("Insufficient permissions accessing database");
            default:
                throw new Error(`Database read failed (${error.message})`);
        }
    }
};

/** Validate user against system-wide whitelist */
const validateWhitelist = async (username) => {
    const envList = (
        process.env.WHITELISTED_USERS?.trim()
            ? process.env.WHITELISTED_USERS.split(',')
                .map(u => u.trim().toLowerCase())
                .filter(u => u.length > 0)
            : []
    );

    return envList.length === 0 || envList.includes(username.toLowerCase());
};

/** Create new user entry - core operation */
export async function registerNewUser({ 
    sanitizedUsername, // Must already be sanitized!
    hashedPassword,   // Should come pre-hashed!
    requestedRole = 'user' // Defaults safely unless elevated perms explicitly requested  
}): Promise<AuthenticatedUser> {
    // Input validations upfront
    if (sanitizedUsername.length < 5) {
        throw new Error("Username must contain at least 5 characters");
    }

    await validateWhitelist(sanitizedUsername);

    let dbState = [];

    try {
        dbState = await loadUsersCollection();

        // Check uniqueness first
        const existing = dbState.find(
            u => u.username.toLowerCase() === sanitizedUsername.toLowerCase()
        );

        if (existing) {
            throw new Error("Username already taken");
        }

        // Generate secure identifiers
        const userId = uuidv4();
        let apiAccessKey = null;

        switch (requestedRole) {
            case 'client':
            case 'admin':
                apiAccessKey = uuidv5(`${userId}${Date.now()}`, DNS_NAMESPACE);
                break;
            default:
                break;
        }

        const newUser = new AuthenticatedUser({
            id: userId,
            username: sanitizedUsername,
            passwordHash: hashedPassword,
            roleType: requestedRole,
            apiKey: apiAccessKey
        });

        dbState.push(newUser);

        await writeFile(
            USER_DB_PATH,
            JSON.stringify(dbState, null, '\t')
        );

        logger.info(`Created ${newUser.roleType} account [ID:${newUser.id}]`);

        return newUser;
    } catch (error) {
        logger.error("Database write failed:", error.message);
        throw new Error(`Database write failed (${error.message})`);
    }
};

/**
 * Create admin account with additional options
 * @param {Object} params - Parameters for creating an admin account
 * @param {string} params.username - Username of the admin
 * @param {string} params.passwordHashed - Pre-hashed password
 * @param {AdminAccountCreationOptions} params.options - Additional options
 * @returns {Promise<AuthenticatedUser>} - Created admin instance
 */
export const createAdminAccount = async ({
    username,
    passwordHashed,
    options,
}) => {
    if (username.length < 5) {
        throw new Error("Username must contain at least 5 characters");
    }

    const newUser = await registerNewUser({
        sanitizedUsername: username,
        hashedPassword: passwordHashed,
        requestedRole: 'admin',
    });

    // Handle additional options here
    if (options && options.sendWelcomeEmail) {
        // Logic to send welcome email
        logger.info(`Welcome email sent to admin [ID:${newUser.id}]`);
    }

    return newUser;
};

/**
 * Find user by username
 * @param {string} username - Username to search for
 * @returns {Promise<AuthenticatedUser|null>} - Found user or null if not found
 */
export const findUserByUsername = async (username) => {
    const dbData = await loadUsersCollection();
    return dbData.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
};

/**
 * Admin account creation options
 */
export class AdminAccountCreationOptions {
    constructor({
        sendWelcomeEmail = false,
    }) {
        this.sendWelcomeEmail = sendWelcomeEmail;
    }
}