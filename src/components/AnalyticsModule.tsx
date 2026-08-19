import React, { useState, useMemo } from 'react';
import { BankData, InvestmentData, BankName } from '../types';
import { ChevronLeft, ChevronRight, PieChart as PieIcon, BarChart3, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface AnalyticsProps {
  expenses: BankData;
  investments: InvestmentData;
}

const BANKS: (BankName | 'All')[] = ['All', 'HDFC', 'IOB', 'Canara'];
const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#84cc16'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Robust date parser supporting DD-MM-YYYY, YYYY-MM-DD, and ISO strings.
 * Prevents UTC / Local timezone day-shift corruption.
 */
function parseTxDate(dateStr?: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const clean = dateStr.trim().split('T')[0];
  const parts = clean.split(/[-/]/);

  if (parts.length === 3) {
    // Format: DD-MM-YYYY (e.g. 02-08-2026)
    if (parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return { year, month, day };
      }
    }
    // Format: YYYY-MM-DD (e.g. 2026-08-02)
    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return { year, month, day };
      }
    }
  }

  const fallback = new Date(dateStr);
  if (!isNaN(fallback.getTime())) {
    return { year: fallback.getFullYear(), month: fallback.getMonth(), day: fallback.getDate() };
  }

  return null;
}

/**
 * Sanitizes numeric strings and handles decimals/currency safely.
 */
function cleanNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const sanitized = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(sanitized);
  return isNaN(num) ? 0 : num;
}

