export type Reserve = {
  reserve_id: string;
  sponsor: string;
  implementer: string;
  rfc_id: string;
  section: string;
  claim_text: string;
  claim_version: string;
  status: string;
  reserve_balance_gen: string;
  material_credit_gen: string;
  expires_at: number;
  review_count: number;
};

export type Review = {
  review_id: string;
  reserve_id: string;
  errata_id: string;
  errata_url: string;
  status: string;
  verdict: string;
  rationale: string;
  settlement_credit_gen: string;
};

export type Accounting = {
  total_received_gen: string;
  reserve_balances_gen: string;
  credits_pending_gen: string;
  total_withdrawn_gen: string;
  accounted_total_gen: string;
  balanced: boolean;
};

export type TxPhase = 'idle' | 'wallet' | 'submitted' | 'pending' | 'finalized' | 'failed' | 'unknown' | 'rejected';
