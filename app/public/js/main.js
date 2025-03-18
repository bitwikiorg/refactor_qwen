
document.addEventListener('DOMContentLoaded', () => {
  console.log('COREAI Research System initialized');
  
  // Initialize Socket.IO
  try {
    const socket = io();
    
    socket.on('connect', () => {
      console.log('Socket.IO initialized successfully');
      // Additional socket event handlers can be placed here
    });
    
    socket.on('connect_error', (error) => {
      console.log('Socket.IO connection error:', error);
    });
    
    // Make socket available globally
    window.socket = socket;
  } catch (error) {
    console.log('Socket.IO initialization failed:', error);
  }
  
  // Other client-side initialization code
});
