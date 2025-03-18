
// ES Module wrapper for default.json config
export default {
  "app_info": {
    "name": "COREAI Research System",
    "version": "2.0.0",
    "description": "AI-driven research assistant with multi-layer memory and automation"
  },
  "ai_providers": {
    "openai": {
      "enabled": true,
      "api_key": process.env.OPENAI_API_KEY || "",
      "models": {
        "embeddings": "text-embedding-3-small",
        "chat": "gpt-3.5-turbo",
        "completion": "gpt-3.5-turbo-instruct"
      }
    }
  },
  "memory_system": {
    "enabled": true,
    "layers": {
      "short_term": {
        "max_size": 100,
        "ttl": 3600
      },
      "working": {
        "max_size": 50,
        "ttl": 86400
      },
      "long_term": {
        "max_size": 1000,
        "ttl": 2592000
      }
    }
  },
  "research_engine": {
    "enabled": true,
    "default_depth": 2,
    "default_breadth": 2,
    "search_providers": {
      "brave": {
        "enabled": true,
        "api_key": process.env.BRAVE_API_KEY || ""
      }
    }
  },
  "workflows": {
    "auto_research": {
      "enabled": true,
      "schedule": "0 */6 * * *"
    },
    "memory_consolidation": {
      "enabled": true,
      "schedule": "0 0 * * *"
    }
  },
  "integrations": {
    "github": {
      "enabled": false,
      "token": process.env.GITHUB_TOKEN || "",
      "repo_config": {
        "owner": "",
        "repo": "",
        "branch": "main"
      },
      "base_url": "https://api.github.com"
    },
    "google_sheets": {
      "enabled": false,
      "api_key": process.env.GOOGLE_API_KEY || "",
      "spreadsheet_id": "",
      "scopes": [
        "https://www.googleapis.com/auth/spreadsheets"
      ]
    },
    "slack": {
      "webhook_url": process.env.SLACK_WEBHOOK_URL || "",
      "is_enabled": false
    }
  }
};
