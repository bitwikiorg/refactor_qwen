graph TD
  %% External Inputs
  UserInput[User Input Web Interface, Terminal]
  GitHub[GitHub API]
  VeniceAI[Venice AI API]
  BraveSearch[Brave Search API]
  Database[Database Memory, Tasks, Logs]

  %% Core Modules
  subgraph CoreModules[Core Modules]
    Terminal[Terminal Module]
    Scheduler[Scheduler Module]
    Research[Research Module]
    Memory[Memory Module]
    Chat[Chat Module]
    Plugins[Plugins Module]
    Auth[Authentication Module]
    Config[Configuration Loader]
    Utils[Utility Functions]
    Views[Server-Side Views (EJS)]
    Infrastructure[Infrastructure (Express, Socket.IO)]
  end

  %% Outputs
  ResearchOutputs[Research Outputs (Markdown)]
  MemoryLogs[Memory Logs (JSON/Markdown)]
  TaskDefinitions[Task Definitions (Markdown)]
  SystemLogs[System Logs]

  %% External Inputs to Core Modules
  UserInput -->|Commands, Queries| Terminal
  UserInput -->|Task Creation| Scheduler
  UserInput -->|Research Queries| Research
  UserInput -->|Memory Management| Memory
  UserInput -->|Chat Messages| Chat
  GitHub -->|Sync Data| Plugins
  VeniceAI -->|AI Models| Research
  BraveSearch -->|Search Results| Research
  Database -->|Persistent Data| Memory

  %% Core Module Interactions
  Terminal -->|Execute Commands| Scheduler
  Terminal -->|Trigger Research| Research
  Terminal -->|Manage Memory| Memory
  Terminal -->|Chat Interaction| Chat
  Scheduler -->|Schedule Tasks| Research
  Scheduler -->|Manage Tasks| Memory
  Research -->|Store Findings| Memory
  Research -->|Generate Outputs| ResearchOutputs
  Memory -->|Retrieve Context| Research
  Memory -->|Store Logs| MemoryLogs
  Chat -->|Store Conversations| Memory
  Plugins -->|GitHub Sync| Memory
  Plugins -->|Brave Search| Research
  Auth -->|Secure Access| Terminal
  Auth -->|Secure Access| Chat
  Config -->|Load Settings| CoreModules
  Utils -->|Helper Functions| CoreModules
  Views -->|Render UI| UserInput
  Infrastructure -->|Socket.IO Events| CoreModules
  Infrastructure -->|Express Routes| CoreModules

  %% Outputs from Core Modules
  Research -->|Markdown Files| ResearchOutputs
  Memory -->|Logs| MemoryLogs
  Scheduler -->|Task Files| TaskDefinitions
  CoreModules -->|Logs| SystemLogs

  %% Subsystems
  subgraph Subsystems[Subsystems]
    subgraph MemorySubsystem[Memory Subsystem]
      ShortTermMemory[Short-Term Memory]
      LongTermMemory[Long-Term Memory]
      EpisodicMemory[Episodic Memory]
      SemanticMemory[Semantic Memory]
      ProceduralMemory[Procedural Memory]
    end
    subgraph ResearchSubsystem[Research Subsystem]
      ResearchService[Research Service]
      ResearchSocket[Research Socket]
      ResearchRoutes[Research Routes]
    end
    subgraph SchedulerSubsystem[Scheduler Subsystem]
      SchedulerService[Scheduler Service]
      SchedulerSocket[Scheduler Socket]
      SchedulerRoutes[Scheduler Routes]
    end
    subgraph TerminalSubsystem[Terminal Subsystem]
      TerminalService[Terminal Service]
      TerminalSocket[Terminal Socket]
      TerminalRoutes[Terminal Routes]
    end
    subgraph PluginSubsystem[Plugin Subsystem]
      GitHubPlugin[GitHub Plugin]
      BravePlugin[Brave Plugin]
    end
  end

  %% Subsystem Interactions
  MemorySubsystem -->|Provide Context| ResearchSubsystem
  ResearchSubsystem -->|Store Outputs| MemorySubsystem
  SchedulerSubsystem -->|Manage Tasks| ResearchSubsystem
  TerminalSubsystem -->|Trigger Actions| CoreModules
  PluginSubsystem -->|Extend Functionality| CoreModules

  %% Outputs from Subsystems
  MemorySubsystem -->|Logs| MemoryLogs
  ResearchSubsystem -->|Markdown Files| ResearchOutputs
  SchedulerSubsystem -->|Task Files| TaskDefinitions
  PluginSubsystem -->|GitHub Sync| GitHub