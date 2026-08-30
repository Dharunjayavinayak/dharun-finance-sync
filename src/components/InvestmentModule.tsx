import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, Plus, Calendar, FileText, IndianRupee, Layers } from "lucide-react";
import { InvestmentData } from "../types";

type InvestmentType = "Stocks" | "SIP" | "GoldSilver";

interface InvestmentModuleProps {
  investments: InvestmentData;
  syncTime: string | null;
  onAddAsset: (type: InvestmentType, asset: any) => void;
  onDeleteAsset: (type: InvestmentType, asset: any) => void;
}

/**
 * Normalizes any date to strict DD-MM-YYYY format
 */
function toStandardDisplayDate(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const clean = dateStr.trim().split("T")[0];
  const parts = clean.split(/[-/]/);

  if (parts.length === 3) {
    // If format is DD-MM-YYYY
    if (parts[2].length === 4) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      return `${day}-${month}-${year}`;
    }
    // If format is YYYY-MM-DD
    if (parts[0].length === 4) {
      const year = parts[0];
      const month = parts[1].padStart(2, "0");
      const day = parts[2].padStart(2, "0");
      return `${day}-${month}-${year}`;
    }
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return dateStr;
}

/**
 * Parses date for chronological sorting
 */
function getTimestamp(dateStr?: string): number {
  if (!dateStr) return 0;
  const clean = dateStr.trim().split("T")[0];
  const parts = clean.split(/[-/]/);

  if (parts.length === 3) {
    if (parts[2].length === 4) {
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
    }
    if (parts[0].length === 4) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
    }
  }

  return new Date(dateStr).getTime() || 0;
}

