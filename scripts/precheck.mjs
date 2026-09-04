import {existsSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const REQUIRED_FILES = [
  'contracts/protocol_errata_reserve.py',
  'tests/direct/test_protocol_errata_reserve.py',
  'tests/direct/test_contract_static.py',
  'tests/deployment/receipt.test.mjs',
  'frontend/package.json',
  'frontend/src/App.tsx',
  'docs/README.md',
  'docs/evidence-authority-spike.md',
];

export function runPrecheck({root = process.cwd(), print = true} = {}) {
  const absRoot = resolve(root);
  const blockers = [];
  for (const file of REQUIRED_FILES) {
    if (!existsSync(join(absRoot, file))) {
      blockers.push(`missing ${file}`);
    }
  }

  const result = {
    project: 'protocol-errata-reserve',
    category: 'projects',
    blockers,
    text: '',
  };
  result.text = [
    'Project protocol-errata-reserve -Category projects',
    blockers.length ? `${blockers.length} BLOCKER` : 'NO BLOCKER',
    ...blockers.map((item) => `BLOCKER: ${item}`),
  ].join('\n');
  if (print) console.log(result.text);
  return result;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = runPrecheck();
  process.exitCode = result.blockers.length ? 1 : 0;
}