export function AnalyticsModule({ expenses, investments }: AnalyticsProps) {
  // --- Expense Filter State ---
  const [bankIndex, setBankIndex] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [topLimit, setTopLimit] = useState<number>(5);

  // --- Investment Filter State ---
  const [invTimeframe, setInvTimeframe] = useState<'5m' | '1y' | 'all'>('5m');

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  }, []);

  // -------------------------------------------------------------
  // 1. EXPENSE CASH FLOW DATA (Prev 5 Months Window)
  // -------------------------------------------------------------
  const cashFlowData = useMemo(() => {
    const selectedBank = BANKS[bankIndex];
    const result: { month: string; credit: number; cost: number }[] = [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const targetMonths: { year: number; month: number; label: string }[] = [];

    for (let i = 4; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
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
  // 2. TOP EXPENSES BREAKDOWN (Filtered by Month, Year, Limit)
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

    allTx.sort((a, b) => b.cost - a.cost);
    return allTx.slice(0, topLimit);
  }, [expenses, selectedMonth, selectedYear, topLimit]);

  // -------------------------------------------------------------
  // 3. INVESTMENT CUMULATIVE VALUE TREND
  // -------------------------------------------------------------
  const investmentTrendData = useMemo(() => {
    let numMonths = 5;
    if (invTimeframe === '1y') numMonths = 12;
    if (invTimeframe === 'all') numMonths = 24;

    const result: { month: string; invested: number }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    for (let i = numMonths - 1; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i + 1, 0); // Last day of target month
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const monthLabel = targetDate.toLocaleString('en-US', { month: 'short', year: '2-digit' });

      let cumulativeTotal = 0;

      // Cumulative Stocks
      (investments?.Stocks || []).forEach((st: any) => {
        const p = parseTxDate(st.date);
        if (p && (p.year < targetYear || (p.year === targetYear && p.month <= targetMonth))) {
          const qty = cleanNumber(st.qty);
          const price = cleanNumber(st.price);
          cumulativeTotal += qty * price;
        }
      });

      // Cumulative SIP
      (investments?.SIP || []).forEach((sip: any) => {
        const p = parseTxDate(sip.date);
        if (p && (p.year < targetYear || (p.year === targetYear && p.month <= targetMonth))) {
          cumulativeTotal += cleanNumber(sip.amount);
        }
      });

      // Cumulative Gold & Silver
      (investments?.GoldSilver || []).forEach((gs: any) => {
        const p = parseTxDate(gs.date);
        if (p && (p.year < targetYear || (p.year === targetYear && p.month <= targetMonth))) {
          const qty = cleanNumber(gs.qty);
          const price = cleanNumber(gs.price);
          cumulativeTotal += qty * price;
        }
      });

      result.push({
        month: monthLabel,
        invested: Math.round(cumulativeTotal * 100) / 100,
      });
    }

    return result;
  }, [investments, invTimeframe]);

  // -------------------------------------------------------------
  // 4. ASSET ALLOCATION PIE CHART
  // -------------------------------------------------------------
  const assetAllocationData = useMemo(() => {
    let stocksVal = 0;
    (investments?.Stocks || []).forEach((s: any) => {
      stocksVal += cleanNumber(s.qty) * (cleanNumber(s.currentPrice) || cleanNumber(s.price));
    });

    let sipVal = 0;
    (investments?.SIP || []).forEach((sip: any) => {
      sipVal += cleanNumber(sip.currentValue) || cleanNumber(sip.amount);
    });

    let goldVal = 0;
    (investments?.GoldSilver || []).forEach((gs: any) => {
      goldVal += cleanNumber(gs.qty) * (cleanNumber(gs.currentPrice) || cleanNumber(gs.price));
    });

    return [
      { name: 'Stocks', value: Math.round(stocksVal) },
      { name: 'SIP / Mutual Funds', value: Math.round(sipVal) },
      { name: 'Gold & Silver', value: Math.round(goldVal) },
    ].filter((item) => item.value > 0);
  }, [investments]);

  // -------------------------------------------------------------
  // 5. STOCKS SECTOR ALLOCATION PIE CHART (Dynamic Grouping)
  // -------------------------------------------------------------
  const stockSectorData = useMemo(() => {
    const sectorMap: Record<string, number> = {};

    (investments?.Stocks || []).forEach((st: any) => {
      const groupName = st.group?.trim() || 'General';
      const val = cleanNumber(st.qty) * (cleanNumber(st.currentPrice) || cleanNumber(st.price));
      sectorMap[groupName] = (sectorMap[groupName] || 0) + val;
    });

    return Object.keys(sectorMap).map((sector) => ({
      name: sector,
      value: Math.round(sectorMap[sector]),
    })).filter((item) => item.value > 0);
  }, [investments]);

  return (
    <div className="space-y-8">
      {/* ========================================================= */}
      {/* 1. EXPENSE & CASH FLOW ANALYTICS                          */}
      {/* ========================================================= */}
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
                  <Bar dataKey="credit" name="Credit / Inflow (+)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" name="Cost / Expense (-)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Expenses Breakdown Table */}
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

      {/* ========================================================= */}
      {/* 2. INVESTMENT PORTFOLIO ANALYTICS                         */}
      {/* ========================================================= */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-4 mb-6">
          <TrendingUp className="text-emerald-600" size={22} />
          <h2 className="text-lg font-bold text-slate-800">Investment Portfolio Analytics</h2>
        </div>

        {/* Cumulative Invested Area Chart */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-700">Cumulative Invested Value</span>

            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setInvTimeframe('5m')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  invTimeframe === '5m' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                5 Months
              </button>
              <button
                onClick={() => setInvTimeframe('1y')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  invTimeframe === '1y' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                1 Year
              </button>
              <button
                onClick={() => setInvTimeframe('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  invTimeframe === 'all' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                All Time
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={investmentTrendData}>
                <defs>
                  <linearGradient id="invGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Invested Capital']} />
                <Area type="monotone" dataKey="invested" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#invGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation Pie Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Asset Allocation Pie */}
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-slate-700 mb-4 self-start flex items-center gap-1.5">
              <PieIcon size={16} className="text-indigo-500" /> Asset Class Allocation
            </span>
            <div className="h-64 w-full">
              {assetAllocationData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No asset data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={assetAllocationData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {assetAllocationData.map((_, idx) => (
                        <Cell key={`asset-cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Valuation']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Stocks Sector Allocation Pie */}
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-slate-700 mb-4 self-start flex items-center gap-1.5">
              <PieIcon size={16} className="text-indigo-500" /> Stocks Sector Allocation
            </span>
            <div className="h-64 w-full">
              {stockSectorData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No stock sector data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stockSectorData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {stockSectorData.map((_, idx) => (
                        <Cell key={`sector-cell-${idx}`} fill={PIE_COLORS[(idx + 2) % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Valuation']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}