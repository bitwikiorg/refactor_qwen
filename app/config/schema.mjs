// app/config/schema.mjs
export const CONFIG_SCHEMA = {
  "$schema": "http://json-schema.org/draft-2023-06/schema",
  "$id": "/config/coreai-config",
  "title": "CORE AI Configuration Schema",
  "description": "Schema validating all configuration aspects including providers, memory systems & security settings",

  // Top-Level Structure Validation
  type: "object",

  // Required Root Properties
  required: [
    "appInfo",
    "aiProviders",
    "memorySystem",
    "workflows"
  ],

  properties: {
    // System Metadata Block
    appInfo: {
      type: "object",
      description: "Application metadata block",
      properties: {
        name: { type: "string" },
        version: { type: "string" },
        description: { type: "string" },
        plugins: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
      required: ["name", "version", "description"]
    },

    // AI Providers
    aiProviders: {
      type: "object",

      patternProperties: {
        "^\\w+[-_]?\\w*$": {
          type: "object",
          properties: {
            useGlobalApiKey: { type: "boolean" },
            globalApiKey: { oneOf: [{ const: null }, { type: "string" }] },

            endpoints: {
              type: "object",
              additionalProperties: {
                oneOf: [
                  { format: "uri" },
                  { const: null }
                ]
              }
            },

            models: {
              type: "object",
              patternProperties: {
                "^\\w+$": {
                  oneOf: [
                    { "$ref": "#/$defs/modelConfig" }
                  ]
                }
              }
            },

            customSettings: {
              "$ref": "#/$defs/providerCustomSettings"
            }
          },

          additionalProperties: false,
          required: ["useGlobalApiKey", "endpoints", "models"]
        }
      },

      additionalProperties: false,
      required: []
    },

    // Memory System
    memorySystem: {
      type: "object",
      properties: {
        layers: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "key", "maxSize", "aiSettings"],

            properties: {
              name: { type: "string" },
              key: { type: "string" },
              maxSize: { type: "number" },

              aiSettings: {
                type: "object",
                required: ["modelId", "parameters"],

                properties: {
                  modelId: { type: "string" },
                  parameters: { type: "object" },
                  description: { type: "string" }
                },

                additionalProperties: true
              }
            },

            additionalProperties: false
          },

          minItems: 1
        }
      },

      additionalProperties: false,
      required: ["layers"]
    },

    // Workflow Requirements
    workflows: {
      type: "object",
      properties: {
        taskScheduler: {
          type: "object",
          properties: {
            tasksDirectory: { type: "string" },
            cronInterval: {
              type: "string",
              pattern: "^(\\*(/\\d+)?|\\d+|\\d+-\\d+|\\d+/\\d+)( (\\*(/\\d+)?|\\d+|\\d+-\\d+|\\d+/\\d+)){4}$"
            }
          },
          required: ["tasksDirectory"],
          additionalProperties: false
        }
      },
      additionalProperties: false,
      required: ["taskScheduler"]
    }
  },

  additionalProperties: false,
  required: ["appInfo", "aiProviders", "memorySystem", "workflows"],

  $defs: {
    modelConfig: {
      type: "object",
      properties: {
        parameters: { type: "object" },
        temperature: { type: "number", minimum: 0, maximum: 1 }
      },
      additionalProperties: true,
      required: ["parameters"]
    },

    providerCustomSettings: {
      type: "object",
      additionalProperties: true
    }
  }
};