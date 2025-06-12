export interface Challenge {
  id?: number;
  p2pkh_address: string;
  public_key: string;
  tags: string[];
}

export interface ChallengeData {
  public_key: string;
  tags: string[];
}
