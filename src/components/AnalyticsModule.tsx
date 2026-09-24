import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BankData, InvestmentData, BankName } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Plus,
  Minus,
  Search,
  X,
  Filter as FilterIcon,
  Tag
} from 'lucide-react';
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
  Area,
  LabelList
} from 'recharts';

type AssetCategory = 'Stocks' | 'SIP' | 'GoldSilver';
type InvGraphType = 'cumulative' | 'monthly';

interface AnalyticsProps {
  expenses: BankData;
  investments: InvestmentData;
}

const BANKS: (BankName | 'All')[] = ['All', 'HDFC', 'IOB', 'Canara'];
const ASSET_TABS: { key: AssetCategory; label: string }[] = [
  { key: 'Stocks', label: 'Stocks' },
  { key: 'SIP', label: 'SIP / Mutual Funds' },
  { key: 'GoldSilver', label: 'Gold & Silver' }
];

const INV_GRAPHS: { key: InvGraphType; label: string }[] = [
  { key: 'cumulative', label: 'Cumulative Invested Value' },
  { key: 'monthly', label: 'Monthly Invested Amount' }
];

const PIE_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#3b82f6', '#06b6d4', '#84cc16'
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Normalizes any date string (YYYY-MM-DD, ISO, DD-MM-YYYY) into strict DD-MM-YYYY
 */
function toDDMMYYYY(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const clean = dateStr.trim().split('T')[0];
  const parts = clean.split(/[-/]/);

  if (parts.length === 3) {
    if (parts[2].length === 4) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${day}-${month}-${year}`;
    }
    if (parts[0].length === 4) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${day}-${month}-${year}`;
    }
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return dateStr;
}

function parseTxDate(dateStr?: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim().split('T')[0];
  const parts = clean.split(/[-/]/);

  if (parts.length === 3) {
    if (parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) return { year, month, day };
    }
    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) return { year, month, day };
    }
  }

  const fallback = new Date(dateStr);
  if (!isNaN(fallback.getTime())) {
    return { year: fallback.getFullYear(), month: fallback.getMonth(), day: fallback.getDate() };
  }
  return null;
}

function cleanNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const sanitized = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(sanitized);
  return isNaN(num) ? 0 : num;
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
}

