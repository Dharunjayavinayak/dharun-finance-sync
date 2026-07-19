/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { BankData, InvestmentData } from "../types";

interface DashboardStatsProps {
  expenses: BankData;
  investments: InvestmentData;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  expenses,
  investments,
}) => {
  // 1. Get the current actual balance of each bank from the latest entry
  const getBankBalance = (transactions: any[]) => {
    if (!transactions || transactions.length === 0) return 0;
    
    // The transactions array is already in historical sheet order (oldest first).
    // The LAST element has the most up-to-date final balance column statement!
    const latestTx = transactions[transactions.length - 1];
    return latestTx.balance !== undefined ? latestTx.balance : 0;
  };

  const hdfcBal = getBankBalance(expenses.HDFC);
  const iobBal = getBankBalance(expenses.IOB);
  const canaraBal = getBankBalance(expenses.Canara);
  const totalBankBalance = hdfcBal + iobBal + canaraBal;

  // 2. Calculate investment values strictly matching your Excel 'Amount' layout
  let stocksCost = 0;
  investments.Stocks.forEach((st) => {
    // Aggregates Qty * Price directly
    stocksCost += (st.qty || 0) * (st.price || 0);
  });

  let sipCost = 0;
  investments.SIP.forEach((sip) => {
    // Aggregates standard amount column
    sipCost += sip.amount || 0;
  });

  let metalsCost = 0;
  investments.GoldSilver.forEach((gs) => {
    // If your sheet provides the pre-computed amount column, use it, otherwise fall back to Qty * Price
    metalsCost += gs.amount || ((gs.qty || 0) * (gs.price || 0));
  });

  const totalInvestedCost = stocksCost + sipCost + metalsCost;

  // 3. Aggregate Net Worth
  const totalNetWorth = totalBankBalance + totalInvestedCost;

  // Format currency in Indian Rupees style
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-7xl mx-auto" id="dashboard-stats-grid">
      {/* Total Bank Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow transition-all relative overflow-hidden group"
        id="bank-balance-card"
      >
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-sans">
            Total Bank Balance
          </p>
          <h2 className="text-3xl font-bold font-display tracking-tight text-slate-800 mt-2">
            {formatCurrency(totalBankBalance)}
          </h2>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[11px] text-slate-500 font-mono">
          <span>HDFC: {formatCurrency(hdfcBal)}</span>
          <span>IOB: {formatCurrency(iobBal)}</span>
          <span>Canara: {formatCurrency(canaraBal)}</span>
        </div>
      </motion.div>

      {/* Total Invested Value Card (Cleaned to show exact cost from sheet) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow transition-all relative"
        id="investment-value-card"
      >
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-sans">
            Total Invested Value
          </p>
          <h2 className="text-3xl font-bold font-display tracking-tight text-emerald-600 mt-2">
            {formatCurrency(totalInvestedCost)}
          </h2>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500 font-mono">
          <span>Portfolio Assets</span>
          <span className="font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700支">
            Synced
          </span>
        </div>
      </motion.div>

      {/* Aggregate Net Worth Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="bg-indigo-900 p-5 rounded-xl shadow-md flex flex-col justify-between hover:shadow-lg transition-all text-white relative"
        id="net-worth-card"
      >
        <div>
          <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-widest font-sans">
            Aggregate Net Worth
          </p>
          <h2 className="text-3xl font-bold font-display tracking-tight text-white mt-2">
            {formatCurrency(totalNetWorth)}
          </h2>
        </div>
        <div className="mt-4 pt-3 border-t border-indigo-800/60 flex justify-between text-[11px] text-indigo-200 font-medium">
          <span>Liquidity + Wealth assets</span>
          <span className="text-amber-300 font-mono font-semibold">Stable Growth</span>
        </div>
      </motion.div>
    </div>
  );
};
