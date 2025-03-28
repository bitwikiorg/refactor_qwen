document.addEventListener('DOMContentLoaded', () => {
  // Prevent duplicate initialization (first instance)
  if (window.terminalInitialized) return;
  window.terminalInitialized = true;

  // Initialize Socket.IO connection.  Assuming SocketClient is defined elsewhere and handles duplicate declarations
  const socket = window.SocketClient.initialize('/terminal');
  window.terminalSocket = socket;

  // Handle socket connection status
  document.addEventListener('socket:connected', () => {
    addSystemMessage('[SYSTEM] Connected to server successfully.');
  });

  document.addEventListener('socket:error', () => {
    addErrorMessage('[ERROR] Failed to establish connection. Terminal operating in offline mode.');
    addSystemMessage('[SYSTEM] Try using basic commands: help, clear, status');
  });

  document.addEventListener('socket:disconnected', () => {
    addErrorMessage('[ERROR] Connection lost. Terminal operating in offline mode.');
    addSystemMessage('[SYSTEM] Try using basic commands: help, clear, status');
  });


  const outputElement = document.getElementById('output');
  const commandInput = document.getElementById('command-input');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const toggleSidebarBtn = document.getElementById('toggle-sidebar');
  const closeSidebarBtn = document.getElementById('close-sidebar');
  const sidebar = document.querySelector('.sidebar');

  // Terminal variables
  const commandHistory = [];
  let historyPos = -1;
  let activeResearch = null;
  let depth = 3;
  let breadth = 5;
  let aiChatMode = false;
  window.chatHistory = [];

  function focusInput() {
    commandInput.focus();
  }
  focusInput();
  document.addEventListener('click', focusInput);

  // Toggle sidebar
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      sidebar.classList.toggle('hidden');
    });
  }

  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', () => {
      sidebar.classList.add('hidden');
    });
  }

  if (sidebar) {
    document.addEventListener('click', (event) => {
      if (
        !sidebar.contains(event.target) &&
                toggleSidebarBtn && !toggleSidebarBtn.contains(event.target) &&
                !sidebar.classList.contains('hidden')
      ) {
        sidebar.classList.add('hidden');
      }
    });
  }

  /**
     * appendOutput - the main function to display lines in the terminal.
     * @param {string} text - The text to display (e.g., "[USER] Hello")
     * @param {string} type - The message type (system, user, ai, error, analysis, etc.)
     */
  function appendOutput(text, type = 'system') {
    const line = document.createElement('p');
    line.textContent = text;
    line.classList.add(`${type}-message`);

    // Make text selectable
    line.style.userSelect = 'text';

    outputElement.appendChild(line);
    outputElement.scrollTop = outputElement.scrollHeight;
    console.log(`Terminal message [${type}]:`, text);
  }

  function appendHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html;

    // Make text selectable
    div.style.userSelect = 'text';

    outputElement.appendChild(div);
    outputElement.scrollTop = outputElement.scrollHeight;
  }

  function updateProgress(percent, message) {
    if (progressFill && progressText) {
      progressFill.style.width = `${percent}%`;
      progressText.textContent = message || `${percent}%`;
    }
  }

  function showProgress() {
    if (progressFill && progressText) {
      progressFill.style.width = '100%';
      progressText.textContent = 'Working...';
    }
  }

  function hideProgress() {
    if (progressFill && progressText) {
      progressFill.style.width = '0';
      progressText.textContent = 'Ready';
    }
  }

  // Show system line
  function writeSystem(msg) {
    appendOutput(`[SYSTEM] ${msg}`, 'system');
  }

  // Show user line
  function writeUser(msg) {
    appendOutput(`[USER] ${msg}`, 'user');
  }

  // Show AI line
  function writeAI(msg) {
    appendOutput(`[AI] ${msg}`, 'ai');
  }

  // Show error line
  function writeError(msg) {
    appendOutput(`[ERROR] ${msg}`, 'error');
  }

  // Show analysis line
  function writeAnalysis(msg) {
    appendOutput(`[ANALYSIS] ${msg}`, 'analysis');
  }

  // Show research line
  function writeResearch(msg) {
    appendOutput(`[RESEARCH] ${msg}`, 'research');
  }

  // Clear terminal but keep ASCII logo
  function clearTerminal() {
    const logo = outputElement.querySelector('.ascii-logo');
    const deepResearch = outputElement.querySelector('.deep-research');
    outputElement.innerHTML = '';
    if (logo) outputElement.appendChild(logo);
    if (deepResearch) outputElement.appendChild(deepResearch);
    writeSystem('Terminal cleared');
  }

  // Show help popup
  function showHelp() {
    const helpPopup = document.getElementById('help-popup');
    helpPopup.style.display = 'block';

    // Add system message without changing terminal content
    appendOutput(`[SYSTEM] Help menu opened. Click × to close or type any command.`, 'system');
  }

  // Initialize help button and close button
  document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('help-btn');
    const helpPopup = document.getElementById('help-popup');
    const closeHelp = document.getElementById('close-help');

    if (helpBtn) {
      helpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showHelp();
      });
    }

    if (closeHelp) {
      closeHelp.addEventListener('click', () => {
        helpPopup.style.display = 'none';
      });
    }

    // Close help popup when clicking elsewhere
    document.addEventListener('click', (e) => {
      if (helpPopup.style.display === 'block' &&
                !helpPopup.contains(e.target) &&
                e.target.id !== 'help-btn') {
        helpPopup.style.display = 'none';
      }
    });
  });


  // Check system status
  function checkStatus() {
    writeSystem('Checking system status...');
    if (socket && socket.connected) {
      socket.emit('get-system-stats');
      socket.emit('check-api-status');
    } else {
      writeError('Cannot check status. Socket connection not available.');
      writeSystem('Running in offline mode. Full functionality not available.');
    }
  }

  // Show models
  function showModels() {
    writeSystem('Fetching available models from Venice API...');
    if (socket && socket.connected) {
      showProgress();
      socket.emit('fetch-venice-models');
    } else {
      writeError('Cannot fetch models. Socket connection not available.');
      writeSystem('Running in offline mode. Full functionality not available.');
    }
  }

  // Start research
  function startResearch(query) {
    writeSystem(`Starting research for: "${query}"`);
    writeSystem(`Depth: ${depth}, Breadth: ${breadth}`);

    updateProgress(5, 'Initializing research...');
    writeResearch(`Starting research on: "${query}" (depth: ${depth}, breadth: ${breadth})`);
    writeResearch('Initializing research paths...');

    activeResearch = { id: null, query, depth, breadth };

    if (commandInput) {
      commandInput.disabled = true;
      commandInput.classList.add('input-locked');
      commandInput.placeholder = 'Research in progress...';
    }

    if (socket && socket.connected) {
      socket.emit('research-query', activeResearch);
    } else {
      writeError('Cannot perform research. Socket connection not available.');
      writeSystem('Running in offline mode. Full functionality not available.');
      if (commandInput) {
        commandInput.disabled = false;
        commandInput.classList.remove('input-locked');
        commandInput.placeholder = '';
      }
    }
  }

  // Toggle AI chat mode
  function toggleAIChat() {
    aiChatMode = !aiChatMode;
    if (commandInput) {
      commandInput.placeholder = aiChatMode ? 'Ask me anything...' : '';
    }

    if (aiChatMode) {
      writeSystem('Entering AI chat mode. Type \'exit\' to leave.');
      if (window.chatHistory.length === 0) {
        window.chatHistory.push({
          user: 'system',
          message: 'Chat session initialized',
        });
      }
    } else {
      writeSystem('Exiting AI chat mode.');
    }
  }

  // Process command
  function processCommand(command) {
    // Show command in terminal
    appendOutput(`> ${command}`, 'command');

    // Store in history
    if (command.trim()) {
      commandHistory.push(command);
      historyPos = commandHistory.length;
    } else return;

    // Lowercase for checking
    const cmd = command.trim().toLowerCase();
    const args = cmd.split(' ');
    const mainCmd = args[0];

    // Check if socket is available for commands requiring server communication
    const socketCommands = ['research', 'github:status', 'github:sync', 'github:test', 'models', 'status'];
    if (socketCommands.includes(mainCmd) && (!socket || !socket.connected)) {
      writeError('Command cannot be processed. Socket connection not available.');
      writeSystem('Try using basic commands: help, clear, status');
      return;
    }

    switch (mainCmd) {
    case 'help':
      showHelp();
      break;
    case 'clear':
      clearTerminal();
      break;
    case 'status':
      checkStatus();
      break;
    case 'research': {
      // Must have quotes
      const match = command.match(/research\s+"([^"]+)"/);
      if (match && match[1]) {
        startResearch(match[1]);
      } else {
        writeError('Research query must be in quotes. Example: research "quantum computing"');
      }
      break;
    }
    case 'chat':
    case 'ai':
      toggleAIChat();
      break;
    case 'exit':
      if (aiChatMode) toggleAIChat();
      else writeError('Not in AI chat mode');
      break;
    case 'github:status':
      if (socket && socket.connected) {
        appendOutput('[SYSTEM] Checking GitHub connection status...', 'system');
        socket.emit('github:verify-connection', {}, (response) => {
          if (response.connected) {
            appendOutput(`[GITHUB] Connected to repository: ${response.user}/${response.repo}`, 'system');
          } else {
            appendOutput(`[GITHUB] Not connected: ${response.error}`, 'system');
          }
        });
      } else {
        writeError('Command cannot be processed. Socket connection not available.');
        writeSystem('Try using basic commands: help, clear, status');
      }
      break;
    case 'github:sync':
      if (socket && socket.connected) {
        appendOutput('[SYSTEM] Syncing research files with GitHub...', 'system');
        socket.emit('github:sync-all-research', {}, (response) => {
          if (response.success) {
            appendOutput(`[GITHUB] Synced ${response.count} of ${response.total} files to GitHub`, 'system');
          } else {
            appendOutput(`[GITHUB] Sync failed: ${response.error}`, 'system');
          }
        });
      } else {
        writeError('Command cannot be processed. Socket connection not available.');
        writeSystem('Try using basic commands: help, clear, status');
      }
      break;
    case 'github:test':
      if (socket && socket.connected) {
        appendOutput('[SYSTEM] Testing GitHub connectivity with sample file...', 'system');
        socket.emit('github:test-upload', {}, (response) => {
          if (response.success) {
            appendOutput(`[GITHUB] Test successful. File uploaded to: ${response.url}`, 'system');
          } else {
            appendOutput(`[GITHUB] Test failed: ${response.error}`, 'system');
          }
        });
      } else {
        writeError('Command cannot be processed. Socket connection not available.');
        writeSystem('Try using basic commands: help, clear, status');
      }
      break;
    case 'depth': {
      const d = parseInt(args[1]);
      if (d >= 1 && d <= 5) {
        depth = d;
        writeSystem(`Research depth set to ${depth}`);
      } else {
        writeError('Depth must be between 1 and 5');
      }
      break;
    }
    case 'breadth': {
      const b = parseInt(args[1]);
      if (b >= 2 && b <= 10) {
        breadth = b;
        writeSystem(`Research breadth set to ${breadth}`);
      } else {
        writeError('Breadth must be between 2 and 10');
      }
      break;
    }
    case 'models':
      showModels();
      break;
    default:
      writeError(`Unknown command: ${command}`);
      writeSystem(`Type "help" for available commands`);
      break;
    }
  }

  // Process AI chat message
  function processChatMessage(message) {
    // Show user line
    writeUser(message);

    // Show AI "thinking"
    const thinkingEl = document.createElement('p');
    thinkingEl.textContent = '[AI] Thinking...';
    thinkingEl.className = 'message-ai';
    outputElement.appendChild(thinkingEl);
    outputElement.scrollTop = outputElement.scrollHeight;

    if (socket && socket.connected) {
      socket.emit('terminal:ai-message', {
        message: message,
        history: window.chatHistory.filter(item => item.user !== 'system'),
        model: 'deepseek-r1-671b'
      }, (response) => {
        outputElement.removeChild(thinkingEl);

        const responseText = response.text || '';
        // If there's a <think> block
        const analysisMatch = responseText.match(/<think>([\s\S]*?)<\/think>/);
        if (analysisMatch && analysisMatch[1]) {
          writeAnalysis(analysisMatch[1].trim());
          // Then the rest
          const actualResponse = responseText.replace(/<think>[\s\S]*?<\/think>/, '').trim();
          if (actualResponse) writeAI(actualResponse);
        } else {
          writeAI(responseText);
        }

        if (response && response.success) {
          window.chatHistory.push({
            user: 'user',
            message: message,
            content: message
          });
          window.chatHistory.push({
            user: 'assistant',
            message: response.text,
            content: response.text
          });
        }
      });
    } else {
      setTimeout(() => {
        outputElement.removeChild(thinkingEl);
        writeAI('I\'m currently running in offline mode. Full AI functionality is not available.');
      }, 1500);
    }
  }

  // Command input handling
  if (commandInput) {
    commandInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const command = commandInput.value.trim();
        if (!command) return;
        if (aiChatMode && !command.startsWith('/')) {
          processChatMessage(command);
        } else if (aiChatMode && command === '/exit') {
          aiChatMode = false;
          writeSystem('Exiting AI chat mode. Type \'chat\' to re-enter.');
        } else {
          processCommand(command);
        }
        commandInput.value = '';
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyPos > 0) {
          historyPos--;
          commandInput.value = commandHistory[historyPos];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyPos < commandHistory.length - 1) {
          historyPos++;
          commandInput.value = commandHistory[historyPos];
        } else {
          historyPos = commandHistory.length;
          commandInput.value = '';
        }
      }
    });
  }

  // Initialize terminal with CORE AI logo
  function initializeTerminal() {
    if (!outputElement) return;

    // Clear any existing content
    outputElement.innerHTML = '';

    // Add logo (only once)
    const logoElement = document.createElement('pre');
    logoElement.className = 'ascii-logo';
    logoElement.textContent = `
 ██████╗  ██████╗  ██████╗  ███████╗      █████╗  ██╗
██╔════╝██╔═══██╗ ██╔══██╗ ██╔════╝      ██╔══██╗ ██║
██║     ██║   ██║ ██████╔╝ █████╗        ███████║ ██║
██║     ██║   ██║ ██╔══██╗ ██╔══╝        ██╔══██║ ██║
╚██████╗╚██████╔╝ ██║  ██║ ███████╗      ██║  ██║ ██║
 ╚═════╝ ╚═════╝  ╚═╝  ╚═╝  ╚══════╝      ╚═╝  ╚═╝ ╚═╝
        `;
    outputElement.appendChild(logoElement);

    // Add separator
    const separatorElement = document.createElement('div');
    separatorElement.className = 'deep-research';
    separatorElement.textContent = '============== DEEP RESEARCH PRIVACY ==============';
    outputElement.appendChild(separatorElement);

    // Initialize with system messages
    writeSystem('Initializing CORE AI subsystems...');
    writeSystem('Loading research modules...');
    writeSystem('Connecting to Venice.ai...');
    writeSystem('Connecting to Brave Search...');
    writeSystem('All systems operational.');
    writeSystem('CORE AI terminal ready. Type help for commands.');

    // Check if socket is connected
    if (socket && socket.connected) {
      writeSystem('Connection established');
    } else {
      writeError('Failed to establish connection. Terminal operating in offline mode.');
      writeSystem('Try using basic commands: help, clear, status');
    }
  }

  // Socket events
  if (socket) {
    socket.on('connect', () => {
      // Dispatch custom event to handle connection
      const connectedEvent = new Event('socket:connected');
      document.dispatchEvent(connectedEvent);
      writeSystem('Connection established');
    });

    socket.on('disconnect', () => {
      // Dispatch custom event to handle disconnection
      const disconnectedEvent = new Event('socket:disconnected');
      document.dispatchEvent(disconnectedEvent);
    });


    socket.on('error', (error) => {
      // Dispatch custom event to handle errors
      const errorEvent = new Event('socket:error');
      document.dispatchEvent(errorEvent);
      console.error('Socket.IO error:', error);
    });

    socket.on('research-progress', (data) => {
      if (!activeResearch) return;
      if (!activeResearch.id && data.id) {
        activeResearch.id = data.id;
      }
      updateProgress(data.progress, data.message);
      writeResearch(data.message);

      if (data.thoughtProcess) {
        appendHTML(`
                    <div class="thought-process">
                        <div class="thought-process-header">Chain of Thought:</div>
                        <div class="thought-process-content">${data.thoughtProcess}</div>
                    </div>
                `);
      }
      if (data.intermediateResults) {
        appendHTML(`
                    <div class="intermediate-results">
                        <div class="intermediate-results-header">Intermediate Results:</div>
                        <div class="intermediate-results-content">${data.intermediateResults}</div>
                    </div>
                `);
      }
    });

    socket.on('research-complete', (data) => {
      if (!activeResearch || activeResearch.id !== data.id) return;
      progressFill.style.width = '100%';
      progressText.textContent = 'Research complete!';
      setTimeout(() => {
        progressFill.style.width = '0%';
        progressText.textContent = 'Ready';
      }, 3000);

      commandInput.disabled = false;
      commandInput.classList.remove('input-locked');
      commandInput.placeholder = '';
      commandInput.focus();

      if (data.results) {
        appendOutput(`[RESEARCH] ${data.results}`, 'success');
      }
    });

    socket.on('research-error', (data) => {
      commandInput.disabled = false;
      commandInput.classList.remove('input-locked');
      commandInput.placeholder = '';
      commandInput.focus();

      progressText.textContent = 'Error';
      progressFill.style.width = '0%';
      progressFill.style.backgroundColor = '#ff6b6b';

      if (data.message) {
        writeError(data.message);
      }
    });

    socket.on('system-stats', (stats) => {
      appendHTML(`
                <div class="system-stats">
                    <h3>SYSTEM STATUS</h3>
                    <div class="stat-item">
                        <span class="stat-label">Memory Usage:</span>
                        <span class="stat-value">${stats.memory}%</span>
                        <div class="stat-bar">
                            <div class="stat-fill" style="width: ${stats.memory}%"></div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Uptime:</span>
                        <span class="stat-value">${stats.uptime}</span>
                    </div>
                </div>
            `);
    });

    socket.on('api-status', (status) => {
      appendHTML(`
                <div class="api-status">
                    <h3>API STATUS</h3>
                    <div class="stat-item">
                        <span class="stat-label">Venice AI:</span>
                        <span class="stat-value ${status.venice ? 'active' : 'inactive'}">${status.venice ? 'CONNECTED' : 'DISCONNECTED'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Brave Search:</span>
                        <span class="stat-value ${status.brave ? 'active' : 'inactive'}">${status.brave ? 'CONNECTED' : 'DISCONNECTED'}</span>
                    </div>
                </div>
            `);
    });

    socket.on('research-status', (data) => {
      const percent = data.progress || 0;
      updateProgress(percent, data.message || 'Processing...');
      if (data.message) {
        writeResearch(data.message);
      }

      if (data.thoughtProcess) {
        let processContainer = document.querySelector('.research-process-container');
        if (!processContainer) {
          processContainer = document.createElement('div');
          processContainer.className = 'research-process-container';
          outputElement.appendChild(processContainer);

          const header = document.createElement('div');
          header.className = 'research-step-header';
          header.textContent = '=== RESEARCH PROCESS ===';
          processContainer.appendChild(header);
        }
        processContainer.innerHTML = '';
        const header = document.createElement('div');
        header.className = 'research-step-header';
        header.textContent = '=== RESEARCH PROCESS ===';
        processContainer.appendChild(header);

        const thoughts = data.thoughtProcess.split('<br>');
        thoughts.forEach(thought => {
          if (thought.trim()) {
            const thoughtElement = document.createElement('div');
            thoughtElement.className = 'ai-thought';
            thoughtElement.textContent = thought;
            processContainer.appendChild(thoughtElement);
          }
        });
        processContainer.scrollTop = processContainer.scrollHeight;
        outputElement.scrollTop = outputElement.scrollHeight;
      }
    });

    // Additional "chat-reasoning" or "chat-response" events, if needed
    socket.on('chat-reasoning', (data) => {
      if (data.success && data.reasoning) {
        appendOutput(`[THINKING] ${data.reasoning}`, 'thinking');
      }
    });

    socket.on('chat-response', (data) => {
      hideProgress();
      if (data.success) {
        writeAI(data.response);
      } else {
        writeError(data.response || 'Unknown error');
      }
    });
  }

  // Initialize terminal with CORE AI logo
  initializeTerminal();
  console.log('COREAI Research System initialized');
});

