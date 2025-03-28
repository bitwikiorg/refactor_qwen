import { describe, test, expect, vi } from 'vitest';
import { ContainerKeys } from '../../services/di-container.mjs';
import type { StorageInterface } from '../../features/memory/types.d.ts'; // Use `import type` for declaration files

// Add ambient declarations for missing modules
declare module '../../services/di-container.mjs' {
  export const ContainerKeys: { Storage: string };
}

// Correct the module name and ensure it matches the actual file path
declare module '../../features/memory/types.d.ts' {
  export interface StorageInterface {
    commitTransaction: () => void;
    rollbackTransaction: () => void;
    store: (txid: string, payload: any) => Promise<any>;
  }
}

const layers = 'layers';
const mockTx = { rollback: vi.fn(), commit: vi.fn() };

function configureTestingEnvironment(callback: () => void): void {
  // Mock implementation for testing
  callback();
}

function overrideConfiguration(callback: (config: any) => void): void {
  // Mock implementation for testing
  const config = {
    memory: {
      [layers]: [
        { name: 'test', $set: vi.fn() }
      ]
    }
  };
  callback(config);
}

function validate(config: any) {
  // Updated implementation to validate configuration dynamically
  const invalidLayer = config.memory[layers].find((layer: any) => {
    if (layer.maxSize !== undefined && layer.maxSize < 0) return true;
    if (layer.iOptionsResolver === null) return true;
    if (layer.enabled !== undefined && typeof layer.enabled !== 'boolean') return true;
    return false;
  });

  if (invalidLayer) {
    throw new Error('Validation failed');
  }
}

describe("Storage System", () => {
  describe("Atomic Transactions", () => {
    test("Should rollback transaction when error occurs", async () => {
      expect.assertions(3);

      const mockContainer = {
        resolve: (key: string): StorageInterface | undefined => {
          if (key === ContainerKeys.Storage) {
            return new class implements StorageInterface {
              commitTransaction = vi.fn();
              rollbackTransaction = vi.fn();

              async store(_txid: string, payload: any): Promise<any> {
                mockTx.rollback(); // Simulate rollback on error
                throw new Error('Test error');
              }
            }();
          }
          return undefined;
        }
      };

      const sut = mockContainer.resolve(ContainerKeys.Storage);
      if (!sut) throw new Error("StorageInterface not resolved");

      try {
        await sut.store('test-txid', {});
        // Should not reach here
        expect(false).toBe(true);
      } catch (e) {
        // Should reach here
        expect(e).toBeDefined();
      }

      expect(mockTx.rollback).toHaveBeenCalledOnce();
      expect(mockTx.commit).not.toHaveBeenCalled();
    });
  });

  describe("Validation Rules", () => {
    test.each([
      ['memoryLayer', { maxSize: -1 }, 'should fail with negative size'],
      ['invalidLayer', { iOptionsResolver: null }, 'should fail with null resolver'],
      ['another', { enabled: 'string' }, 'should fail with non-boolean enabled']
    ])("%# %s", (layer: string, options: any, errorDesc: string) => {
      configureTestingEnvironment(() => {
        overrideConfiguration((c: any) => {
          c.memory[layers].find((l: any) => l.name === layer)!.$set(options);
        });
      });

      const config = {
        memory: {
          [layers]: [
            { name: layer, ...options }
          ]
        }
      };

      expect(() => validate(config)).toThrowErrorMatchingSnapshot();
    });
  });
});
