import { SystemDefaults } from '../config/defaults.js';
import { mergeDeep } from '../utils/object-utils.js';
import { assert } from '../utils/assertions.js';
class ConfigLoader {
    constructor(rawData) {
        this._merged = { memory: { layers: [] } };
        this.__initialized = false;
        this._rawData = rawData || {};
        this._defaults = SystemDefaults.Memory;
        this.load(); /* Ensure auto-initialization */
    }
    get initialized() {
        return this.__initialized;
    }
    get layers() {
        assert(this.initialized, "Uninitialized configuration");
        return [...this._merged.memory.layers]; /* Immutable copy */
    }
    async load(override = false) {
        const mergedResult = await Promise.resolve(mergeDeep(this._defaults || {}, override ? {} : this._rawData.memory ?? {}));
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
    async validate() {
        const hasLayers = Array.isArray(this.layers) && this.layers.length > 0;
        assert(hasLayers, "Missing essential memory layer configurations");
        await Promise.all(this.layers.map(async (layer, index) => {
            try {
                await this.assertValidModel(layer.aiSettings.model);
                this.verifyMemoryConstraints(layer.maxSize);
                this.enforceParameterValidity(layer.aiSettings.parameters);
            }
            catch (error) {
                throw new Error(`Validation failed at layer ${index}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }));
    }
    verifyMemoryConstraints(maxSize) {
        const minSizeLimit = 512;
        const maxSupported = Number.MAX_SAFE_INTEGER;
        assert(maxSize >= minSizeLimit && maxSize <= maxSupported, `Memory size must be between ${minSizeLimit} and ${maxSupported}`);
    }
    enforceParameterValidity(params) {
        if (!params)
            return;
        Object.entries(params).forEach(([key, value]) => {
            if (typeof value !== 'string' && typeof value !== 'number') {
                throw new Error(`Invalid parameter value for key ${key}: ${value}`);
            }
        });
    }
    async assertValidModel(model) {
        const availableModels = await this.fetchAvailableAIModels();
        assert(availableModels.includes(model), `Model ${model} is not available`);
    }
    async fetchAvailableAIModels() {
        // This would typically fetch from an API or configuration
        return ["gpt-3.5-turbo", "gpt-4"]; // Example models
    }
}
export { ConfigLoader };
//# sourceMappingURL=config-loader.js.map