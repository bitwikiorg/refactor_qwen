// tests/file-system.mjs
import FileSystemService from '../app/infrastructure/file-system.mjs';

describe('FileSystemService', () => {
  const fileSystem = new FileSystemService();

  it('should read a file', async () => {
    const content = await fileSystem.readFile('test.json');
    expect(content).toBe('Test content');
  });

  it('should write a file', async () => {
    await fileSystem.writeFile('test.json', 'Test content');
    const content = await fileSystem.readFile('test.json');
    expect(content).toBe('Test content');
  });
});
});