export const InvestmentModule: React.FC<InvestmentModuleProps> = ({
  investments,
  syncTime,
  onAddAsset,
  onDeleteAsset,
}) => {
  const [selectedTab, setSelectedTab] = useState<InvestmentType>("Stocks");
  const [viewLimit, setViewLimit] = useState<5 | 20 | "all">(5);

  const [dateInput, setDateInput] = useState(() => new Date().toISOString().split("T")[0]);
  const [group, setGroup] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState("");

  const tabs: InvestmentType[] = ["Stocks", "SIP", "GoldSilver"];
  const currentItems: any[] = investments[selectedTab] || [];

  const dynamicGroups = Array.from(
    new Set(currentItems.map((item) => item.group).filter(Boolean))
  );
  const dynamicNames = Array.from(
    new Set(currentItems.map((item) => item.name).filter(Boolean))
  );

  // Standardize dates on display and sort chronologically
  const chronologicalReversed = [...currentItems]
    .map((item) => ({
      ...item,
      date: toStandardDisplayDate(item.date),
    }))
    .sort((a, b) => getTimestamp(b.date) - getTimestamp(a.date));

  const displayItems =
    viewLimit === "all" ? chronologicalReversed : chronologicalReversed.slice(0, viewLimit);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const trimmedGroup = group.trim();
    const trimmedName = name.trim();

    if (!trimmedGroup) {
      setFormError("Sector / Group is required");
      return;
    }
    if (!trimmedName) {
      setFormError("Asset Name is required");
      return;
    }

    // Convert date input directly to DD-MM-YYYY
    const formattedDate = toStandardDisplayDate(dateInput);

    if (selectedTab === "SIP") {
      const amtVal = parseFloat(amount) || 0;
      if (amtVal <= 0) {
        setFormError("Amount must be greater than 0");
        return;
      }
      onAddAsset("SIP", {
        date: formattedDate,
        group: trimmedGroup,
        name: trimmedName,
        amount: amtVal,
        price: amtVal,
        qty: 1,
        currentPrice: amtVal,
      });
    } else {
      const priceVal = parseFloat(price) || 0;
      const qtyVal = parseFloat(qty) || 0;
      if (priceVal <= 0 || qtyVal <= 0) {
        setFormError("Price and Quantity must be greater than 0");
        return;
      }
      onAddAsset(selectedTab, {
        date: formattedDate,
        group: trimmedGroup,
        name: trimmedName,
        price: priceVal,
        qty: qtyVal,
        amount: priceVal * qtyVal,
        currentPrice: priceVal,
      });
    }

    setGroup("");
    setName("");
    setPrice("");
    setQty("");
    setAmount("");
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-7xl mx-auto" id="investment-module">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
            Investment Portfolio
          </span>
          <h2 className="text-base font-bold text-slate-800 mt-2.5">
            [{selectedTab === "GoldSilver" ? "Gold & Silver" : selectedTab}] Portfolio:{" "}
            <span className="text-slate-500 font-mono text-xs font-medium">
              {syncTime || "Not synced (Local state)"}
            </span>
          </h2>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedTab === tab
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              {tab === "GoldSilver" ? "Gold & Silver" : tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Ledger Table */}
        <div className="lg:col-span-8 order-2 lg:order-1 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Ledger ({displayItems.length} shown of {chronologicalReversed.length})
            </h3>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-[11px] font-semibold">
              <button
                onClick={() => setViewLimit(5)}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${
                  viewLimit === 5 ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600"
                }`}
              >
                Last 5
              </button>
              <button
                onClick={() => setViewLimit(20)}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${
                  viewLimit === 20 ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600"
                }`}
              >
                Last 20
              </button>
              <button
                onClick={() => setViewLimit("all")}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${
                  viewLimit === "all" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600"
                }`}
              >
                All Time
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/20 flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] font-mono">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Group</th>
                  <th className="py-3 px-4">Asset Name</th>
                  {selectedTab !== "SIP" && <th className="py-3 px-4 text-right">Price</th>}
                  {selectedTab !== "SIP" && <th className="py-3 px-4 text-right">Qty</th>}
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {displayItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 text-xs font-medium">
                        No asset data found.
                      </td>
                    </tr>
                  ) : (
                    displayItems.map((item) => (
                      <motion.tr
                        key={item.id}
                        layout
                        className="bg-white border-b border-slate-100 hover:bg-slate-50/50 text-xs text-slate-600"
                      >
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{item.date}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/50">
                            {item.group || "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                        {selectedTab !== "SIP" && (
                          <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.price)}</td>
                        )}
                        {selectedTab !== "SIP" && (
                          <td className="py-3 px-4 text-right font-mono">{item.qty}</td>
                        )}
                        <td className="py-3 px-4 text-right font-mono text-slate-900 font-semibold">
                          {formatCurrency(
                            selectedTab === "SIP" ? item.amount : Number(item.price) * Number(item.qty)
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => onDeleteAsset(selectedTab, item)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Entry Form */}
        <div className="lg:col-span-4 order-1 lg:order-2">
          <div className="bg-slate-50/40 rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 pb-3 border-b border-slate-200/60">
              Add Asset Entry
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Asset Class
                </label>
                <select
                  value={selectedTab}
                  onChange={(e) => setSelectedTab(e.target.value as InvestmentType)}
                  className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="Stocks">Stocks</option>
                  <option value="SIP">SIP</option>
                  <option value="GoldSilver">Gold & Silver</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Acquisition Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs font-mono text-slate-800 focus:outline-none"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                    <Calendar size={14} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Sector / Group
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="inv-group-suggestions"
                    placeholder="e.g. Automobile, IT, FMGC, 24K Gold"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none"
                  />
                  <datalist id="inv-group-suggestions">
                    {dynamicGroups.map((grp) => (
                      <option key={grp} value={grp} />
                    ))}
                  </datalist>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                    <Layers size={14} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Asset Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="inv-name-suggestions"
                    placeholder="e.g. Tata Motors, Parag Parikh Flexi Cap, Gold Bar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none"
                  />
                  <datalist id="inv-name-suggestions">
                    {dynamicNames.map((nm) => (
                      <option key={nm} value={nm} />
                    ))}
                  </datalist>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                    <FileText size={14} />
                  </div>
                </div>
              </div>

              {selectedTab === "SIP" ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                    SIP Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs font-mono text-slate-800 focus:outline-none"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                      <IndianRupee size={14} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                      Buy Price
                    </label>
                    <input
                      type="number"
                      placeholder="Price"
                      step="any"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs font-mono text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                      Quantity
                    </label>
                    <input
                      type="number"
                      placeholder="Qty"
                      step="any"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs font-mono text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {formError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded">
                  {formError}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md text-xs transition-colors cursor-pointer flex items-center justify-center"
              >
                <Plus size={14} className="mr-1" /> Add Asset Record
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};