// app/features/auth/socket.js
import { io } from "../../infrastructure/express"; // Assuming Express setup exports io instance
import logger from "../../services/logger";
import { updateRole } from "./service";
import { invalidateSessions } from "./service";

io.on("connection", (socket) => {
  socket.on("request-role-update", async (payload) => {
    try {
      const updatedUser = await validateAndExecuteUpdate(payload.userId, payload.newRoleId);
      emitSuccess(socket);
    } catch (error) {
      handleAuthError(socket)(error);
    }
  });

  socket.on("logout-all-sessions", async (userId) => {
    try {
      await terminateAllUserTokens(userId);
      // Use socket.emit or socket.to with a valid session/group context.
      socket.emit("logged-out", { status: "success" });
    } catch (error) {
      handleAuthError(socket)(error);
    }
  });
});

const validateAndExecuteUpdate = async (userId, newRoleId) => {
  const role = await RoleModel.findById(newRoleId);
  if (!role || !userHasPermissionToAssign(role)) {
    throw new Error("Invalid role assignment");
  }
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { role: newRoleId } },
    { new: true },
  );
  return updatedUser;
};

const emitSuccess = (emitter) => {
  emitter.emit("role-updated", { status: "success" });
};

const terminateAllUserTokens = (userId) => {
  return TokenModel.deleteMany({ userId });
};

const emitLoggedOutEvent = (emitter) => {
  emitter.to(`user-${userId}`).emit("logged-out");
};

// Error handling abstraction layer
const handleAuthError = (emitter) => (err) => {
  logger.error(`Socket Auth Error [${err.name}] ${err.message}`);
  emitter.emit("auth-error", {
    message: "Authentication failed",
  });
};
