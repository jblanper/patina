import { Coin, CoinImage, NewCoin, NewCoinImage, CoinWithPrimaryImage } from '../common/types';

export interface IElectronAPI {
  ping: () => Promise<string>;
  
  // Database API
  getCoins: () => Promise<CoinWithPrimaryImage[]>;
  getCoinById: (id: number) => Promise<{ coin: Coin; images: CoinImage[] } | null>;
  addCoin: (coin: NewCoin) => Promise<number>;
  updateCoin: (id: number, coin: Partial<NewCoin>) => Promise<boolean>;
  deleteCoin: (id: number) => Promise<boolean>;
  addImage: (image: NewCoinImage) => Promise<number>;
  getImagesByCoinId: (coinId: number) => Promise<CoinImage[]>;
  deleteImage: (id: number) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