//Helper functions assumed to be defined elsewhere
function addSystemMessage(message) {
  //Implementation to add system message to the UI
  console.log('System message:', message);
}

function addErrorMessage(message) {
  //Implementation to add error message to the UI
  console.error('Error message:', message);
}
document.addEventListener('DOMContentLoaded', function() {
  // Skip if already initialized
  if (window.terminalSecondInitDone) return;
  window.terminalSecondInitDone = true;

  // DOM Elements
  const terminalOutput = document.getElementById('terminal-output');
  const terminalInput = document.getElementById('terminal-input');
  const terminalForm = document.getElementById('terminal-form');
  const statusIndicator = document.getElementById('socket-status');

  // Terminal history
  let commandHistory = [];
  let historyIndex = -1;

  // Initialize Socket.IO connection
  let socket = null;
  try {
    console.log('Initializing Socket.IO connection...');
    socket = io();
    console.log('Socket.IO initialized successfully');

    if (statusIndicator) {
      statusIndicator.classList.remove('status-offline');
      statusIndicator.classList.add('status-online');
      statusIndicator.setAttribute('title', 'Connected');
    }

    // Socket event handlers
    socket.on('connect', () => {
      console.log('Connected to server');
      addMessage('system', '[SYSTEM] Connected to CORE AI server.');

      if (statusIndicator) {
        statusIndicator.classList.remove('status-offline');
        statusIndicator.classList.add('status-online');
        statusIndicator.setAttribute('title', 'Connected');
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      addMessage('error', '[ERROR] Disconnected from server. Trying to reconnect...');

      if (statusIndicator) {
        statusIndicator.classList.remove('status-online');
        statusIndicator.classList.add('status-offline');
        statusIndicator.setAttribute('title', 'Disconnected');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      addMessage('error', '[ERROR] Failed to establish connection. Terminal operating in offline mode.');
      addMessage('system', '[SYSTEM] Try using basic commands: help, clear, status');

      if (statusIndicator) {
        statusIndicator.classList.remove('status-online');
        statusIndicator.classList.add('status-offline');
        statusIndicator.setAttribute('title', 'Connection Error');
      }
    });

    // Handle terminal responses
    socket.on('terminal:response', (data) => {
      console.log('Terminal response:', data);
      if (data.type === 'error') {
        addMessage('error', `[ERROR] ${data.message}`);
      } else if (data.type === 'system') {
        addMessage('system', `[SYSTEM] ${data.message}`);
      } else {
        addMessage('ai', data.message);
      }
    });

    // Handle AI responses
    socket.on('ai-response', (data) => {
      console.log('AI response:', data);
      addMessage('ai', data.message);
    });

  } catch (error) {
    console.error('Socket.IO initialization failed:', error);
    addMessage('error', '[ERROR] Failed to establish connection. Terminal operating in offline mode.');
    addMessage('system', '[SYSTEM] Try using basic commands: help, clear, status');

    if (statusIndicator) {
      statusIndicator.classList.remove('status-online');
      statusIndicator.classList.add('status-offline');
      statusIndicator.setAttribute('title', 'Initialization Error');
    }
  }

  // Handle form submission
  if (terminalForm) {
    terminalForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const command = terminalInput.value.trim();

      if (command) {
        // Add to history
        commandHistory.unshift(command);
        historyIndex = -1;
        if (commandHistory.length > 50) {
          commandHistory.pop();
        }

        // Display the command
        addMessage('command', `> ${command}`);

        // Process command
        processCommand(command);

        // Clear input
        terminalInput.value = '';
      }
    });
  }

  // Handle keyboard navigation for command history
  if (terminalInput) {
    terminalInput.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        if (historyIndex >= 0 && commandHistory[historyIndex]) {
          terminalInput.value = commandHistory[historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        historyIndex = Math.max(historyIndex - 1, -1);
        if (historyIndex >= 0 && commandHistory[historyIndex]) {
          terminalInput.value = commandHistory[historyIndex];
        } else {
          terminalInput.value = '';
        }
      }
    });
  }

  // Add message to terminal
  function addMessage(type, message) {
    if (!terminalOutput) return;

    const messageElement = document.createElement('div');
    messageElement.classList.add('terminal-message', `terminal-${type}`);
    messageElement.textContent = message;

    terminalOutput.appendChild(messageElement);
    safeScrollToBottom();

    // Log for debugging
    console.log(`Terminal message [${type}]:`, message);
  }

  // Process command
  function processCommand(command) {
    // Local command processing
    if (command.toLowerCase() === 'clear') {
      if (terminalOutput) terminalOutput.innerHTML = '';
      return;
    }

    if (command.toLowerCase() === 'help') {
      addMessage('system', '[SYSTEM] Available commands:');
      addMessage('system', '[SYSTEM] help - Display this help message');
      addMessage('system', '[SYSTEM] clear - Clear the terminal');
      addMessage('system', '[SYSTEM] status - Check system status');
      addMessage('system', '[SYSTEM] research <query> - Conduct research on a topic');
      return;
    }

    if (command.toLowerCase() === 'status') {
      addMessage('system', '[SYSTEM] Terminal Status:');
      addMessage('system', `[SYSTEM] Connection: ${socket && socket.connected ? 'Online' : 'Offline'}`);
      addMessage('system', `[SYSTEM] Mode: ${socket && socket.connected ? 'Interactive' : 'Local Only'}`);
      return;
    }

    // If socket is available, send command to server
    if (socket && socket.connected) {
      socket.emit('command', { command });
    } else {
      addMessage('error', '[ERROR] Command cannot be processed. Socket connection not available.');
      addMessage('system', '[SYSTEM] Try using basic commands: help, clear, status');
    }
  }

  // Initialize terminal
  function initTerminal() {
    addMessage('system', '[SYSTEM] Initializing CORE AI subsystems...');
    addMessage('system', '[SYSTEM] Loading research modules...');
    addMessage('system', '[SYSTEM] Connecting to Venice.ai...');
    addMessage('system', '[SYSTEM] Connecting to Brave Search...');
    addMessage('system', '[SYSTEM] All systems operational.');
    addMessage('system', '[SYSTEM] CORE AI terminal ready. Type help for commands.');

    console.log('COREAI Research System initialized');
  }

  // Start the terminal only after DOM is fully loaded
  document.addEventListener('DOMContentLoaded', initTerminal);
});

