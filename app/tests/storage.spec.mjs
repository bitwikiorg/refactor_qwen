import { describe, test, expect, vi } from 'vitest';
import { ContainerKeys } from '../../services/di-container.mjs';
const layers = 'layers';
const mockTx = { rollback: vi.fn(), commit: vi.fn() };
function configureTestingEnvironment(callback) {
    // Mock implementation for testing
    callback();
}
function overrideConfiguration(callback) {
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
function validate() {
    // Mock implementation
    throw new Error('Validation failed');
}
describe("Storage System", () => {
    describe("Atomic Transactions", () => {
        test("Should rollback transaction when error occurs", async () => {
            expect.assertions(2);
            const mockContainer = {
                resolve: (key) => {
                    if (key === ContainerKeys.Storage) {
                        return new class {
                            constructor() {
                                this.commitTransaction = vi.fn();
                                this.rollbackTransaction = vi.fn();
                            }
                            async store(_txid, payload) {
                                throw new Error('Test error');
                            }
                        }();
                    }
                }
            };
            expect.assertions(3);
            try {
                const sut = { store: async () => { } }; // Mock implementation
                await sut.store({ layer: "test" });
                // Should not reach here
                expect(false).toBe(true);
            }
            catch (e) {
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
        ])("%# %s", (layer, options, errorDesc) => {
            configureTestingEnvironment(() => {
                overrideConfiguration((c) => {
                    c.memory[layers].find((l) => l.name === layer).$set(options);
                });
            });
            expect(() => validate()).toThrowErrorMatchingSnapshot();
        });
    });
});
//# sourceMappingURL=storage.spec.js.map