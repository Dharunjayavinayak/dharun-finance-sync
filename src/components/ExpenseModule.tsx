import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trash2,
  Plus,
  Calendar,
  Tag,
  FileText,
  IndianRupee,
  Search,
  X,
  Filter as FilterIcon
} from "lucide-react";
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
  const [viewLimit, setViewLimit] = useState<5 | 20 | "all">(5);

  // --- Inline Filter / Search States ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- Form States ---
  const [targetBank, setTargetBank] = useState<BankName>("HDFC");
  const [dateInput, setDateInput] = useState(() => new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [credit, setCredit] = useState("");
  const [cost, setCost] = useState("");
  const [formError, setFormError] = useState("");

  const banks: BankName[] = ["HDFC", "IOB", "Canara"];
  const currentBankTransactions = expenses[selectedBank] || [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterContainerRef.current &&
        !filterContainerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when filter opens
  useEffect(() => {
    if (isFilterOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isFilterOpen]);

  // 1. Dynamic Top Repeated Categories (Ranked by Frequency)
  const rankedCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    currentBankTransactions.forEach((tx) => {
      const cat = tx.category?.trim();
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });

    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }, [currentBankTransactions]);

  // 2. Filtered category suggestions based on user input
  const suggestedCategories = useMemo(() => {
    if (!categoryQuery.trim()) {
      return rankedCategories.slice(0, 6); // Top 6 most repeated
    }
    const q = categoryQuery.toLowerCase();
    return rankedCategories.filter((cat) => cat.toLowerCase().includes(q));
  }, [rankedCategories, categoryQuery]);

  // 3. Form Combobox suggestions for Category & Reason
  const formDynamicCategories = Array.from(
    new Set(currentBankTransactions.map((tx) => tx.category).filter(Boolean))
  );
  const formDynamicReasons = Array.from(
    new Set(currentBankTransactions.map((tx) => tx.reason).filter(Boolean))
  );

  // 4. Reverse chronological ordering
  const chronologicalReversed = useMemo(() => {
    return [...currentBankTransactions].sort((a, b) => {
      const parse = (dStr: string) => {
        if (!dStr) return 0;
        const parts = dStr.split(/[-/]/);
        if (parts.length === 3 && parts[2].length === 4) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
        }
        return new Date(dStr).getTime() || 0;
      };
      return parse(b.date) - parse(a.date);
    });
  }, [currentBankTransactions]);

  // 5. Apply Category Filtering & Limit Logic
  const displayItems = useMemo(() => {
    const trimmedQuery = categoryQuery.trim().toLowerCase();

    // If category filter is active, search across ALL records
    if (trimmedQuery) {
      return chronologicalReversed.filter((tx) =>
        tx.category?.toLowerCase().includes(trimmedQuery)
      );
    }

    // Default view range limit
    return viewLimit === "all" ? chronologicalReversed : chronologicalReversed.slice(0, viewLimit);
  }, [chronologicalReversed, categoryQuery, viewLimit]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const trimmedCat = category.trim();
    const trimmedReason = reason.trim();
    const creditVal = parseFloat(credit) || 0;
    const costVal = parseFloat(cost) || 0;

    if (!trimmedCat) {
      setFormError("Category is required");
      return;
    }
    if (!trimmedReason) {
      setFormError("Reason is required");
      return;
    }
    if (creditVal <= 0 && costVal <= 0) {
      setFormError("Please enter a valid Credit (+) or Cost (-) amount");
      return;
    }

    // Convert date input (YYYY-MM-DD) to DD-MM-YYYY
    let formattedDate = dateInput;
    if (dateInput.includes("-")) {
      const parts = dateInput.split("-");
      if (parts[0].length === 4) {
        formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    onAddTransaction(targetBank, {
      date: formattedDate,
      category: trimmedCat,
      reason: trimmedReason,
      credit: creditVal,
      cost: costVal,
    });

    setCategory("");
    setReason("");
    setCredit("");
    setCost("");
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-7xl mx-auto" id="expense-module">
      {/* Module Header */}
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

        {/* Bank Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50">
          {banks.map((bank) => (
            <button
              key={bank}
              onClick={() => {
                setSelectedBank(bank);
                setTargetBank(bank);
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedBank === bank
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              {bank} Bank
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Ledger Section */}
        <div className="lg:col-span-8 order-2 lg:order-1 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Ledger ({displayItems.length} shown of {chronologicalReversed.length})
            </h3>

            <div className="flex items-center gap-2">
              {/* Inline Search / Filter Component */}
              <div className="relative" ref={filterContainerRef}>
                {!isFilterOpen ? (
                  <button
                    onClick={() => {
                      setIsFilterOpen(true);
                      setShowDropdown(true);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition cursor-pointer ${
                      categoryQuery
                        ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <FilterIcon size={13} />
                    <span>{categoryQuery ? `Category: ${categoryQuery}` : "Filter"}</span>
                  </button>
                ) : (
                  <div className="flex items-center bg-white border border-indigo-300 rounded-md shadow-xs px-2 py-0.5 w-52 sm:w-60">
                    <Search size={13} className="text-slate-400 mr-1.5 shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search category..."
                      value={categoryQuery}
                      onChange={(e) => {
                        setCategoryQuery(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full text-xs text-slate-800 focus:outline-none bg-transparent"
                    />
                    <button
                      onClick={() => {
                        setCategoryQuery("");
                        setIsFilterOpen(false);
                        setShowDropdown(false);
                      }}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* Dropdown Suggestions */}
                {isFilterOpen && showDropdown && (
                  <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      {categoryQuery ? "Available Categories" : "Most Repeated Categories"}
                    </div>

                    {suggestedCategories.length === 0 ? (
                      <div className="px-2 py-2 text-xs text-slate-400">No matching category found</div>
                    ) : (
                      <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                        {suggestedCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setCategoryQuery(cat);
                              setShowDropdown(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition cursor-pointer flex items-center justify-between ${
                              categoryQuery.toLowerCase() === cat.toLowerCase()
                                ? "bg-indigo-50 text-indigo-700 font-semibold"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span>{cat}</span>
                            <Tag size={11} className="text-slate-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* View Limit Selector */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-[11px] font-semibold">
                <button
                  disabled={Boolean(categoryQuery)}
                  onClick={() => setViewLimit(5)}
                  className={`px-2 py-1 rounded transition-all ${
                    viewLimit === 5 && !categoryQuery
                      ? "bg-white text-indigo-600 shadow-xs cursor-pointer"
                      : "text-slate-600 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  Last 5
                </button>
                <button
                  disabled={Boolean(categoryQuery)}
                  onClick={() => setViewLimit(20)}
                  className={`px-2 py-1 rounded transition-all ${
                    viewLimit === 20 && !categoryQuery
                      ? "bg-white text-indigo-600 shadow-xs cursor-pointer"
                      : "text-slate-600 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  Last 20
                </button>
                <button
                  disabled={Boolean(categoryQuery)}
                  onClick={() => setViewLimit("all")}
                  className={`px-2 py-1 rounded transition-all ${
                    viewLimit === "all" || Boolean(categoryQuery)
                      ? "bg-white text-indigo-600 shadow-xs cursor-pointer"
                      : "text-slate-600 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/20 flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] font-mono">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-center">Credit (+)</th>
                  <th className="py-3 px-4 text-center">Cost (-)</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {displayItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 text-xs font-medium">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    displayItems.map((tx) => (
                      <motion.tr
                        key={tx.id}
                        layout
                        className="bg-white border-b border-slate-100 hover:bg-slate-50/50 text-xs text-slate-600"
                      >
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{tx.date}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/50">
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{tx.reason}</td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-600 font-semibold">
                          {tx.credit > 0 ? `+${formatCurrency(tx.credit)}` : "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-rose-600 font-semibold">
                          {tx.cost > 0 ? `-${formatCurrency(tx.cost)}` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-900 font-semibold">
                          {formatCurrency(tx.balance)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => onDeleteTransaction(selectedBank, tx)}
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

        {/* Add Transaction Form */}
        <div className="lg:col-span-4 order-1 lg:order-2">
          <div className="bg-slate-50/40 rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 pb-3 border-b border-slate-200/60">
              Add Transaction
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Target Bank
                </label>
                <select
                  value={targetBank}
                  onChange={(e) => {
                    const b = e.target.value as BankName;
                    setTargetBank(b);
                    setSelectedBank(b);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="HDFC">HDFC Bank</option>
                  <option value="IOB">IOB Bank</option>
                  <option value="Canara">Canara Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Transaction Date
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
                  Category
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="exp-category-suggestions"
                    placeholder="Type or select..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none"
                  />
                  <datalist id="exp-category-suggestions">
                    {formDynamicCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                    <Tag size={14} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Reason / Description
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="exp-reason-suggestions"
                    placeholder="Type or select description..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none"
                  />
                  <datalist id="exp-reason-suggestions">
                    {formDynamicReasons.map((rsn) => (
                      <option key={rsn} value={rsn} />
                    ))}
                  </datalist>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                    <FileText size={14} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5 font-mono">
                    Credit (+)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      step="any"
                      value={credit}
                      onChange={(e) => setCredit(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs font-mono text-slate-800 focus:outline-none"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-emerald-500">
                      <IndianRupee size={14} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1.5 font-mono">
                    Cost (-)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      step="any"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-2.5 text-xs font-mono text-slate-800 focus:outline-none"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-rose-500">
                      <IndianRupee size={14} />
                    </div>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md text-xs transition-colors cursor-pointer flex items-center justify-center"
              >
                <Plus size={14} className="mr-1" /> Add Record
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};