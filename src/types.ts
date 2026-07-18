/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  date: string;
  category: string;
  reason: string;
  credit: number;
  cost: number;
  balance?: number; // Running balance computed dynamically
}

export interface BankData {
  HDFC: Transaction[];
  IOB: Transaction[];
  Canara: Transaction[];
}

export type BankName = "HDFC" | "IOB" | "Canara";

export interface StockAsset {
  id: string;
  date: string;
  name: string;
  qty: number;
  price: number; // Purchase / Avg Price
  currentPrice: number; // Current Market Price
}

export interface SipAsset {
  id: string;
  date: string;
  name: string; // Fund Name
  amount: number; // Flat Invested Amount
  currentValue: number; // Current Valuation
}

export interface GoldSilverAsset {
  id: string;
  date: string;
  name: string; // "Gold 24K", "Silver 999", etc.
  qty: number; // in grams
  price: number; // Purchase price per gram
  currentPrice: number; // Current market price per gram
}

export interface InvestmentData {
  Stocks: StockAsset[];
  SIP: SipAsset[];
  GoldSilver: GoldSilverAsset[];
}

export type AssetClass = "Stocks" | "SIP" | "GoldSilver";

export interface SyncState {
  expenses: BankData;
  investments: InvestmentData;
  globalSyncTime: string | null;
  bankSyncTimes: {
    HDFC: string | null;
    IOB: string | null;
    Canara: string | null;
  };
  assetSyncTimes: {
    Stocks: string | null;
    SIP: string | null;
    GoldSilver: string | null;
  };
}
