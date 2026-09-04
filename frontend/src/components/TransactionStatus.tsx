import {useEffect, useState} from 'react';
import {transactions, type TransactionState} from '../services/transactions';

export function TransactionStatus() {
  const [tx, setTx] = useState<TransactionState>(transactions.state);
  useEffect(() => transactions.subscribe(setTx), []);
  return <aside role="status" aria-atomic="true" className={`tx tx-${tx.phase}`}>{tx.message}{tx.hash ? <span>{tx.hash}</span> : null}</aside>;
}
