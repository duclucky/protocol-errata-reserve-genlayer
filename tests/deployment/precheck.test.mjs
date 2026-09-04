import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';

import {runPrecheck} from '../../scripts/precheck.mjs';

test('precheck reports project/category and no blocker when required files exist', () => {
  const root = join(tmpdir(), `protocol-errata-precheck-${process.pid}`);
  for (const file of [
    'contracts/protocol_errata_reserve.py',
    'tests/direct/test_protocol_errata_reserve.py',
    'tests/direct/test_contract_static.py',
    'tests/deployment/receipt.test.mjs',
    'frontend/package.json',
    'frontend/src/App.tsx',
    'docs/README.md',
    'docs/evidence-authority-spike.md',
  ]) {
    mkdirSync(join(root, file, '..'), {recursive: true});
    writeFileSync(join(root, file), 'ok\n');
  }

  const result = runPrecheck({root, print: false});
  assert.equal(result.project, 'protocol-errata-reserve');
  assert.equal(result.category, 'projects');
  assert.equal(result.blockers.length, 0);
  assert.match(result.text, /Project protocol-errata-reserve -Category projects/);
  assert.match(result.text, /NO BLOCKER/);
});
