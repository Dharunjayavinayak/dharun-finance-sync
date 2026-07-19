import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, Plus, Calendar, Tag, FileText, IndianRupee,Layers } from "lucide-react";
import { InvestmentData, InvestmentType, InvestmentItem } from "../types";

interface InvestmentModuleProps {
  investments: InvestmentData;
  syncTime: string | null;
  onAddAsset: (type: InvestmentType, asset: Omit<InvestmentItem, "id">) => void;
  onDeleteAsset: (type: InvestmentType, asset: InvestmentItem) => void;
}

export const InvestmentModule: React.FC<InvestmentModuleProps> = ({
  investments,
  syncTime,
  onAddAsset,
  onDeleteAsset,
}) => {
  const [selectedTab, setSelectedTab] = useState<InvestmentType>("Stocks");
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [targetTab, setTargetTab] = useState<InvestmentType>("Stocks");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [group, setGroup] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState("");

  const tabs: InvestmentType[] = ["Stocks", "SIP", "GoldSilver"];

  const currentItems = investments[selectedTab] || [];
  
  // Sort descending for display so the newest entry is visible first
  const displayItems = [...currentItems].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!group.trim()) { setFormError("Group is required"); return; }
    if (!name.trim()) { setFormError("Asset Name is required"); return; }

    if (selectedTab === "SIP") {
      const amtVal = parseFloat(amount) || 0;
      if (amtVal <= 0) { setFormError("Amount must be greater than 0"); return; }
      onAddAsset("SIP", {
        date,
        group: group.trim(),
        name: name.trim(),
        amount: amtVal,
        price: amtVal,
        qty: 1,
        currentPrice: amtVal
      });
    } else {
      const priceVal = parseFloat(price) || 0;
      const qtyVal = parseFloat(qty) || 0;
      if (priceVal <= 0 || qtyVal <= 0) { setFormError("Price and Quantity must be greater than 0"); return; }
      onAddAsset(targetTab, {
        date,
        group: group.trim(),
        name: name.trim(),
        price: priceVal,
        qty: qtyVal,
        amount: priceVal * qtyVal,
        currentPrice: priceVal
      });
    }

    // Reset Form
    setGroup("");
    setName("");
    setPrice("");
    setQty("");
    setAmount("");
    setIsAdding(false);
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
      {/* Module Title & Tab Sync Time */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
            Investment Portfolio
          </span>
          <h2 className="text-base font-bold text-slate-800 mt-2.5">
            [{selectedTab === "GoldSilver" ? "Gold & Silver" : selectedTab}] Portfolio Updated:{" "}
            <span className="text-slate-500 font-mono text-xs font-medium">
              {syncTime || "Not synced (Local state)"}
            </span>
          </h2>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setSelectedTab(tab); setTargetTab(tab); }}
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
        {/* Table View */}
        <div className="lg:col-span-8 order-2 lg:order-1 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Asset Allocation Ledger ({displayItems.length} entries)
            </h3>
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
                        className="bg-white border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs text-slate-600"
                      >
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{item.date}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/50">
                            {item.group}
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
                          {formatCurrency(selectedTab === "SIP" ? item.amount : (item.price * item.qty))}
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Asset Class</label>
                <select
                  value={targetTab}
                  onChange={(e) => { setTargetTab(e.target.value as InvestmentType); setSelectedTab(e.target.value as InvestmentType); }}
                  className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="Stocks">Stocks</option>
                  <option value="SIP">SIP</option>
                  <option value="GoldSilver">Gold & Silver</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Acquisition Date</label>
                <div className="relative">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs font-mono text-slate-800 focus:outline-none" />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400"><Calendar size={14} /></div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Sector / Group</label>
                <div className="relative">
                  <input type="text" placeholder="e.g. Automobile, Mid cap, Gold" value={group} onChange={(e) => setGroup(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none" />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400"><Layers size={14} /></div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Asset Name</label>
                <div className="relative">
                  <input type="text" placeholder="e.g. Tata Motors, Motilal Oswal" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none" />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400"><FileText size={14} /></div>
                </div>
              </div>

              {selectedTab === "SIP" ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">SIP Amount</label>
                  <div className="relative">
                    <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs font-mono text-slate-800 focus:outline-none" />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400"><IndianRupee size={14} /></div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Buy Price</label>
                    <input type="number" placeholder="Price" step="any" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs font-mono text-slate-800 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Quantity</label>
                    <input type="number" placeholder="Qty" step="any" value={qty} onChange={(e) => setQty(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs font-mono text-slate-800 focus:outline-none" />
                  </div>
                </div>
              )}

              {formError && <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded">{formError}</div>}

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md text-xs transition-colors cursor-pointer flex items-center justify-center">
                <Plus size={14} className="mr-1" /> Add Asset Record
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
