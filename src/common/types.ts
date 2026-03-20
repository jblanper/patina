export interface Coin {
  id: number;
  title: string;
  issuer?: string;
  denomination?: string;
  year_display?: string;
  year_numeric?: number;
  era: string;
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

export interface CoinWithPrimaryImage extends Coin {
  primary_image_path?: string;
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

export interface Vocabulary {
  id: number;
  field: string;
  value: string;
  locale: string;
  is_builtin: boolean;
  usage_count: number;
  created_at: string;
}

export type VocabularyInput = Omit<Vocabulary, 'id' | 'created_at'>;
