/**
 * Global JavaScript for COREAI Research System
 * Provides consistent UI behavior across all pages
 */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure consistent navigation highlighting
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav a');

  navLinks.forEach(link => {
    link.classList.remove('active');
    // Remove 'tab' class if it exists (for consistency)
    link.classList.remove('tab');
    
    const linkPath = link.getAttribute('href');
    if (currentPath === linkPath || 
        (currentPath.startsWith(linkPath) && linkPath !== '/')) {
      link.classList.add('active');
    }
  });

  // Special case for root path
  if (currentPath === '/' && navLinks.length > 0) {
    const homeLink = document.querySelector('.nav a[href="/"]');
    if (homeLink) homeLink.classList.add('active');
  }

  // Handle responsive behavior
  const handleResize = () => {
    const container = document.querySelector('.container');
    const header = document.querySelector('.header');
    
    if (container) {
      container.style.width = '100%';
      container.style.maxWidth = '100%';
    }
    
    if (header) {
      header.style.width = '100%';
      header.style.boxSizing = 'border-box';
    }
  };

  // Call on page load and window resize
  handleResize();
  window.addEventListener('resize', handleResize);
});


/**
 * Global JavaScript for COREAI Research System
 * Provides consistent UI behavior across all pages
 */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure consistent navigation highlighting
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav a');

  navLinks.forEach(link => {
    // Remove all possible class variations for consistency
    link.classList.remove('active');
    link.classList.remove('tab');
    link.classList.add('nav-link');
    
    const linkPath = link.getAttribute('href');
    if (currentPath === linkPath || 
        (currentPath.startsWith(linkPath) && linkPath !== '/')) {
      link.classList.add('active');
    }
  });

  // Special case for root path
  if (currentPath === '/' && navLinks.length > 0) {
    const homeLink = document.querySelector('.nav a[href="/"]');
    if (homeLink) homeLink.classList.add('active');
  }

  // Handle responsive behavior
  const handleResize = () => {
    const container = document.querySelector('.container');
    const header = document.querySelector('.header');
    
    if (container) {
      container.style.width = '100%';
      container.style.maxWidth = '100%';
    }
    
    if (header) {
      header.style.width = '100%';
      header.style.boxSizing = 'border-box';
    }
  };

  // Initial call and event listener
  handleResize();
  window.addEventListener('resize', handleResize);
  
  // Fix progress bars if they exist
  const progressBars = document.querySelectorAll('.progress-bar-inner');
  progressBars.forEach(bar => {
    if (bar.dataset.progress) {
      const progressValue = parseInt(bar.dataset.progress);
      bar.style.width = `${progressValue}%`;
    }
  });
});
// Global application scripts
document.addEventListener('DOMContentLoaded', function() {
  console.log('COREAI Research System initialized');
  
  // Initialize Socket.IO connection if available
  try {
    window.socketIO = io();
    console.log('Socket.IO connected');
    
    // Global socket event handlers
    window.socketIO.on('connect', () => {
      console.log('Global socket connected');
    });
    
    window.socketIO.on('disconnect', () => {
      console.log('Global socket disconnected');
    });
    
  } catch (e) {
    console.error('Socket.IO initialization failed:', e);
  }
  
  // Add Bootstrap if needed
  if (!document.querySelector('link[href*="bootstrap"]')) {
    const bootstrapCSS = document.createElement('link');
    bootstrapCSS.rel = 'stylesheet';
    bootstrapCSS.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css';
    document.head.appendChild(bootstrapCSS);
    
    const bootstrapJS = document.createElement('script');
    bootstrapJS.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js';
    document.body.appendChild(bootstrapJS);
  }

  // Add event listener for help buttons
  const helpButtons = document.querySelectorAll('.help-button');
  helpButtons.forEach(button => {
    button.addEventListener('click', function() {
      alert('Help functionality will be implemented in a future update.');
    });
  });
});