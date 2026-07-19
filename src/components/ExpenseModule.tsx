import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, Plus, Calendar, Tag, FileText, ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react";
import { BankData, BankName, Transaction } from "../types";

interface ExpenseModuleProps {
  expenses: BankData;
  syncTimes: {
    HDFC: string | null;
    IOB: string | null;
    Canara: string | null;
  };
  onAddTransaction: (bank: BankName, tx: Omit<Transaction, "id">) => void;
  onDeleteTransaction: (bank: BankName, tx: Transaction) => void;
}

export const ExpenseModule: React.FC<ExpenseModuleProps> = ({
  expenses,
  syncTimes,
  onAddTransaction,
  onDeleteTransaction,
}) => {
  const [selectedBank, setSelectedBank] = useState<BankName>("HDFC");
  const [isAdding, setIsAdding] = useState(false);
  
  // NEW Enhancement: Range/Limit state (defaults to last 5 entries)
  const [viewLimit, setViewLimit] = useState<5 | 20 | "all">(5);

  // Form states
  const [targetBank, setTargetBank] = useState<BankName>("HDFC");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [credit, setCredit] = useState("");
  const [cost, setCost] = useState("");
  const [formError, setFormError] = useState("");

  const banks: BankName[] = ["HDFC", "IOB", "Canara"];

  // Unique suggestions collected dynamically from your data
  const dynamicCategories = Array.from(new Set((expenses[selectedBank] || []).map(t => t.category).filter(Boolean)));
  const dynamicReasons = Array.from(new Set((expenses[selectedBank] || []).map(t => t.reason).filter(Boolean)));

  const getTransactionsWithBalance = (bankName: BankName): Transaction[] => {
    const list = expenses[bankName] || [];
    let runningBal = 0;
    
    return list.map((tx) => {
      if (tx.balance !== undefined && tx.balance !== 0) {
        runningBal = tx.balance;
        return tx;
      }
      runningBal = runningBal + (tx.credit || 0) - (tx.cost || 0);
      return { ...tx, balance: runningBal };
    });
  };

  const currentBankTransactions = getTransactionsWithBalance(selectedBank);
  const chronologicalReversed = [...currentBankTransactions].reverse();
  
  // NEW Enhancement: Apply the selected range filter
  const displayTransactions = viewLimit === "all" 
    ? chronologicalReversed 
    : chronologicalReversed.slice(0, viewLimit);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!category.trim()) { setFormError("Category is required"); return; }
    if (!reason.trim()) { setFormError("Reason/Description is required"); return; }

    const creditVal = parseFloat(credit) || 0;
    const costVal = parseFloat(cost) || 0;

    if (creditVal < 0 || costVal < 0) { setFormError("Amounts cannot be negative"); return; }
    if (creditVal === 0 && costVal === 0) { setFormError("Either Credit or Cost must be greater than 0"); return; }

    onAddTransaction(targetBank, {
      date,
      category: category.trim(),
      reason: reason.trim(),
      credit: creditVal,
      cost: costVal,
    });

    setCategory("");
    setReason("");
    setCredit("");
    setCost("");
    setIsAdding(false);
    setSelectedBank(targetBank);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-7xl mx-auto" id="expense-module">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
            Expense Manager
          </span>
          <h2 className="text-base font-bold text-slate-800 mt-2.5">
            [{selectedBank}] Tab Last Sync:{" "}
            <span className="text-slate-500 font-mono text-xs font-medium">
              {syncTimes[selectedBank] || "Not synced (Local state)"}
            </span>
          </h2>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50">
          {banks.map((bank) => (
            <button
              key={bank}
              onClick={() => setSelectedBank(bank)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedBank === bank ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              {bank} Bank
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 order-2 lg:order-1 flex flex-col min-h-[400px]">
          
          {/* NEW Enhancement: View Range Controls Toolbar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Ledger ({displayTransactions.length} shown of {chronologicalReversed.length})
            </h3>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-[11px] font-semibold">
              <button 
                onClick={() => setViewLimit(5)} 
                className={`px-2 py-1 rounded transition-all cursor-pointer ${viewLimit === 5 ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600"}`}
              >
                Last 5
              </button>
              <button 
                onClick={() => setViewLimit(20)} 
                className={`px-2 py-1 rounded transition-all cursor-pointer ${viewLimit === 20 ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600"}`}
              >
                Last 20
              </button>
              <button 
                onClick={() => setViewLimit("all")} 
                className={`px-2 py-1 rounded transition-all cursor-pointer ${viewLimit === "all" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600"}`}
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
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Credit (+)</th>
                  <th className="py-3 px-4 text-right">Cost (-)</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {displayTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 text-xs font-medium">No transactions found.</td>
                    </tr>
                  ) : (
                    displayTransactions.map((row) => (
                      <motion.tr key={row.id} layout className="bg-white border-b border-slate-100 hover:bg-slate-50/50 text-xs text-slate-600">
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{row.date}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/50">
                            {row.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 max-w-[180px] truncate" title={row.reason}>{row.reason}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">{row.credit > 0 ? `+${formatCurrency(row.credit)}` : "—"}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600">{row.cost > 0 ? `-${formatCurrency(row.cost)}` : "—"}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-900 font-medium bg-slate-50/10">{formatCurrency(row.balance || 0)}</td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => onDeleteTransaction(selectedBank, row)} className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"><Trash2 size={13} /></button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Entry Form */}
        <div className="lg:col-span-4 order-1 lg:order-2">
          <div className="bg-slate-50/40 rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 pb-3 border-b border-slate-200/60">Add Transaction</h3>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Target Bank</label>
                <select value={targetBank} onChange={(e) => setTargetBank(e.target.value as BankName)} className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none font-semibold">
                  {banks.map((b) => <option key={b} value={b}>{b} Bank</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Transaction Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs font-mono text-slate-800 focus:outline-none" />
              </div>

              {/* Enhanced Combobox Input: Category */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Category</label>
                <div className="relative">
                  <input type="text" list="exp-category-suggestions" placeholder="Type or select..." value={category} onChange={(e) => setCategory(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none" />
                  <datalist id="exp-category-suggestions">
                    {dynamicCategories.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400"><Tag size={14} /></div>
                </div>
              </div>

              {/* Enhanced Combobox Input: Reason */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Reason / Description</label>
                <div className="relative">
                  <input type="text" list="exp-reason-suggestions" placeholder="Type or select description..." value={reason} onChange={(e) => setReason(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none" />
                  <datalist id="exp-reason-suggestions">
                    {dynamicReasons.map(reas => <option key={reas} value={reas} />)}
                  </datalist>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400"><FileText size={14} /></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Credit (+)</label>
                  <div className="relative">
                    <input type="number" placeholder="0" min="0" step="any" value={credit} onChange={(e) => { setCredit(e.target.value); if(e.target.value) setCost(""); }} className="w-full bg-white border border-slate-200 rounded-md py-1.5 pl-2.5 pr-8 text-xs font-mono text-slate-800 focus:outline-none" />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-emerald-500"><ArrowUpCircle size={14} /></div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Cost (-)</label>
                  <div className="relative">
                    <input type="number" placeholder="0" min="0" step="any" value={cost} onChange={(e) => { setCost(e.target.value); if(e.target.value) setCredit(""); }} className="w-full bg-white border border-slate-200 rounded-md py-1.5 pl-2.5 pr-8 text-xs font-mono text-slate-800 focus:outline-none" />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-rose-500"><ArrowDownCircle size={14} /></div>
                  </div>
                </div>
              </div>

              {formError && <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded">{formError}</div>}
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md text-xs transition-colors cursor-pointer flex items-center justify-center">
                <Plus size={14} className="mr-1" /> Add Record
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
