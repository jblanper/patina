export interface Coin {
  id: number;
  title: string;
  issuer?: string;
  denomination?: string;
  year_display?: string;
  year_numeric?: number;
  era: 'Ancient' | 'Medieval' | 'Modern';
  mint?: string;
  metal?: string;
  fineness?: string;
  weight?: number;
  diameter?: number;
  die_axis?: string;
  obverse_legend?: string;
  obverse_desc?: string;
  reverse_legend?: string;
  reverse_desc?: string;
  edge_desc?: string;
  catalog_ref?: string;
  rarity?: string;
  grade?: string;
  provenance?: string;
  story?: string;
  purchase_price?: number;
  purchase_date?: string;
  purchase_source?: string;
  created_at: string;
}

export interface CoinImage {
  id: number;
  coin_id: number;
  path: string;
  label?: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export type NewCoin = Omit<Coin, 'id' | 'created_at'>;
export type NewCoinImage = Omit<CoinImage, 'id' | 'created_at'>;