export function AnalyticsModule({ expenses, investments }: AnalyticsProps) {
  const [bankIndex, setBankIndex] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [topLimit, setTopLimit] = useState<number>(5);

  const [invTimeframe, setInvTimeframe] = useState<'5m' | '1y' | 'all'>('5m');
  const [invGraphIndex, setInvGraphIndex] = useState<number>(0);

  // Table specific filters for Monthly mode
  const [tableYear, setTableYear] = useState<number>(new Date().getFullYear());
  const [tableMonth, setTableMonth] = useState<number>(new Date().getMonth());

  const [assetTabIndex, setAssetTabIndex] = useState<number>(0);
  const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({});

  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeAssetType = ASSET_TABS[assetTabIndex].key;
  const activeInvGraph = INV_GRAPHS[invGraphIndex].key;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterContainerRef.current &&
        !filterContainerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isFilterOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isFilterOpen]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  }, []);

  // -------------------------------------------------------------
  // 1. EXPENSE CASH FLOW (Prev 5 Months Rolling Window)
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
        label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
      });
    }

    const bankList: BankName[] =
      selectedBank === 'All' ? ['HDFC', 'IOB', 'Canara'] : [selectedBank];

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
        credit: Math.round(creditSum),
        cost: Math.round(costSum)
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
            date: toDDMMYYYY(tx.date),
            category: tx.category?.trim() || 'General',
            reason: tx.reason?.trim() || 'Expense',
            cost: cost
          });
        }
      });
    });

    allTx.sort((a, b) => b.cost - a.cost);
    return allTx.slice(0, topLimit);
  }, [expenses, selectedMonth, selectedYear, topLimit]);

  // -------------------------------------------------------------
  // 3. CUMULATIVE INVESTED VALUE
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
      const targetDate = new Date(currentYear, currentMonth - i + 1, 0);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const monthLabel = targetDate.toLocaleString('en-US', { month: 'short', year: '2-digit' });

      let cumulativeTotal = 0;

      (investments?.Stocks || []).forEach((st: any) => {
        const p = parseTxDate(st.date);
        if (p && (p.year < targetYear || (p.year === targetYear && p.month <= targetMonth))) {
          const qty = cleanNumber(st.qty);
          const price = cleanNumber(st.price);
          cumulativeTotal += cleanNumber(st.amount) || (qty * price);
        }
      });

      (investments?.SIP || []).forEach((sip: any) => {
        const p = parseTxDate(sip.date);
        if (p && (p.year < targetYear || (p.year === targetYear && p.month <= targetMonth))) {
          cumulativeTotal += cleanNumber(sip.amount);
        }
      });

      (investments?.GoldSilver || []).forEach((gs: any) => {
        const p = parseTxDate(gs.date);
        if (p && (p.year < targetYear || (p.year === targetYear && p.month <= targetMonth))) {
          const qty = cleanNumber(gs.qty);
          const price = cleanNumber(gs.price);
          cumulativeTotal += cleanNumber(gs.amount) || (qty * price);
        }
      });

      result.push({
        month: monthLabel,
        invested: Math.round(cumulativeTotal)
      });
    }

    return result;
  }, [investments, invTimeframe]);

  // -------------------------------------------------------------
  // 3B. MONTHLY INVESTED AMOUNT (Incremental per Month)
  // -------------------------------------------------------------
  const monthlyInvestmentData = useMemo(() => {
    let numMonths = 5;
    if (invTimeframe === '1y') numMonths = 12;
    if (invTimeframe === 'all') numMonths = 24;

    const result: { month: string; invested: number }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const targetMonths: { year: number; month: number; label: string }[] = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      targetMonths.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
      });
    }

    targetMonths.forEach((target) => {
      let monthlyTotal = 0;

      (investments?.Stocks || []).forEach((st: any) => {
        const p = parseTxDate(st.date);
        if (p && p.year === target.year && p.month === target.month) {
          const qty = cleanNumber(st.qty);
          const price = cleanNumber(st.price);
          monthlyTotal += cleanNumber(st.amount) || (qty * price);
        }
      });

      (investments?.SIP || []).forEach((sip: any) => {
        const p = parseTxDate(sip.date);
        if (p && p.year === target.year && p.month === target.month) {
          monthlyTotal += cleanNumber(sip.amount);
        }
      });

      (investments?.GoldSilver || []).forEach((gs: any) => {
        const p = parseTxDate(gs.date);
        if (p && p.year === target.year && p.month === target.month) {
          const qty = cleanNumber(gs.qty);
          const price = cleanNumber(gs.price);
          monthlyTotal += cleanNumber(gs.amount) || (qty * price);
        }
      });

      result.push({
        month: target.label,
        invested: Math.round(monthlyTotal)
      });
    });

    return result;
  }, [investments, invTimeframe]);

  // -------------------------------------------------------------
  // 3C. DYNAMIC TABLE DATA (Cumulative vs Selected Month/Year)
  // -------------------------------------------------------------
  const dynamicTableData = useMemo(() => {
    if (activeInvGraph === 'cumulative') {
      const list = investmentTrendData.map((item) => ({
        name: item.month,
        amount: item.invested
      }));
      const totalAmount = list.length > 0 ? list[list.length - 1].amount : 0;
      return { headers: ['Month', 'Cumulative Invested'], list, totalAmount };
    } else {
      const itemMap: Record<string, number> = {};

      const processItems = (items: any[]) => {
        items.forEach((item: any) => {
          const p = parseTxDate(item.date);
          if (p && p.year === tableYear && p.month === tableMonth) {
            const name = item.name?.trim() || item.group?.trim() || 'Investment';
            const qty = cleanNumber(item.qty);
            const price = cleanNumber(item.price);
            const amt = cleanNumber(item.amount) || (qty * price);
            if (amt > 0) {
              itemMap[name] = (itemMap[name] || 0) + amt;
            }
          }
        });
      };

      processItems(investments?.Stocks || []);
      processItems(investments?.SIP || []);
      processItems(investments?.GoldSilver || []);

      const list = Object.entries(itemMap).map(([name, amount]) => ({
        name,
        amount: Math.round(amount)
      })).sort((a, b) => b.amount - a.amount);

      const totalAmount = list.reduce((sum, curr) => sum + curr.amount, 0);

      return { headers: ['Invested In', 'Amount'], list, totalAmount };
    }
  }, [activeInvGraph, investmentTrendData, investments, tableYear, tableMonth]);

  // -------------------------------------------------------------
  // 4. PORTFOLIO ALLOCATION PIE CHARTS
  // -------------------------------------------------------------
  const portfolioSummary = useMemo(() => {
    let stocksVal = 0;
    (investments?.Stocks || []).forEach((s: any) => {
      const qty = cleanNumber(s.qty);
      const price = cleanNumber(s.price);
      stocksVal += cleanNumber(s.amount) || (qty * price);
    });

    let sipVal = 0;
    (investments?.SIP || []).forEach((sip: any) => {
      sipVal += cleanNumber(sip.amount);
    });

    let goldVal = 0;
    (investments?.GoldSilver || []).forEach((gs: any) => {
      const qty = cleanNumber(gs.qty);
      const price = cleanNumber(gs.price);
      goldVal += cleanNumber(gs.amount) || (qty * price);
    });

    const totalPortfolio = stocksVal + sipVal + goldVal;

    const assetData = [
      { name: 'Stocks', value: Math.round(stocksVal) },
      { name: 'SIP / Mutual Funds', value: Math.round(sipVal) },
      { name: 'Gold & Silver', value: Math.round(goldVal) }
    ].filter((item) => item.value > 0);

    const sectorMap: Record<string, number> = {};
    (investments?.Stocks || []).forEach((st: any) => {
      const groupName = st.group?.trim() || 'General';
      const qty = cleanNumber(st.qty);
      const price = cleanNumber(st.price);
      const val = cleanNumber(st.amount) || (qty * price);
      sectorMap[groupName] = (sectorMap[groupName] || 0) + val;
    });

    const stockSectorData = Object.keys(sectorMap).map((sec) => ({
      name: sec,
      value: Math.round(sectorMap[sec])
    })).filter((item) => item.value > 0);

    return { totalPortfolio, assetData, stockSectorData };
  }, [investments]);

  // -------------------------------------------------------------
  // 5. SECTOR BREAKDOWN WITH CLUBBED/GROUPED COMPANIES
  // -------------------------------------------------------------
  const currentAssetItems = useMemo(() => {
    return investments?.[activeAssetType] || [];
  }, [investments, activeAssetType]);

  const uniqueSuggestions = useMemo(() => {
    const names = new Set<string>();
    currentAssetItems.forEach((item: any) => {
      if (item.name) names.add(item.name.trim());
      if (item.group) names.add(item.group.trim());
    });
    const list = Array.from(names);
    if (!searchQuery.trim()) return list.slice(0, 6);
    return list.filter((n) => n.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [currentAssetItems, searchQuery]);

  const sectorGroupedData = useMemo(() => {
    const sectorMap: Record<string, {
      totalAmount: number;
      totalQty: number;
      companyMap: Record<string, {
        name: string;
        latestDate: string;
        totalQty: number;
        totalInvested: number;
      }>
    }> = {};

    const query = searchQuery.trim().toLowerCase();

    currentAssetItems.forEach((item: any) => {
      const nameMatch = item.name?.toLowerCase().includes(query);
      const groupMatch = item.group?.toLowerCase().includes(query);

      if (query && !nameMatch && !groupMatch) return;

      const groupName = item.group?.trim() || 'General';
      const companyName = item.name?.trim() || 'Asset';
      const qty = cleanNumber(item.qty) || (activeAssetType === 'SIP' ? 1 : 0);
      const price = cleanNumber(item.price);
      const amount = cleanNumber(item.amount) || (qty * price);
      const displayDate = toDDMMYYYY(item.date);

      if (!sectorMap[groupName]) {
        sectorMap[groupName] = { totalAmount: 0, totalQty: 0, companyMap: {} };
      }

      sectorMap[groupName].totalAmount += amount;
      sectorMap[groupName].totalQty += qty;

      if (!sectorMap[groupName].companyMap[companyName]) {
        sectorMap[groupName].companyMap[companyName] = {
          name: companyName,
          latestDate: displayDate,
          totalQty: 0,
          totalInvested: 0
        };
      }

      const comp = sectorMap[groupName].companyMap[companyName];
      comp.totalQty += qty;
      comp.totalInvested += amount;
      comp.latestDate = displayDate;
    });

    return Object.entries(sectorMap).map(([sector, data]) => {
      const clubbedCompanies = Object.values(data.companyMap).map((c) => ({
        name: c.name,
        date: c.latestDate,
        qty: c.totalQty,
        avgPrice: c.totalQty > 0 ? c.totalInvested / c.totalQty : c.totalInvested,
        invested: c.totalInvested
      })).sort((a, b) => b.invested - a.invested);

      return {
        sector,
        totalAmount: data.totalAmount,
        totalQty: data.totalQty,
        percentage: portfolioSummary.totalPortfolio > 0
          ? (data.totalAmount / portfolioSummary.totalPortfolio) * 100
          : 0,
        clubbedCompanies
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [currentAssetItems, searchQuery, portfolioSummary.totalPortfolio, activeAssetType]);

  const toggleSector = (sector: string) => {
    setExpandedSectors((prev) => ({
      ...prev,
      [sector]: !prev[sector]
    }));
  };

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
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 transition cursor-pointer"
                  title="Previous Bank"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-indigo-600 min-w-[70px] text-center">
                  {BANKS[bankIndex]} {BANKS[bankIndex] !== 'All' ? 'Bank' : ''}
                </span>
                <button
                  onClick={() => setBankIndex((prev) => (prev === BANKS.length - 1 ? 0 : prev + 1))}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 transition cursor-pointer"
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
                  <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                  <Legend />
                  <Bar dataKey="credit" name="Credit / Inflow (+)" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="cost" name="Cost / Expense (-)" fill="#ef4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
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
                          <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">
                            {tx.date}<br />
                            <span className="text-[10px] text-indigo-500 font-medium">{tx.bank}</span>
                          </td>
                          <td className="p-2.5 font-medium text-slate-700">{tx.category}</td>
                          <td className="p-2.5 text-slate-500 truncate max-w-[120px]">{tx.reason}</td>
                          <td className="p-2.5 text-right font-bold text-red-600">
                            {formatCurrency(tx.cost)}
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

        {/* Investment Graph Section with Left Graph & Right Table (1 Row, 2 Columns) */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            {/* Arrow Switcher for Graphs */}
            <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setInvGraphIndex((prev) => (prev === 0 ? INV_GRAPHS.length - 1 : prev - 1))}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition cursor-pointer"
                title="Previous Graph"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-emerald-600 min-w-[180px] text-center">
                {INV_GRAPHS[invGraphIndex].label}
              </span>
              <button
                onClick={() => setInvGraphIndex((prev) => (prev === INV_GRAPHS.length - 1 ? 0 : prev + 1))}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition cursor-pointer"
                title="Next Graph"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Timeframe Controls */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setInvTimeframe('5m')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  invTimeframe === '5m' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                5 Months
              </button>
              <button
                onClick={() => setInvTimeframe('1y')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  invTimeframe === '1y' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                1 Year
              </button>
              <button
                onClick={() => setInvTimeframe('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  invTimeframe === 'all' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                All Time
              </button>
            </div>
          </div>

          {/* 1 Row, 2 Columns Layout (Graph on Left, Table on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Side: Graph Window */}
            <div className="lg:col-span-7 h-72 w-full bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-center">
              <ResponsiveContainer width="100%" height="100%">
                {activeInvGraph === 'cumulative' ? (
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
                    <Tooltip formatter={(val: number) => [formatCurrency(val), 'Cumulative Capital']} />
                    <Area type="monotone" dataKey="invested" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#invGradient)" isAnimationActive={false}>
                      <LabelList dataKey="invested" position="top" formatter={(val: number) => val > 0 ? formatCurrency(val) : ''} style={{ fontSize: '10px', fill: '#047857', fontWeight: 600 }} />
                    </Area>
                  </AreaChart>
                ) : (
                  <BarChart data={monthlyInvestmentData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip formatter={(val: number) => [formatCurrency(val), 'Monthly Invested']} />
                    <Bar dataKey="invested" name="Monthly Invested" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey="invested" position="top" formatter={(val: number) => val > 0 ? formatCurrency(val) : ''} style={{ fontSize: '10px', fill: '#047857', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Right Side: Summary Table */}
            <div className="lg:col-span-5 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 flex flex-col h-72">
              <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{dynamicTableData.headers[0]}</span>
                {activeInvGraph === 'monthly' ? (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={tableMonth}
                      onChange={(e) => setTableMonth(Number(e.target.value))}
                      className="text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5 font-medium text-slate-700"
                    >
                      {MONTH_NAMES.map((m, idx) => (
                        <option key={m} value={idx}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={tableYear}
                      onChange={(e) => setTableYear(Number(e.target.value))}
                      className="text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5 font-medium text-slate-700"
                    >
                      {availableYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-700">{dynamicTableData.headers[1]}</span>
                )}
              </div>
              {activeInvGraph === 'monthly' && (
                <div className="bg-slate-50 px-3.5 py-1.5 border-b border-slate-200 text-[11px] font-bold text-slate-700 flex justify-between">
                  <span>Asset / Group</span>
                  <span>Amount</span>
                </div>
              )}
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100 bg-white">
                {dynamicTableData.list.length === 0 ? (
                  <div className="h-full flex items-center justify-center p-6 text-xs text-slate-400">
                    No records found for {MONTH_NAMES[tableMonth]} {tableYear}.
                  </div>
                ) : (
                  dynamicTableData.list.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3.5 py-2 text-xs hover:bg-slate-50">
                      <span className="font-medium text-slate-800 truncate max-w-[180px]">{item.name}</span>
                      <span className="font-mono font-bold text-emerald-600">{formatCurrency(item.amount)}</span>
                    </div>
                  ))
                )}
              </div>
              {/* Fixed Bottom Total Row */}
              <div className="bg-slate-100 px-3.5 py-2.5 border-t border-slate-200 text-xs font-bold text-slate-800 flex justify-between">
                <span>Total Invested</span>
                <span className="font-mono text-emerald-700">{formatCurrency(dynamicTableData.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Allocation Pie Charts (Clean, small readable percentage labels inside/outside slices) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 pb-8 border-b border-slate-100">
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-slate-700 mb-4 self-start flex items-center gap-1.5">
              <PieIcon size={16} className="text-indigo-500" /> Asset Class Allocation
            </span>
            <div className="h-64 w-full">
              {portfolioSummary.assetData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No asset data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolioSummary.assetData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      isAnimationActive={false}
                      label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                      labelLine={false}
                    >
                      {portfolioSummary.assetData.map((_, idx) => (
                        <Cell key={`asset-cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => [formatCurrency(val), 'Invested']} />
                    <Legend
                      formatter={(value, entry: any) => {
                        const { payload } = entry;
                        return `${value}: ${formatCurrency(payload.value)}`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-slate-700 mb-4 self-start flex items-center gap-1.5">
              <PieIcon size={16} className="text-indigo-500" /> Stocks Sector Allocation
            </span>
            <div className="h-64 w-full">
              {portfolioSummary.stockSectorData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No stock sector data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolioSummary.stockSectorData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      isAnimationActive={false}
                      label={({ percent }) => percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : ''}
                      labelLine={false}
                    >
                      {portfolioSummary.stockSectorData.map((_, idx) => (
                        <Cell key={`sector-cell-${idx}`} fill={PIE_COLORS[(idx + 2) % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => [formatCurrency(val), 'Invested']} />
                    <Legend
                      formatter={(value, entry: any) => {
                        const { payload } = entry;
                        return `${value}: ${formatCurrency(payload.value)}`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. SECTOR-WISE BREAKDOWN (CEMENT COLOR & GROUPED ASSETS)  */}
        {/* ========================================================= */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Sector-Wise Asset Breakdown
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Total Portfolio Asset Allocation Percentage (%) & Invested Amounts
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Inline Search Filter */}
              <div className="relative" ref={filterContainerRef}>
                {!isFilterOpen ? (
                  <button
                    onClick={() => {
                      setIsFilterOpen(true);
                      setShowDropdown(true);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition cursor-pointer ${
                      searchQuery
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <FilterIcon size={13} />
                    <span>{searchQuery ? `Filter: ${searchQuery}` : 'Filter / Search'}</span>
                  </button>
                ) : (
                  <div className="flex items-center bg-white border border-indigo-300 rounded-md shadow-xs px-2 py-0.5 w-52 sm:w-60">
                    <Search size={13} className="text-slate-400 mr-1.5 shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder={`Search ${activeAssetType}...`}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full text-xs text-slate-800 focus:outline-none bg-transparent"
                    />
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setIsFilterOpen(false);
                        setShowDropdown(false);
                      }}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* Suggestions Dropdown */}
                {isFilterOpen && showDropdown && (
                  <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Available Suggestions
                    </div>
                    {uniqueSuggestions.length === 0 ? (
                      <div className="px-2 py-2 text-xs text-slate-400">No matching assets found</div>
                    ) : (
                      <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                        {uniqueSuggestions.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setSearchQuery(item);
                              setShowDropdown(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition cursor-pointer flex items-center justify-between ${
                              searchQuery.toLowerCase() === item.toLowerCase()
                                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{item}</span>
                            <Tag size={11} className="text-slate-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Asset Class Switcher */}
              <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setAssetTabIndex((prev) => (prev === 0 ? ASSET_TABS.length - 1 : prev - 1))}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 transition cursor-pointer"
                  title="Previous Asset Class"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-indigo-600 min-w-[130px] text-center">
                  {ASSET_TABS[assetTabIndex].label}
                </span>
                <button
                  onClick={() => setAssetTabIndex((prev) => (prev === ASSET_TABS.length - 1 ? 0 : prev + 1))}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 transition cursor-pointer"
                  title="Next Asset Class"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Sector Breakdown List */}
          {sectorGroupedData.length === 0 ? (
            <div className="text-center py-10 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 text-xs font-medium">
              No asset records found matching your filter.
            </div>
          ) : (
            <div className="space-y-3">
              {sectorGroupedData.map((sec) => {
                const isExpanded = !!expandedSectors[sec.sector];
                return (
                  <div
                    key={sec.sector}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs transition-all"
                  >
                    {/* Sector Header Row */}
                    <div
                      onClick={() => toggleSector(sec.sector)}
                      className="flex items-center justify-between p-4 bg-slate-50/60 hover:bg-slate-100/60 cursor-pointer transition select-none"
                    >
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-600 shadow-2xs"
                        >
                          {isExpanded ? <Minus size={13} /> : <Plus size={13} />}
                        </button>
                        <div>
                          <span className="text-xs font-bold text-slate-800">{sec.sector}</span>
                          <span className="text-[10px] text-slate-400 font-medium ml-2">
                            ({sec.clubbedCompanies.length} {sec.clubbedCompanies.length === 1 ? 'asset' : 'assets'})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-slate-900">
                            {formatCurrency(sec.totalAmount)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Qty: {sec.totalQty}
                          </span>
                        </div>
                        {/* Cement/Slate Colored Percentage Badge */}
                        <div className="w-16 text-right">
                          <span className="text-xs font-bold font-mono text-slate-700 bg-slate-200/70 border border-slate-300 px-2 py-0.5 rounded">
                            {sec.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Clubbed Holdings Table */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-white">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100/70 text-slate-500 font-semibold border-b border-slate-200 text-[10px] uppercase font-mono">
                              <th className="p-3">Date</th>
                              <th className="p-3">Asset / Company Name</th>
                              {activeAssetType !== 'SIP' && <th className="p-3 text-right">Avg Price</th>}
                              {activeAssetType !== 'SIP' && <th className="p-3 text-right">Total Qty</th>}
                              <th className="p-3 text-right">Invested Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sec.clubbedCompanies.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/70">
                                <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{item.date}</td>
                                <td className="p-3 font-medium text-slate-800">{item.name}</td>
                                {activeAssetType !== 'SIP' && (
                                  <td className="p-3 text-right font-mono text-slate-600">
                                    {formatCurrency(cleanNumber(item.avgPrice))}
                                  </td>
                                )}
                                {activeAssetType !== 'SIP' && (
                                  <td className="p-3 text-right font-mono text-slate-600 font-semibold">
                                    {item.qty}
                                  </td>
                                )}
                                <td className="p-3 text-right font-mono font-bold text-slate-900">
                                  {formatCurrency(item.invested)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}