//Safety function to check DOM elements
function safeScrollToBottom() {
  const terminalContainer = document.getElementById('terminal-container');
  if (terminalContainer) {
    terminalContainer.scrollTop = terminalContainer.scrollHeight;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const outputElement = document.getElementById('terminal-output');
  const inputElement = document.getElementById('terminal-input');
  const terminalContainer = document.getElementById('terminal-container');

  let socket = null;
  let connected = false;
  let commandHistory = [];
  let historyIndex = -1;

  // Initialize Socket.IO
  try {
    // Check if Socket.IO is already initialized
    if (!socket) {
      socket = io('/terminal');
      console.log('Socket.IO initialized successfully');
    }

    socket.on('connect', () => {
      connected = true;
      // Only add message if terminal-container exists
      if (document.getElementById('terminal-container')) {
        addSystemMessage('[SYSTEM] Connected to server.');
      }
    });

    socket.on('disconnect', () => {
      connected = false;
      addErrorMessage('[ERROR] Disconnected from server.');
    });

    socket.on('connect_error', (error) => {
      console.log('Socket.IO connection error:', error);
      // Check if terminal elements exist before adding messages
      if (document.getElementById('terminal-container')) {
        addErrorMessage('[ERROR] Failed to establish connection. Terminal operating in offline mode.');
        addSystemMessage('[SYSTEM] Try using basic commands: help, clear, status');
      }
    });

    socket.on('response', (data) => {
      if (data.type === 'system') {
        addSystemMessage(data.message);
      } else if (data.type === 'error') {
        addErrorMessage(data.message);
      } else if (data.type === 'ai') {
        addAIMessage(data.message);
      } else if (data.type === 'clear') {
        clearTerminal();
      }
    });
  } catch (error) {
    console.log('Socket.IO initialization failed:', error);
    addErrorMessage('[ERROR] Failed to initialize terminal connection.');
  }

  // Initialize terminal
  function initTerminal() {
    addSystemMessage('[SYSTEM] Initializing CORE AI subsystems...');
    addSystemMessage('[SYSTEM] Loading research modules...');
    addSystemMessage('[SYSTEM] Connecting to Venice.ai...');
    addSystemMessage('[SYSTEM] Connecting to Brave Search...');
    addSystemMessage('[SYSTEM] All systems operational.');
    addSystemMessage('[SYSTEM] CORE AI terminal ready. Type help for commands.');

    console.log('COREAI Research System initialized');
  }

  // Handle commands
  function processCommand(command) {
    if (!command.trim()) return;

    // Add command to history
    commandHistory.push(command);
    historyIndex = commandHistory.length;

    // Display command
    addCommandMessage(`> ${command}`);

    // Basic offline commands
    if (command.toLowerCase() === 'help') {
      addSystemMessage(`
Available commands:
- help: Display this help message
- status: Check system status
- clear: Clear the terminal
- research <query>: Research a topic
- chat <message>: Chat with the AI
      `);
      return;
    } 

    if (command.toLowerCase() === 'clear') {
      clearTerminal();
      return;
    }

    if (command.toLowerCase() === 'status') {
      addSystemMessage('[SYSTEM] Terminal status: ' + (connected ? 'Online' : 'Offline'));
      return;
    }

    // Send command to server if connected
    if (connected && socket) {
      socket.emit('command', { command });
    } else {
      addErrorMessage('[ERROR] Command cannot be processed. Socket connection not available.');
      addSystemMessage('[SYSTEM] Try using basic commands: help, clear, status');
    }
  }

  // Terminal message functions
  function addMessage(message, className) {
    const messageElement = document.createElement('div');
    messageElement.className = `terminal-message ${className}`;
    messageElement.textContent = message;
    outputElement.appendChild(messageElement);
    safeScrollToBottom();
  }

  function addSystemMessage(message) {
    console.log('Terminal message [system]:', message);
    addMessage(message, 'system-message');
  }

  function addErrorMessage(message) {
    console.log('Error message:', message);
    addMessage(message, 'error-message');
  }

  function addAIMessage(message) {
    console.log('Terminal message [ai]:', message);
    addMessage(message, 'ai-message');
  }

  function addCommandMessage(message) {
    console.log('Terminal message [command]:', message);
    addMessage(message, 'command-message');
  }

  function clearTerminal() {
    outputElement.innerHTML = '';
    initTerminal();
  }

  function safeScrollToBottom() {
    if (terminalContainer) {
      terminalContainer.scrollTop = terminalContainer.scrollHeight;
    }
  }

  // Input handling
  inputElement.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const command = inputElement.value;
      processCommand(command);
      inputElement.value = '';
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        inputElement.value = commandHistory[historyIndex];
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        inputElement.value = commandHistory[historyIndex];
      } else {
        historyIndex = commandHistory.length;
        inputElement.value = '';
      }
    }
  });

  // Initialize terminal on page load
  initTerminal();
});