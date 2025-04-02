import express from 'express';

// Memory System State Container  
const _state = {  
  initializedAtMsSinceEpoch: null, // Fixed invalid optional property syntax
};  

/** @typedef {{ [id: string]: import('../types').MemoryLayer }} MemoryLayersMap */  
let _layersMap; // Map<string, MemoryLayer>

/** Initialize Memory Subsystem */
export async function initialize(configLayersArray /* Array<MemoryLayerDef> */) {  

  const validateInputLayersOrThrowErrorOnInvalidityOfAnyEntry = () => {
    // ...existing code...
  };

  try {
    validateInputLayersOrThrowErrorOnInvalidityOfAnyEntry(configLayersArray);

    _layersMap = {};  

    for (const rawLayerDef of configLayersArray) {
      if (!rawLayerDef?.Key || typeof rawLayerDef.Key !== 'string') {
        throw new Error(`Missing valid Key field`);
      }

      const cleanKey = rawLayerDef.Key.trim().toLowerCase();

      if (_layersMap[cleanKey]) {
        throw new Error(`Duplicate Key ${cleanKey}`);
      }

      // Resolve Config Defaults + Validation Rules Here Before Proceeding...
      const resolvedMaxEntriesCount = Number(rawLayerDef.maximum_Size ?? DEFAULT_LAYER_MAX_ENTRIES);  

      if (Number.isNaN(resolvedMaxEntriesCount)) {
        throw new TypeError(`Invalid maximum_Size value`);
      }

      _layersMap[cleanKey] = {
        id: cryptographicUUID(),
        title: `${rawLayerDef.Name} (${cleanKey})`,
        capacity: {
          hardLimitPerType: {
            textTokens: Number(rawLayerDef?.parameters?.tokenLimit) || DEFAULT_TOKEN_LIMIT_PER_LAYER_TYPE[rawLayerDef.type],
            // ...existing code...
          },
        },
        storage: [],
        lastAccessed: new Date(),
      };
    }

    _state.initializedAtMsSinceEpoch = new Date().getTime();
    console.log('✅ CoreAI-Memory Initialized With %d Layers:', Object.keys(_layersMap).length);
    return true;

  } catch (e) {
    console.error('🔥 Failed To Initialize Memory System:', e.message);
    throw e;
  }
}

/** Get Express Router Instance */
export const router = express.Router();  

router.get('/status', (req, res) => {  
  res.status(200); // Fixed invalid response code
  res.send({
    initialized: Boolean(_state.initializedAtMsSinceEpoch),
    layersCount: Object.keys(_layersMap || {}).length,
  });
});

router.post('/store', async (req, res) => {
  // ...existing code...
});

/** Public API Interface Contract */
/**
 * @typedef {express.Router} IMemoryFeatureModule
 */