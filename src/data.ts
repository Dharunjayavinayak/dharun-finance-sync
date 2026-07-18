/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SyncState } from "./types";

export const DEFAULT_SYNC_STATE: SyncState = {
  expenses: {
    HDFC: [
      {
        id: "hdfc-1",
        date: "2026-07-10",
        category: "Salary",
        reason: "Monthly Paycheck - Google AI Studio",
        credit: 120000,
        cost: 0,
      },
      {
        id: "hdfc-2",
        date: "2026-07-12",
        category: "Food & Dining",
        reason: "Team dinner at Social, Indiranagar",
        credit: 0,
        cost: 4500,
      },
      {
        id: "hdfc-3",
        date: "2026-07-14",
        category: "Housing",
        reason: "Apartment Rent Payment",
        credit: 0,
        cost: 35000,
      },
      {
        id: "hdfc-4",
        date: "2026-07-15",
        category: "Utilities",
        reason: "BESCOM Electricity Bill",
        credit: 0,
        cost: 2800,
      },
    ],
    IOB: [
      {
        id: "iob-1",
        date: "2026-07-08",
        category: "Investments",
        reason: "TCS Quarterly Dividend",
        credit: 3500,
        cost: 0,
      },
      {
        id: "iob-2",
        date: "2026-07-11",
        category: "Gadgets",
        reason: "Sony WH-1000XM5 Headphones",
        credit: 0,
        cost: 25500,
      },
      {
        id: "iob-3",
        date: "2026-07-16",
        category: "Groceries",
        reason: "Weekly food restock on Blinkit",
        credit: 0,
        cost: 1800,
      },
    ],
    Canara: [
      {
        id: "canara-1",
        date: "2026-07-05",
        category: "Transfer",
        reason: "Self-transfer from HDFC Bank",
        credit: 50000,
        cost: 0,
      },
      {
        id: "canara-2",
        date: "2026-07-14",
        category: "Travel",
        reason: "Uber rides - Weekend outings",
        credit: 0,
        cost: 1200,
      },
      {
        id: "canara-3",
        date: "2026-07-17",
        category: "Subscriptions",
        reason: "Google One Cloud Storage 2TB Plan",
        credit: 0,
        cost: 2500,
      },
    ],
  },
  investments: {
    Stocks: [
      {
        id: "stock-1",
        date: "2026-05-12",
        name: "RELIANCE",
        qty: 50,
        price: 2450.0,
        currentPrice: 2840.5,
      },
      {
        id: "stock-2",
        date: "2026-06-04",
        name: "TCS",
        qty: 15,
        price: 3200.0,
        currentPrice: 3850.0,
      },
      {
        id: "stock-3",
        date: "2026-06-20",
        name: "INFY",
        qty: 30,
        price: 1420.0,
        currentPrice: 1560.2,
      },
    ],
    SIP: [
      {
        id: "sip-1",
        date: "2026-07-01",
        name: "HDFC Index Nifty 50 Direct Plan",
        amount: 15000,
        currentValue: 17200,
      },
      {
        id: "sip-2",
        date: "2026-07-05",
        name: "Parag Parikh Flexi Cap Fund",
        amount: 20000,
        currentValue: 24500,
      },
      {
        id: "sip-3",
        date: "2026-07-10",
        name: "SBI Small Cap Direct Growth",
        amount: 10000,
        currentValue: 11800,
      },
    ],
    GoldSilver: [
      {
        id: "gold-1",
        date: "2026-04-15",
        name: "Gold 24K (Sovereign)",
        qty: 10,
        price: 6200.0,
        currentPrice: 7250.0,
      },
      {
        id: "silver-1",
        date: "2026-05-20",
        name: "Silver 999 (Bullion)",
        qty: 500,
        price: 72.0,
        currentPrice: 88.5,
      },
    ],
  },
  globalSyncTime: "2026-07-18 08:14:16",
  bankSyncTimes: {
    HDFC: "2026-07-18 08:14:16",
    IOB: "2026-07-18 08:14:16",
    Canara: "2026-07-18 08:14:16",
  },
  assetSyncTimes: {
    Stocks: "2026-07-18 08:14:16",
    SIP: "2026-07-18 08:14:16",
    GoldSilver: "2026-07-18 08:14:16",
  },
};
