import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../services/logger.mjs';

const log = logger;

// Constants
const MAX_COMMAND_HISTORY = 1000;
const PROCESS_KILL_TIMEOUT_MS = 2000;
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB

/**
 * @typedef {Object} CommandResult
 * @property {string} [output]
 * @property {number} [exitCode] 
 * @property {Error} [error]
 */

/**
 * @typedef {Object} CommandRequest
 * @property {string} [command]
 * @property {string} [cid]
 */

class TerminalSocketManager {
    constructor() {
        this.sessions = new Map();
        this.activeProcesses = new Map();
    }

    async executeCommand(command, socket) {
        const processId = uuidv4();
        
        try {
            await validateCommandRequest({ command, cid: processId });
            validateExecutable(command);

            const childProcess = spawn(command, {
                shell: true,
                timeout: PROCESS_KILL_TIMEOUT_MS
            });

            this.activeProcesses.set(processId, childProcess);

            let output = '';
            
            childProcess.stdout.on('data', (data) => {
                output += data.toString();
                if (output.length > MAX_OUTPUT_SIZE) {
                    childProcess.kill();
                    socket.emit('error', { message: 'Output size limit exceeded' });
                } else {
                    socket.emit('output', { id: processId, data: data.toString() });
                }
            });

            childProcess.on('error', (error) => {
                log.error(`Child process error: ${error.message}`);
                socket.emit('error', { message: `Process error: ${error.message}` });
            });

            return new Promise((resolve, reject) => {
                childProcess.on('close', (code) => {
                    this.activeProcesses.delete(processId);
                    resolve({ output, exitCode: code });
                });

                childProcess.on('error', (error) => {
                    this.activeProcesses.delete(processId);
                    reject(error);
                });
            });
        } catch (error) {
            log.error(`Command execution failed: ${error.message}`);
            throw error;
        }
    }
}

// Utility Functions
function cleanupSession(state) {
    if (state.activeProcesses) {
        for (const process of state.activeProcesses.values()) {
            process.kill();
        }
        state.activeProcesses.clear();
    }
}

function validateExecutable(command) {
    if (!/[a-zA-Z]/i.test(command.split(/\s+/)[1])) {
        throw new SyntaxError("Invalid executable format");
    }
    if (command.includes('|') || command.includes(';')) {
        throw new Error("Disallowed shell operators detected");
    }
}

async function validateCommandRequest(req) {
    const requiredFields = ['command', 'cid'];
    requiredFields.forEach(f => {
        if (!req[f]) throw new TypeError(`Missing required field ${f}`);
    });

    validateSecurityConstraints(req.command);
}

function validateSecurityConstraints(input) {
    input = input.trim().toLowerCase();
    const blacklistPatterns = [/<\?php/, /rm -rf/, /sudo /, />[^]*</];
    
    for (const pattern of blacklistPatterns) {
        if (pattern.test(input)) {
            throw new Error('Disallowed pattern detected');
        }
    }
}

export function initTerminalSocket(io) {
    const terminal = io.of('/terminal');
    const manager = new TerminalSocketManager();
    
    terminal.on('connection', socket => {
        log.info(`Terminal client connected: ${socket.id}`);
        
        socket.on('command', async (data) => {
            try {
                const result = await manager.executeCommand(data.command, socket);
                socket.emit('commandComplete', {
                    success: true,
                    ...result
                });
            } catch (error) {
                socket.emit('commandComplete', {
                    success: false,
                    error: error.message
                });
            }
        });

        socket.on('disconnect', () => {
            log.info(`Terminal client disconnected: ${socket.id}`);
            cleanupSession(manager);
        });

        socket.on('error', (error) => {
            log.error(`Socket error for ${socket.id}: ${error}`);
        });
    });
}

const terminalSocketManager = new TerminalSocketManager();

export default {
    initTerminalSocket,
    manager: terminalSocketManager
};