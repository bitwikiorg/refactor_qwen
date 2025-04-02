/* eslint-env mocha */
/* global describe, it, beforeEach */
import { expect } from 'chai';
import MemoryService from '../features/memory/service.mjs';

describe('MemoryService', () => {
  let memoryService;

  beforeEach(() => {
    memoryService = new MemoryService();
  });

  it('should store a memory entry', async () => {
    const memoryEntry = { type: 'episodic', content: 'Test memory' };
    const result = await memoryService.storeMemory(memoryEntry);

    expect(result).to.have.property('id');
    expect(result.type).to.equal('episodic');
    expect(result.content).to.equal('Test memory');
  });

  it('should retrieve a memory entry by ID', async () => {
    const memoryEntry = { type: 'episodic', content: 'Test memory' };
    const storedEntry = await memoryService.storeMemory(memoryEntry);
    const retrievedEntry = await memoryService.getMemoryById(storedEntry.id);

    expect(retrievedEntry).to.deep.equal(storedEntry);
  });

  it('should throw an error for invalid memory type', async () => {
    const invalidMemoryEntry = { type: 'invalid', content: 'Test memory' };

    try {
      await memoryService.storeMemory(invalidMemoryEntry);
    } catch (error) {
      expect(error.message).to.equal('Invalid memory type');
    }
  });
});

describe('MemoryService - Additional Tests', () => {
  let memoryService;

  beforeEach(() => {
    memoryService = new MemoryService();
  });

  it('should throw an error when storing invalid memory', async () => {
    const invalidMemory = { type: 'unknown', content: 'Invalid memory' };
    await expect(memoryService.storeMemory(invalidMemory)).to.be.rejectedWith('Invalid memory type');
  });

  it('should retrieve all stored memories', async () => {
    const memory1 = await memoryService.storeMemory({ type: 'episodic', content: 'Memory 1' });
    const memory2 = await memoryService.storeMemory({ type: 'semantic', content: 'Memory 2' });

    const allMemories = await memoryService.getAllMemories();
    expect(allMemories).to.have.lengthOf(2);
    expect(allMemories).to.deep.include(memory1);
    expect(allMemories).to.deep.include(memory2);
  });

  it('should handle empty memory retrieval', async () => {
    const allMemories = await memoryService.getAllMemories();
    expect(allMemories).to.be.an('array').that.is.empty;
  });

  it('should throw an error when storing memory with empty content', async () => {
    const invalidMemory = { type: 'episodic', content: '' };
    await expect(memoryService.storeMemory(invalidMemory)).to.be.rejectedWith('Content cannot be empty');
  });
});
