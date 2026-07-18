/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, Plus, Calendar, Coins, TrendingUp, TrendingDown, Layers, HelpCircle } from "lucide-react";
import { InvestmentData, AssetClass, StockAsset, SipAsset, GoldSilverAsset } from "../types";

interface InvestmentModuleProps {
  investments: InvestmentData;
  syncTimes: {
    Stocks: string | null;
    SIP: string | null;
    GoldSilver: string | null;
  };
  onAddAsset: (assetClass: AssetClass, asset: any) => void;
  onDeleteAsset: (assetClass: AssetClass, asset: { date: string; name: string }) => void;
}

export const InvestmentModule: React.FC<InvestmentModuleProps> = ({
  investments,
  syncTimes,
  onAddAsset,
  onDeleteAsset,
}) => {
  const [selectedClass, setSelectedClass] = useState<AssetClass>("Stocks");
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [targetClass, setTargetClass] = useState<AssetClass>("Stocks");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [formError, setFormError] = useState("");

  const assetClasses: AssetClass[] = ["Stocks", "SIP", "GoldSilver"];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Asset name is required");
      return;
    }

    if (targetClass === "SIP") {
      const amtVal = parseFloat(amount);
      const curVal = parseFloat(currentValue);

      if (isNaN(amtVal) || amtVal <= 0) {
        setFormError("Amount must be a valid positive number");
        return;
      }
      if (isNaN(curVal) || curVal < 0) {
        setFormError("Current Value must be a valid positive number");
        return;
      }

      onAddAsset("SIP", {
        date,
        name: name.trim(),
        amount: amtVal,
        currentValue: curVal,
      });
    } else {
      // Stocks or GoldSilver
      const qtyVal = parseFloat(qty);
      const priceVal = parseFloat(price);
      const curPriceVal = parseFloat(currentPrice || price); // fallback to purchase price if blank

      if (isNaN(qtyVal) || qtyVal <= 0) {
        setFormError("Quantity must be a valid positive number");
        return;
      }
      if (isNaN(priceVal) || priceVal <= 0) {
        setFormError("Purchase Price must be a valid positive number");
        return;
      }
      if (isNaN(curPriceVal) || curPriceVal < 0) {
        setFormError("Current Price must be a valid positive number");
        return;
      }

      onAddAsset(targetClass, {
        date,
        name: name.toUpperCase().trim(),
        qty: qtyVal,
        price: priceVal,
        currentPrice: curPriceVal,
      });
    }

    // Reset Form
    setName("");
    setQty("");
    setPrice("");
    setCurrentPrice("");
    setAmount("");
    setCurrentValue("");
    setIsAdding(false);
    setSelectedClass(targetClass); // Switch tab to show added item
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-7xl mx-auto" id="investment-module">
      {/* Module Title & Tab Sync Time */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
            Investment Portfolio
          </span>
          <h2 className="text-base font-bold text-slate-800 mt-2.5" id="portfolio-sync-header">
            [{selectedClass}] Portfolio Updated:{" "}
            <span className="text-slate-500 font-mono text-xs font-medium">
              {syncTimes[selectedClass] || "Not synced (Local state)"}
            </span>
          </h2>
        </div>

        {/* Asset Class Toggle Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50" id="asset-tabs">
          {assetClasses.map((ac) => (
            <button
              key={ac}
              id={`tab-asset-${ac}`}
              onClick={() => setSelectedClass(ac)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedClass === ac
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              {ac === "GoldSilver" ? "Gold & Silver" : ac}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Table View (Takes 8 cols) */}
        <div className="lg:col-span-8 order-2 lg:order-1 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Asset Allocation Ledger ({investments[selectedClass]?.length || 0} entries)
            </h3>
            <button
              id="add-asset-btn-inline"
              onClick={() => {
                setIsAdding(!isAdding);
                setTargetClass(selectedClass);
              }}
              className="lg:hidden flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <Plus size={14} className="mr-1" />
              {isAdding ? "Close Form" : "Add Asset"}
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/20 flex-1">
            <table className="w-full text-left border-collapse" id="portfolio-table">
              {selectedClass === "Stocks" && (
                <>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] font-mono">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Stock Name</th>
                      <th className="py-3 px-4 text-right">Qty</th>
                      <th className="py-3 px-4 text-right">Avg Price</th>
                      <th className="py-3 px-4 text-right">Current Price</th>
                      <th className="py-3 px-4 text-right">Cost Value</th>
                      <th className="py-3 px-4 text-right">Current Value</th>
                      <th className="py-3 px-4 text-right">P&L</th>
                      <th className="py-3 px-4 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {(!investments.Stocks || investments.Stocks.length === 0) ? (
                        <tr>
                          <td colSpan={9} className="text-center py-12 text-slate-400 text-xs font-medium">
                            No stocks tracked yet. Add one to start organizing.
                          </td>
                        </tr>
                      ) : (
                        investments.Stocks.map((row) => {
                          const cost = row.qty * row.price;
                          const currentVal = row.qty * row.currentPrice;
                          const pnl = currentVal - cost;
                          const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
                          return (
                            <motion.tr
                              key={row.id}
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="bg-white border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs text-slate-600"
                            >
                              <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                                {row.date}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900 font-mono tracking-wide">
                                {row.name}
                              </td>
                              <td className="py-3 px-4 text-right font-mono">{row.qty}</td>
                              <td className="py-3 px-4 text-right font-mono text-slate-500">
                                {formatCurrency(row.price)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-600">
                                {formatCurrency(row.currentPrice)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-500">
                                {formatCurrency(cost)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                                {formatCurrency(currentVal)}
                              </td>
                              <td className={`py-3 px-4 text-right font-mono font-semibold ${pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                <span className="flex items-center justify-end">
                                  {pnl >= 0 ? <TrendingUp size={13} className="mr-1" /> : <TrendingDown size={13} className="mr-1" />}
                                  {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)} ({pnlPercent.toFixed(1)}%)
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => onDeleteAsset("Stocks", row)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                  title="Delete stock"
                                  id={`delete-stock-${row.id}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </motion.tr>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </tbody>
                </>
              )}

              {selectedClass === "SIP" && (
                <>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] font-mono">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Fund Name</th>
                      <th className="py-3 px-4 text-right">Flat Cost (Invested)</th>
                      <th className="py-3 px-4 text-right">Current Value</th>
                      <th className="py-3 px-4 text-right">P&L</th>
                      <th className="py-3 px-4 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {(!investments.SIP || investments.SIP.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400 text-xs font-medium">
                            No Systematic Investment Plans tracked yet.
                          </td>
                        </tr>
                      ) : (
                        investments.SIP.map((row) => {
                          const pnl = row.currentValue - row.amount;
                          const pnlPercent = row.amount > 0 ? (pnl / row.amount) * 100 : 0;
                          return (
                            <motion.tr
                              key={row.id}
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="bg-white border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs text-slate-600"
                            >
                              <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                                {row.date}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-800">
                                {row.name}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-500">
                                {formatCurrency(row.amount)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-900 font-medium">
                                {formatCurrency(row.currentValue)}
                              </td>
                              <td className={`py-3 px-4 text-right font-mono font-semibold ${pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                <span className="flex items-center justify-end">
                                  {pnl >= 0 ? <TrendingUp size={13} className="mr-1" /> : <TrendingDown size={13} className="mr-1" />}
                                  {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)} ({pnlPercent.toFixed(1)}%)
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => onDeleteAsset("SIP", row)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                  title="Delete SIP"
                                  id={`delete-sip-${row.id}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </motion.tr>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </tbody>
                </>
              )}

              {selectedClass === "GoldSilver" && (
                <>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] font-mono">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Asset Name</th>
                      <th className="py-3 px-4 text-right">Qty (g)</th>
                      <th className="py-3 px-4 text-right">Buy Price / g</th>
                      <th className="py-3 px-4 text-right">Current Price / g</th>
                      <th className="py-3 px-4 text-right">Cost Value</th>
                      <th className="py-3 px-4 text-right">Current Value</th>
                      <th className="py-3 px-4 text-right">P&L</th>
                      <th className="py-3 px-4 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {(!investments.GoldSilver || investments.GoldSilver.length === 0) ? (
                        <tr>
                          <td colSpan={9} className="text-center py-12 text-slate-400 text-xs font-medium">
                            No physical metals tracked yet.
                          </td>
                        </tr>
                      ) : (
                        investments.GoldSilver.map((row) => {
                          const cost = row.qty * row.price;
                          const currentVal = row.qty * row.currentPrice;
                          const pnl = currentVal - cost;
                          const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
                          return (
                            <motion.tr
                              key={row.id}
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="bg-white border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs text-slate-600"
                            >
                              <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                                {row.date}
                              </td>
                              <td className="py-3 px-4 font-bold text-amber-700 font-mono tracking-wide">
                                {row.name}
                              </td>
                              <td className="py-3 px-4 text-right font-mono">{row.qty}g</td>
                              <td className="py-3 px-4 text-right font-mono text-slate-500">
                                {formatCurrency(row.price)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-600">
                                {formatCurrency(row.currentPrice)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-500">
                                {formatCurrency(cost)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                                {formatCurrency(currentVal)}
                              </td>
                              <td className={`py-3 px-4 text-right font-mono font-semibold ${pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                <span className="flex items-center justify-end">
                                  {pnl >= 0 ? <TrendingUp size={13} className="mr-1" /> : <TrendingDown size={13} className="mr-1" />}
                                  {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)} ({pnlPercent.toFixed(1)}%)
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => onDeleteAsset("GoldSilver", row)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                  title="Delete physical metal"
                                  id={`delete-metal-${row.id}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </motion.tr>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </tbody>
                </>
              )}
            </table>
          </div>
        </div>

        {/* Dynamic Investment Entry Form */}
        <div className={`lg:col-span-4 order-1 lg:order-2 ${isAdding ? "block" : "hidden lg:block"}`}>
          <div className="bg-slate-50/40 rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center space-x-2 text-slate-800 mb-4 pb-3 border-b border-slate-200/60">
              <Plus size={16} className="text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Add Asset Entry
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4" id="asset-add-form">
              {/* Asset Class Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Asset Class
                </label>
                <div className="relative">
                  <select
                    id="form-asset-class-select"
                    value={targetClass}
                    onChange={(e) => {
                      setTargetClass(e.target.value as AssetClass);
                      setFormError("");
                    }}
                    className="w-full bg-white border border-slate-200 rounded-md py-1.5 pl-2.5 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-slate-800 appearance-none"
                  >
                    <option value="Stocks">Stocks</option>
                    <option value="SIP">SIP (Mutual Funds)</option>
                    <option value="GoldSilver">Gold & Silver</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                    <Layers size={14} />
                  </div>
                </div>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Acquisition Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="form-asset-date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-md py-1.5 pl-2.5 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-slate-800"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                    <Calendar size={14} />
                  </div>
                </div>
              </div>

              {/* Asset Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  {targetClass === "SIP" ? "Mutual Fund Name" : targetClass === "Stocks" ? "Stock Symbol" : "Metal Name"}
                </label>
                <input
                  type="text"
                  id="form-asset-name"
                  placeholder={
                    targetClass === "SIP"
                      ? "e.g. Parag Parikh Flexi Cap"
                      : targetClass === "Stocks"
                      ? "e.g. RELIANCE, TCS"
                      : "e.g. Gold 24K, Silver 999"
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 font-sans"
                />
              </div>

              {/* Layout variation: Stocks & GoldSilver (Qty/Price tracking) vs SIP (flat Amount/Valuation tracking) */}
              {targetClass !== "SIP" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                        {targetClass === "GoldSilver" ? "Qty (grams)" : "Quantity"}
                      </label>
                      <input
                        type="number"
                        id="form-asset-qty"
                        placeholder="e.g. 10"
                        min="0.001"
                        step="any"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                        Avg Buy Price
                      </label>
                      <input
                        type="number"
                        id="form-asset-price"
                        placeholder="Per unit"
                        min="0.01"
                        step="any"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono flex items-center justify-between">
                      <span>Current Price</span>
                      <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                    </label>
                    <input
                      type="number"
                      id="form-asset-curprice"
                      placeholder="Blank to match Buy Price"
                      min="0"
                      step="any"
                      value={currentPrice}
                      onChange={(e) => setCurrentPrice(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-slate-800"
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                      Invested Cost
                    </label>
                    <input
                      type="number"
                      id="form-asset-amount"
                      placeholder="Total amount"
                      min="1"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                      Current Value
                    </label>
                    <input
                      type="number"
                      id="form-asset-curval"
                      placeholder="Valuation"
                      min="0"
                      step="any"
                      value={currentValue}
                      onChange={(e) => setCurrentValue(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-slate-800"
                    />
                  </div>
                </div>
              )}

              {formError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded flex items-start">
                  <span className="font-semibold mr-1">Error:</span> {formError}
                </div>
              )}

              <button
                type="submit"
                id="submit-asset-btn"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md text-xs transition-colors cursor-pointer flex items-center justify-center"
              >
                <Plus size={14} className="mr-1" /> Add {targetClass === "GoldSilver" ? "Metal" : targetClass} Asset
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
