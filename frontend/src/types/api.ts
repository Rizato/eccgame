export interface Challenge {
  uuid: string;
  p2pkh_address: string;
  public_key: string;
  explorer_link: string;
  metadata: Metadata[];
  active: boolean;
  active_date: string | null;
  created_at: string;
}

export interface Metadata {
  id: number;
  name: string;
}

export interface Solution {
  uuid: string;
  public_key: string;
  signature: string;
  result: 'correct' | 'incorrect' | 'negated' | null;
  is_key_valid: boolean | null;
  is_signature_valid: boolean | null;
  validated_at: string | null;
  created_at: string;
}

export interface SolutionRequest {
  public_key: string;
  signature: string;
}

export interface SolutionResponse extends Solution {
  challenge: string; // UUID
}

export interface Save {
  public_key: string;
}

export interface SaveRequest {
  public_key: string;
}

export interface SaveResponse extends Save {
  uuid: string;
  challenge: string; // UUID
  created_at: string;
}
