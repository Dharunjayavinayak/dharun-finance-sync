import React, { useState, useMemo } from 'react';
import { BankData, BankName } from '../types';
import { ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

interface AnalyticsProps {
  expenses: BankData;
}

const BANKS: (BankName | 'All')[] = ['All', 'HDFC', 'IOB', 'Canara'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Robust date parser: Prevents UTC timezone shift issues
 * Handles 'YYYY-MM-DD', 'YYYY/MM/DD', and DD-MM-YYYY formats.
 */
function parseTxDate(dateStr?: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const parts = dateStr.trim().split(/[-/]/);
  if (parts.length !== 3) {
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime())
      ? null
      : { year: fallback.getFullYear(), month: fallback.getMonth(), day: fallback.getDate() };
  }

  // Check if format is YYYY-MM-DD
  if (parts[0].length === 4) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed month
    const day = parseInt(parts[2], 10);
    return { year, month, day };
  }

  // Check if format is DD-MM-YYYY
  if (parts[2].length === 4) {
    const year = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[0], 10);
    return { year, month, day };
  }

  return null;
}

/**
 * Robust numeric parser: strips currency symbols, commas, and handles decimals cleanly.
 */
function cleanNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const sanitized = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(sanitized);
  return isNaN(num) ? 0 : num;
}

export function AnalyticsModule({ expenses }: AnalyticsProps) {
  const [bankIndex, setBankIndex] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [topLimit, setTopLimit] = useState<number>(5);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  }, []);

  // -------------------------------------------------------------
  // 1. EXPENSE CASH FLOW DATA (Prev 5 Months Rolling Window)
  // -------------------------------------------------------------
  const cashFlowData = useMemo(() => {
    const selectedBank = BANKS[bankIndex];
    const result: { month: string; credit: number; cost: number }[] = [];

    const now = new Date();
    const targetMonths: { year: number; month: number; label: string }[] = [];

    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      targetMonths.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      });
    }

    const bankList: BankName[] = selectedBank === 'All' ? ['HDFC', 'IOB', 'Canara'] : [selectedBank];

    targetMonths.forEach((target) => {
      let creditSum = 0;
      let costSum = 0;

      bankList.forEach((b) => {
        const transactions = expenses?.[b] || [];
        transactions.forEach((tx) => {
          const parsed = parseTxDate(tx.date);
          if (parsed && parsed.year === target.year && parsed.month === target.month) {
            creditSum += cleanNumber(tx.credit);
            costSum += cleanNumber(tx.cost);
          }
        });
      });

      result.push({
        month: target.label,
        credit: Math.round(creditSum * 100) / 100,
        cost: Math.round(costSum * 100) / 100,
      });
    });

    return result;
  }, [expenses, bankIndex]);

  // -------------------------------------------------------------
  // 2. TOP EXPENSES BREAKDOWN
  // -------------------------------------------------------------
  const topExpensesList = useMemo(() => {
    const allTx: { bank: string; date: string; category: string; reason: string; cost: number }[] = [];

    (['HDFC', 'IOB', 'Canara'] as BankName[]).forEach((b) => {
      const transactions = expenses?.[b] || [];
      transactions.forEach((tx) => {
        const cost = cleanNumber(tx.cost);
        if (cost <= 0) return;

        const parsed = parseTxDate(tx.date);
        if (parsed && parsed.year === selectedYear && parsed.month === selectedMonth) {
          allTx.push({
            bank: b,
            date: tx.date,
            category: tx.category?.trim() || 'General',
            reason: tx.reason?.trim() || 'Expense',
            cost: cost,
          });
        }
      });
    });

    // Sort descending by cost amount
    allTx.sort((a, b) => b.cost - a.cost);
    return allTx.slice(0, topLimit);
  }, [expenses, selectedMonth, selectedYear, topLimit]);

  return (
    <div className="space-y-8">
      {/* EXPENSES ANALYTICS SECTION */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-4 mb-6">
          <BarChart3 className="text-indigo-600" size={22} />
          <h2 className="text-lg font-bold text-slate-800">Expense & Cash Flow Analytics</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cash Flow Bar Chart */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-700">Cash Flow (Prev 5 Months)</span>

              {/* Bank Navigation */}
              <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setBankIndex((prev) => (prev === 0 ? BANKS.length - 1 : prev - 1))}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 transition"
                  title="Previous Bank"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-indigo-600 min-w-[70px] text-center">
                  {BANKS[bankIndex]} {BANKS[bankIndex] !== 'All' ? 'Bank' : ''}
                </span>
                <button
                  onClick={() => setBankIndex((prev) => (prev === BANKS.length - 1 ? 0 : prev + 1))}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 transition"
                  title="Next Bank"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, '']} />
                  <Legend />
                  <Bar dataKey="credit" name="Credit (+)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" name="Cost (-)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Expenses List */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <span className="text-sm font-semibold text-slate-700">Top Expenses Breakdown</span>

              <div className="flex items-center gap-2">
                <select
                  value={topLimit}
                  onChange={(e) => setTopLimit(Number(e.target.value))}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-medium text-slate-700"
                >
                  <option value={5}>Top 5</option>
                  <option value={15}>Top 15</option>
                  <option value={20}>Top 20</option>
                </select>

                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-medium text-slate-700"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-medium text-slate-700"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 bg-slate-50/50">
              {topExpensesList.length === 0 ? (
                <div className="h-full flex items-center justify-center p-8 text-xs text-slate-400">
                  No expenses found for {MONTH_NAMES[selectedMonth]} {selectedYear}.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="p-2.5">Date / Bank</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Reason</th>
                        <th className="p-2.5 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {topExpensesList.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 text-slate-500 whitespace-nowrap">
                            {tx.date}<br />
                            <span className="text-[10px] text-indigo-500 font-medium">{tx.bank}</span>
                          </td>
                          <td className="p-2.5 font-medium text-slate-700">{tx.category}</td>
                          <td className="p-2.5 text-slate-500 truncate max-w-[120px]">{tx.reason}</td>
                          <td className="p-2.5 text-right font-bold text-red-600">
                            ₹{tx.cost.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}