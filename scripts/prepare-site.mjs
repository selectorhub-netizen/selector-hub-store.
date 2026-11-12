import { copyFile, mkdir } from 'node:fs/promises';

const outputDirectory = new URL('../dist/', import.meta.url);
await mkdir(outputDirectory, { recursive: true });
await copyFile(
  new URL('../index.html', import.meta.url),
  new URL('index.html', outputDirectory),
);
