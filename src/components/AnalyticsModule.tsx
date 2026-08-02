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
const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

export function AnalyticsModule({ expenses, investments }: AnalyticsProps) {
  // --- Expense State ---
  const [bankIndex, setBankIndex] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [topLimit, setTopLimit] = useState<number>(5);

  // --- Investment State ---
  const [invTimeframe, setInvTimeframe] = useState<'5m' | '1y' | 'all'>('5m');

  // --- Helpers for Month/Year Selectors ---
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = [2024, 2025, 2026, 2027];

  // -------------------------------------------------------------
  // 1. EXPENSE CASH FLOW DATA (Prev 5 Months)
  // -------------------------------------------------------------
  const cashFlowData = useMemo(() => {
    const selectedBank = BANKS[bankIndex];
    const result: { month: string; credit: number; cost: number }[] = [];

    // Generate last 5 months keys
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthLabel = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });

      let creditSum = 0;
      let costSum = 0;

      const bankList: BankName[] = selectedBank === 'All' ? ['HDFC', 'IOB', 'Canara'] : [selectedBank];

      bankList.forEach((b) => {
        (expenses[b] || []).forEach((tx) => {
          if (!tx.date) return;
          const txDate = new Date(tx.date);
          if (txDate.getFullYear() === year && txDate.getMonth() === month) {
            creditSum += Number(tx.credit) || 0;
            costSum += Number(tx.cost) || 0;
          }
        });
      });

      result.push({
        month: monthLabel,
        credit: creditSum,
        cost: costSum,
      });
    }

    return result;
  }, [expenses, bankIndex]);

  // -------------------------------------------------------------
  // 2. TOP EXPENSES LIST (Filtered Month/Year & Limit)
  // -------------------------------------------------------------
  const topExpensesList = useMemo(() => {
    const allTx: { bank: string; date: string; category: string; reason: string; cost: number }[] = [];

    (['HDFC', 'IOB', 'Canara'] as BankName[]).forEach((b) => {
      (expenses[b] || []).forEach((tx) => {
        if (!tx.date || tx.cost <= 0) return;
        const d = new Date(tx.date);
        if (d.getFullYear() === selectedYear && d.getMonth() === selectedMonth) {
          allTx.push({
            bank: b,
            date: tx.date,
            category: tx.category || 'General',
            reason: tx.reason || 'Expense',
            cost: Number(tx.cost) || 0,
          });
        }
      });
    });

    // Sort descending by cost
    allTx.sort((a, b) => b.cost - a.cost);
    return allTx.slice(0, topLimit);
  }, [expenses, selectedMonth, selectedYear, topLimit]);

  // -------------------------------------------------------------
  // 3. INVESTMENT CUMULATIVE TREND
  // -------------------------------------------------------------
  const investmentTrendData = useMemo(() => {
    let numMonths = 5;
    if (invTimeframe === '1y') numMonths = 12;
    if (invTimeframe === 'all') numMonths = 24;

    const result: { month: string; invested: number }[] = [];
    const now = new Date();

    for (let i = numMonths - 1; i >= 0; i--) {
      const cutoff = new Date(now.getFullYear(), now.getMonth() - i + 1, 0); // End of target month
      const monthLabel = cutoff.toLocaleString('en-US', { month: 'short', year: '2-digit' });

      let cumulativeTotal = 0;

      // Cumulative Stocks
      (investments.Stocks || []).forEach((st) => {
        if (st.date && new Date(st.date) <= cutoff) {
          cumulativeTotal += (Number(st.qty) || 0) * (Number(st.price) || 0);
        }
      });

      // Cumulative SIP
      (investments.SIP || []).forEach((sip) => {
        if (sip.date && new Date(sip.date) <= cutoff) {
          cumulativeTotal += Number(sip.amount) || 0;
        }
      });

      // Cumulative Gold/Silver
      (investments.GoldSilver || []).forEach((gs) => {
        if (gs.date && new Date(gs.date) <= cutoff) {
          cumulativeTotal += (Number(gs.qty) || 0) * (Number(gs.price) || 0);
        }
      });

      result.push({
        month: monthLabel,
        invested: cumulativeTotal,
      });
    }

    return result;
  }, [investments, invTimeframe]);

  // -------------------------------------------------------------
  // 4. PIE CHART 1: ASSET CLASS ALLOCATION
  // -------------------------------------------------------------
  const assetAllocationData = useMemo(() => {
    let stocksVal = 0;
    (investments.Stocks || []).forEach((s) => {
      stocksVal += (Number(s.qty) || 0) * (Number(s.currentPrice || s.price) || 0);
    });

    let sipVal = 0;
    (investments.SIP || []).forEach((sip) => {
      sipVal += Number(sip.currentValue || sip.amount) || 0;
    });

    let goldVal = 0;
    (investments.GoldSilver || []).forEach((gs) => {
      goldVal += (Number(gs.qty) || 0) * (Number(gs.currentPrice || gs.price) || 0);
    });

    return [
      { name: 'Stocks', value: stocksVal },
      { name: 'SIP / Mutual Funds', value: sipVal },
      { name: 'Gold & Silver', value: goldVal },
    ].filter((item) => item.value > 0);
  }, [investments]);

  // -------------------------------------------------------------
  // 5. PIE CHART 2: STOCKS SECTOR ALLOCATION
  // -------------------------------------------------------------
  const stockSectorData = useMemo(() => {
    const sectorMap: Record<string, number> = {};

    (investments.Stocks || []).forEach((st: any) => {
      const groupName = st.group || 'Other Sector';
      const val = (Number(st.qty) || 0) * (Number(st.currentPrice || st.price) || 0);
      sectorMap[groupName] = (sectorMap[groupName] || 0) + val;
    });

    return Object.keys(sectorMap).map((sector) => ({
      name: sector,
      value: sectorMap[sector],
    }));
  }, [investments]);

  return (
    <div className="space-y-8">
      {/* ============================================================== */}
      {/* SECTION 1: EXPENSES ANALYTICS                                  */}
      {/* ============================================================== */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-4 mb-6">
          <BarChart3 className="text-indigo-600" size={22} />
          <h2 className="text-lg font-bold text-slate-800">Expense & Cash Flow Analytics</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* BAR CHART: Previous 5 Months Credit vs Cost */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-700">Cash Flow (Prev 5 Months)</span>

              {/* Bank Navigation Arrows */}
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

          {/* TOP EXPENSES TABLE */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <span className="text-sm font-semibold text-slate-700">Top Expenses Breakdown</span>

              {/* Dynamic Selectors */}
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
                  {months.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-medium text-slate-700"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 bg-slate-50/50">
              {topExpensesList.length === 0 ? (
                <div className="h-full flex items-center justify-center p-8 text-xs text-slate-400">
                  No expenses found for {months[selectedMonth]} {selectedYear}.
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

      {/* ============================================================== */}
      {/* SECTION 2: INVESTMENT ANALYTICS                                */}
      {/* ============================================================== */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-4 mb-6">
          <TrendingUp className="text-emerald-600" size={22} />
          <h2 className="text-lg font-bold text-slate-800">Investment Portfolio Analytics</h2>
        </div>

        {/* AREA CHART: Cumulative Total Amount Invested */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-700">Cumulative Invested Value</span>

            {/* Timeframe Toggles */}
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

        {/* PIE CHARTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Asset Class Breakdown Pie */}
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