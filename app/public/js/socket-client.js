// Socket.IO client integration
(function() {
  // Check if Socket.IO is already loaded
  if (typeof io !== 'undefined') {
    console.log('Socket.IO already loaded');
    return;
  }

  // Load Socket.IO client dynamically
  function loadSocketIO() {
    try {
      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.6.0/socket.io.min.js';
      script.integrity = 'sha384-c79GN5VsunZvi+Q/WObgk2in0CbZsHnjEqvFxC5DxHn9lTfNce2WW6h2pH6u/kF+';
      script.crossOrigin = 'anonymous';
      
      script.onload = function() {
        console.log('Socket.IO loaded successfully');
        initializeSocketIO();
      };
      
      script.onerror = function() {
        console.error('Failed to load Socket.IO library');
      };
      
      document.head.appendChild(script);
    } catch (err) {
      console.error('Error loading Socket.IO:', err);
    }
  }

  // Initialize Socket.IO connection
  function initializeSocketIO() {
    try {
      // Get the current hostname and protocol
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
      const host = window.location.hostname;
      const port = window.location.port;
      
      // Create the Socket.IO connection
      window.socket = io(`${protocol}://${host}:${port}`, {
        reconnectionAttempts: 5,
        timeout: 10000,
        transports: ['websocket', 'polling']
      });
      
      // Socket connection event handlers
      window.socket.on('connect', function() {
        console.log('Connected to server');
        
        // Dispatch custom event for other scripts
        document.dispatchEvent(new CustomEvent('socket:ready', {
          detail: { socketId: window.socket.id }
        }));
      });
      
      window.socket.on('connect_error', function(err) {
        console.error('Socket.IO connection error:', err);
      });
      
      window.socket.on('disconnect', function(reason) {
        console.log('Disconnected from server:', reason);
      });
      
    } catch (err) {
      console.error('Socket.IO initialization failed:', err);
    }
  }

  // Load Socket.IO when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSocketIO);
  } else {
    loadSocketIO();
  }
})();
/**
 * Socket.IO client interface
 * This file manages the socket.io client connection and provides utility functions
 */

// Initialize socket connection when document is loaded
let socket = null;

function initializeSocket(namespace = '') {
  try {
    // Check if Socket.IO is available
    if (typeof io === 'undefined') {
      console.error('Socket.IO client library not loaded');
      return null;
    }
    
    // Create socket connection with namespace if provided
    const socketUrl = namespace ? namespace : '/';
    socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });
    
    // Set up basic event handlers
    socket.on('connect', () => {
      console.log('Socket.IO connected successfully');
      document.dispatchEvent(new CustomEvent('socket:connected'));
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      document.dispatchEvent(new CustomEvent('socket:error', { detail: error }));
    });
    
    socket.on('disconnect', (reason) => {
      console.warn('Socket.IO disconnected:', reason);
      document.dispatchEvent(new CustomEvent('socket:disconnected', { detail: reason }));
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket.IO reconnected after ${attemptNumber} attempts`);
      document.dispatchEvent(new CustomEvent('socket:reconnected', { detail: attemptNumber }));
    });
    
    socket.on('reconnect_failed', () => {
      console.error('Socket.IO failed to reconnect after all attempts');
      document.dispatchEvent(new CustomEvent('socket:reconnect_failed'));
    });
    
    return socket;
  } catch (error) {
    console.error('Socket.IO initialization failed:', error);
    return null;
  }
}

// Get the socket instance
function getSocket() {
  return socket;
}

// Send a message through the socket
function sendMessage(eventName, data, callback) {
  if (!socket) {
    console.error('Socket not initialized');
    return false;
  }
  
  if (callback) {
    socket.emit(eventName, data, callback);
  } else {
    socket.emit(eventName, data);
  }
  
  return true;
}

// Listen for events
function onEvent(eventName, callback) {
  if (!socket) {
    console.error('Socket not initialized');
    return false;
  }
  
  socket.on(eventName, callback);
  return true;
}

// Remove event listener
function offEvent(eventName, callback) {
  if (!socket) {
    console.error('Socket not initialized');
    return false;
  }
  
  if (callback) {
    socket.off(eventName, callback);
  } else {
    socket.off(eventName);
  }
  
  return true;
}

// Export the socket API
window.SocketClient = {
  initialize: initializeSocket,
  getSocket,
  sendMessage,
  onEvent,
  offEvent
};
// Improved Socket.IO client connection handling
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;

function connectSocket(namespace = '') {
  if (socket) {
    console.log('Socket.IO already loaded');
    return socket;
  }
  
  console.log('Initializing Socket.IO connection...');
  
  // Configure socket with reconnection limits
  socket = io(namespace, {
    reconnection: true,
    reconnectionAttempts: maxReconnectAttempts,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });
  
  socket.on('connect', () => {
    console.log('Connected to server');
    reconnectAttempts = 0;
    // Reset UI elements that might show disconnected state
    document.querySelectorAll('.offline-indicator').forEach(el => {
      el.style.display = 'none';
    });
  });
  
  socket.on('connect_error', (error) => {
    console.log('Socket.IO connection error:', error);
    reconnectAttempts++;
    
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached. Stopping reconnection.');
      socket.disconnect();
      
      // Show offline mode UI indicators
      document.querySelectorAll('.offline-indicator').forEach(el => {
        el.style.display = 'block';
      });
    }
  });
  
  console.log('Socket.IO initialized successfully');
  return socket;
}

// Expose to window for global access
window.connectSocket = connectSocket;
