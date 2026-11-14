import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const destination = join('build', 'Data', 'Magelight', 'LivingPast');
const manifest = JSON.parse(await readFile(join('mod', 'manifest.json'), 'utf8'));
if (manifest.modId !== 'LivingPast' || manifest.views?.spike?.path !== 'views/spike/index.html') {
  throw new Error('Unexpected Magelight manifest contract.');
}
await mkdir(destination, { recursive: true });
await copyFile(join('mod', 'manifest.json'), join(destination, 'manifest.json'));
console.log(`Staged UI prototype at ${destination}`);
