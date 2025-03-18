// app/features/socket.mjs';

import logger from "../../services/logger.mjs";
import { Server } from "socket.io";

/**
 * Memory System Socket Handlers
 */
export default class MemorySocketHandler {
  constructor(ioInstance, memoryService) {
    this.ioInstance = ioInstance;
    this.memoryService = memoryService;
    this.memoryLogger = logger.child({ component: "memory-socket" });
  }

  /**
   * Initialize socket handlers for memory operations
   */
  async initialize() {
    const memoryNamespace = this.ioInstance.of("/memory");

    memoryNamespace.on("connection", (socket) => {
      this.memoryLogger.info(`Memory client connected: ${socket.id}`);

      // Generic handler for socket operations
      const handleSocketOperation = async (
        promiseFn,
        callback,
        errorLogMessage,
      ) => {
        try {
          const result = await promiseFn();
          callback({ success: true, data: result });
        } catch (error) {
          this.memoryLogger.error(errorLogMessage, { error: error.message });
          callback({
            success: false,
            error: "Internal Server Error Processing Request",
          });
        }
      };

      // Event Handlers
      socket.on("getMemoryStats", (data, callback) => {
        handleSocketOperation(
          () => this.memoryService.getStats(),
          callback,
          "Error fetching memory stats",
        );
      });

      socket.on("createMemoryItem", (data, callback) => {
        handleSocketOperation(
          () => this.memoryService.storeMemory(data),
          (response) => {
            memoryNamespace.emit("memoryUpdated", {
              action: "create",
              item: response.data,
            });
            callback(response);
          },
          "Error creating memory item",
        );
      });

      socket.on("updateMemoryItem", (data, callback) => {
        handleSocketOperation(
          () => this.memoryService.updateMemory(data.id, data.item),
          (response) => {
            memoryNamespace.emit("memoryUpdated", {
              action: "update",
              item: response.data,
            });
            callback(response);
          },
          "Error updating memory item",
        );
      });

      socket.on("deleteMemoryItem", (data, callback) => {
        handleSocketOperation(
          () => this.memoryService.deleteMemory(data.id),
          () => {
            memoryNamespace.emit("memoryUpdated", {
              action: "delete",
              id: data.id,
            });
            callback({ success: true });
          },
          "Error deleting memory item",
        );
      });

      socket.on("getMemoryItem", (data, callback) => {
        handleSocketOperation(
          () => this.memoryService.getMemory(data.id),
          callback,
          "Error retrieving memory item",
        );
      });

      socket.on("searchMemory", (data, callback) => {
        handleSocketOperation(
          () => this.memoryService.searchMemory(data.query, data.options),
          callback,
          "Error searching memory",
        );
      });

      socket.on("disconnect", () => {
        this.memoryLogger.info(`Memory client disconnected: ${socket.id}`);
      });
    });

    this.memoryLogger.info("Memory socket handlers initialized");
    return memoryNamespace;
  }
}
