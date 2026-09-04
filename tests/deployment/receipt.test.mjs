import assert from 'node:assert/strict';
import {test} from 'node:test';

import {isExecutionSuccess, parseReceipt, safeReceiptSummary} from '../../scripts/lib/receipt.mjs';

test('parses normalized successful execution receipt', () => {
  const receipt = parseReceipt({
    hash: '0xabc',
    status: 'FINALIZED',
    execution: {status: 'SUCCESS'},
    consensus: 'MAJORITY_AGREE',
  });
  assert.equal(receipt.hash, '0xabc');
  assert.equal(receipt.finality, 'FINALIZED');
  assert.equal(receipt.executionStatus, 'SUCCESS');
  assert.equal(isExecutionSuccess(receipt), true);
});

test('raw Studio error receipt is not converted into success', () => {
  const receipt = parseReceipt({
    transaction_hash: '0xdef',
    result: {status: 'ERROR', error: {message: 'execution reverted'}},
    status: 'FINALIZED',
  });
  assert.equal(receipt.executionStatus, 'ERROR');
  assert.equal(isExecutionSuccess(receipt), false);
});

test('missing execution status remains unknown', () => {
  const receipt = parseReceipt({hash: '0x123', status: 'ACCEPTED'});
  assert.equal(receipt.finality, 'ACCEPTED');
  assert.equal(receipt.executionStatus, 'UNKNOWN');
  assert.equal(isExecutionSuccess(receipt), false);
});

test('safe summary allowlists fields', () => {
  const summary = safeReceiptSummary({
    hash: '0xabc',
    status: 'FINALIZED',
    execution: {status: 'SUCCESS'},
    to: '0xContract',
    node_config: {secret: 'do-not-log'},
  });
  assert.deepEqual(summary, {
    hash: '0xabc',
    finality: 'FINALIZED',
    executionStatus: 'SUCCESS',
    consensus: 'UNKNOWN',
    contractAddress: '0xContract',
  });
});

test('parses deploy contract address from Studio to field', () => {
  const receipt = parseReceipt({
    transaction_hash: '0xdeploy',
    status: 'FINALIZED',
    txExecutionResultName: 'FINISHED_WITH_RETURN',
    to: '0xDeployedContract',
  });
  assert.equal(receipt.contractAddress, '0xDeployedContract');
  assert.equal(isExecutionSuccess(receipt), true);
});
