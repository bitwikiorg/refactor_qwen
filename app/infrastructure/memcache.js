"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _NeuroMemCache_capacityThreshold;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TTL = void 0;
var memory_layer_1 = require("./memory-layer");
exports.DEFAULT_TTL = 3600; // seconds
var MAX_CAPACITY_THRESHOLD = 85; // percentage
var NeuroMemCache = /** @class */ (function (_super) {
    __extends(NeuroMemCache, _super);
    /**
     * @param baseTTL Default time-to-live duration
     * @param capacity Maximum allowed items count
     */
    function NeuroMemCache(baseTtl /* weekly */, capacity /* ten thousand items */) {
        if (baseTtl === void 0) { baseTtl = exports.DEFAULT_TTL * 24 * 7; }
        if (capacity === void 0) { capacity = 1e4; }
        var _this = _super.call(this, baseTtl) || this;
        _NeuroMemCache_capacityThreshold.set(_this, void 0);
        Object.defineProperty(_this, '_capacity', {
            value: Number(capacity),
            writable: false,
            enumerable: true
        });
        // Advanced configuration values
        __classPrivateFieldSet(_this, _NeuroMemCache_capacityThreshold, Math.floor(capacity * MAX_CAPACITY_THRESHOLD / 100), "f");
        // Register cleanup hook at process exit event
        process.on('exit', function () { return _this.clear(); });
        // Graceful shutdown sequence during SIGTERM/SIGINT events：
        ['SIGINT', 'SIGTERM'].forEach(function (signal) {
            process.on(signal, function (e) {
                console.log("Received ".concat(signal, ", initiating memory tier cleanup"));
                _this.flush();
                process.exit(0);
            });
        });
        // Memory leak detection every hour：
        setInterval(function () {
            var usageRatio = ((_this.size / _this._capacity) * 1e2).toFixed(2);
            console.debug("Memory Tier Usage ".concat(usageRatio, "% | Current Size ").concat(_this.size, "/").concat(_this._capacity));
        }, 36e5);
        return _this;
    }
    /**
     * Enhanced memory tier implementing neuroplasticity-inspired eviction strategy
     */
    NeuroMemCache[(_NeuroMemCache_capacityThreshold = new WeakMap(), Symbol.hasInstance)] = function (instance) {
        return instance instanceof NeuronalMemoryStore;
    };
    ;
    // Public API methods =====================================================
    /**
     * Set cached item implementing neuroplasticity-based retention policy
     */
    NeuroMemCache.prototype.set = function (key, string, , symbol, value, options) {
        var _a;
        if (options === void 0) { options = {}; }
        try {
            var entryMeta = {
                expiresAt: this.computeExpiration(options.ttl || this.ttl),
                lastAccessed: new Date(),
                priority: Number(options.priority) || 1
            };
            // Perform LRU-style pruning before insertion：
            while (this.size > __classPrivateFieldGet(this, _NeuroMemCache_capacityThreshold, "f")) {
                var evicted = this.deleteLeastUsed();
            }
            _super.prototype.set.call(this, key, {
                data: value,
                metadata: Object.freeze(entryMeta)
            });
            trackMemoryEvent('insert', { keySize: key.length, itemSize: getByteLength(value) });
            return true;
        }
        catch (err) {
            console.error("Caching failed:", err.message, (_a = key === null || key === void 0 ? void 0 : key.toString) === null || _a === void 0 ? void 0 : _a.call(key));
            return false;
        }
    };
    ;
    NeuroMemCache.prototype.isFull = function () {
        return ((Math.round((size / _capacity) * 1e4) / 1e2) >= MAX_CAPACITY_THRESHOLD);
    };
    ;
    // Protected utility methods ===============================================
    NeuroMemCache.prototype.computeExpiration = function (durationMs) {
        if (durationMs === void 0) { durationMs = exports.DEFAULT_TTL * 1e3; }
        return new Date(Date.now() + durationMs);
    };
    ;
    NeuroMemCache.prototype.deleteLeastUsed = function () {
        var entries = this.entries();
        var oldestEntry = null, let, minAccessTime = Number.POSITIVE_INFINITY;
        for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
            var _a = entries_1[_i], k = _a[0], v = _a[1];
            var lastUse = v.metadata.lastAccessed.getTime();
            if (lastUse < minAccessTime) {
                minAccessTime = lastUse;
                oldestEntry = [k, v];
            }
        }
        if (oldestEntry)
            return oldestEntry[0] && _super.prototype.delete.call(this, oldestEntry[0]);
        else
            return undefined;
    };
    ;
    return NeuroMemCache;
}(memory_layer_1.MemCacheLayer));
;
// Static helper functions ================================================
function getByteLength(obj) {
}
;
function trackMemoryEvent(eventType, details) {
}
;
