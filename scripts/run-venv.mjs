import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const [tool, ...args] = process.argv.slice(2);
if (!tool) {
  console.error('Usage: node scripts/run-venv.mjs <tool> [...args]');
  process.exit(2);
}

const isWindows = process.platform === 'win32';
const names = tool === 'python'
  ? (isWindows ? ['python.exe', 'python'] : ['python'])
  : (isWindows ? [`${tool}.exe`, tool] : [tool]);
const dirs = isWindows ? ['Scripts', 'bin'] : ['bin', 'Scripts'];
const executable = dirs
  .flatMap((dir) => names.map((name) => join('.venv', dir, name)))
  .find((candidate) => existsSync(candidate));

if (!executable) {
  console.error(`Could not find ${tool} in .venv.`);
  process.exit(127);
}

const result = spawnSync(executable, args, {
  stdio: 'inherit',
  shell: false,
  env: {...process.env, PYTHONUTF8: '1'},
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
