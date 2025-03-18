
import { SystemDefaults } from '../config/defaults.js';
import { mergeDeep } from '../utils/object-utils.js';
import { assert } from '../utils/assertions.js';

interface Layer {
  aiSettings: {
    model: string;
    parameters: Record<string, string | number> | null;
  };
  maxSize: number;
}

interface RawConfigurationInput {
  memory?: {
    layers?: Layer[];
  };
}

interface DefaultSystemSchema {
  memory?: {
    layers?: Layer[];
  };
}

interface IConfigurationSource {
  initialized: boolean;
  layers: ReadonlyArray<Layer>;
}

class ConfigLoader implements IConfigurationSource {
  private readonly _rawData: RawConfigurationInput;
  private readonly _defaults: DefaultSystemSchema;
  private _merged: { memory: { layers: Layer[] } } = { memory: { layers: [] } };
  private __initialized = false;

  constructor(rawData?: RawConfigurationInput) {
    this._rawData = rawData || {};
    this._defaults = SystemDefaults.Memory;
    this.load(); /* Ensure auto-initialization */
  }

  public get initialized(): boolean {
    return this.__initialized;
  }

  public get layers(): ReadonlyArray<Layer> {
    assert(this.initialized, "Uninitialized configuration");
    return [...this._merged.memory.layers]; /* Immutable copy */
  }

  protected async load(override: boolean = false): Promise<void> {
    const mergedResult = await Promise.resolve(
      mergeDeep(
        this._defaults || {},
        override ? {} : this._rawData.memory ?? {}
      )
    );

    Object.freeze(mergedResult); /* Immutable post-load */

    Object.defineProperties(this, {
      '_merged': {
        value: mergedResult,
        writable: false,
        enumerable: false,
        configurable: false
      },
      '__initialized': {
        value: true,
        writable: false,
        enumerable: false,
        configurable: false
      }
    });
  }

  protected async validate(): Promise<void> {
    const hasLayers: boolean =
      Array.isArray(this.layers) && this.layers.length > 0;

    assert(hasLayers, "Missing essential memory layer configurations");

    await Promise.all(
      this.layers.map(async (layer, index) => {
        try {
          await this.assertValidModel(layer.aiSettings.model);
          this.verifyMemoryConstraints(layer.maxSize);
          this.enforceParameterValidity(layer.aiSettings.parameters);
        } catch (error) {
          throw new Error(`Validation failed at layer ${index}: ${error instanceof Error ? error.message : String(error)}`);
        }
      })
    );
  }

  private verifyMemoryConstraints(maxSize: number): void {
    const minSizeLimit = 512;
    const maxSupported = Number.MAX_SAFE_INTEGER;

    assert(maxSize >= minSizeLimit && maxSize <= maxSupported, 
      `Memory size must be between ${minSizeLimit} and ${maxSupported}`);
  }

  private enforceParameterValidity(params: Record<string, string | number> | null): void {
    if (!params) return;
    
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw new Error(`Invalid parameter value for key ${key}: ${value}`);
      }
    });
  }

  private async assertValidModel(model: string): Promise<void> {
    const availableModels = await this.fetchAvailableAIModels();
    assert(availableModels.includes(model), `Model ${model} is not available`);
  }

  private async fetchAvailableAIModels(): Promise<string[]> {
    // This would typically fetch from an API or configuration
    return ["gpt-3.5-turbo", "gpt-4"]; // Example models
  }
}

export { ConfigLoader, IConfigurationSource, Layer, RawConfigurationInput };
