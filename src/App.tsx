/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { AppHeader } from "./components/AppHeader";
import { DashboardStats } from "./components/DashboardStats";
import { ExpenseModule } from "./components/ExpenseModule";
import { InvestmentModule } from "./components/InvestmentModule";
import { AnalyticsModule } from "./components/AnalyticsModule";
import { DEFAULT_SYNC_STATE } from "./data";
import { SyncState, BankName, AssetClass, Transaction } from "./types";
import { Wallet, LineChart, BarChart3 } from "lucide-react";

const APPS_SCRIPT_URL = 'YOUR_DEPLOYED_WEB_APP_URL';

function cleanNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const sanitized = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(sanitized);
  return isNaN(num) ? 0 : num;
}

export default function App() {
  const [state, setState] = useState<SyncState>(() => {
    const cached = localStorage.getItem("finsync_app_state");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Failed to parse cached state", e);
      }
    }
    return DEFAULT_SYNC_STATE;
  });

  const [activeModule, setActiveModule] = useState<"expenses" | "portfolio" | "analytics">("expenses");
  const [scriptUrl, setScriptUrl] = useState<string>(() => {
    const savedUrl = localStorage.getItem("finsync_script_url");
    if (savedUrl && savedUrl !== "YOUR_DEPLOYED_WEB_APP_URL") {
      return savedUrl;
    }
    return APPS_SCRIPT_URL;
  });

  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("finsync_app_state", JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem("finsync_script_url", scriptUrl);
  }, [scriptUrl]);

  const handleUrlChange = (newUrl: string) => {
    setScriptUrl(newUrl);
    if (newUrl && newUrl !== "YOUR_DEPLOYED_WEB_APP_URL") {
      triggerSync(newUrl);
    }
  };

  useEffect(() => {
    const isConfigured = scriptUrl && scriptUrl !== "YOUR_DEPLOYED_WEB_APP_URL" && scriptUrl.trim() !== "";
    if (isConfigured) {
      triggerSync(scriptUrl);
    }
  }, []);

  const triggerSync = async (targetUrl = scriptUrl) => {
    if (!targetUrl || targetUrl === "YOUR_DEPLOYED_WEB_APP_URL" || targetUrl.trim() === "") {
      setSyncStatus("error");
      setSyncError("Apps Script URL is not configured. Go to 'Endpoint Settings' to enter your URL.");
      return;
    }

    setSyncStatus("syncing");
    setSyncError(null);

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}:${response.statusText}`);
      }
      const data = await response.json();

      const nowStr = new Date().toLocaleString("en-IN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      setState((prev) => {
        const nextState = { ...prev };

        // Process expenses sheets
        if (data.expenses) {
          const fetchedExpenses = data.expenses;
          (["HDFC", "IOB", "Canara"] as BankName[]).forEach((bank) => {
            if (Array.isArray(fetchedExpenses[bank])) {
              nextState.expenses[bank] = fetchedExpenses[bank].map((tx: any, idx: number) => ({
                id: tx.id || `${bank.toLowerCase()}-fetched-${idx}`,
                date: tx.date || new Date().toISOString().split("T")[0],
                category: tx.category || "General",
                reason: tx.reason || "Unspecified record",
                credit: cleanNumber(tx.credit),
                cost: cleanNumber(tx.cost),
                balance: cleanNumber(tx.balance),
              }));
              nextState.bankSyncTimes[bank] = nowStr;
            }
          });
        }

        // Process investments sheets
        if (data.investments) {
          const fetchedInv = data.investments;

          // Stocks
          if (Array.isArray(fetchedInv.Stocks)) {
            nextState.investments.Stocks = fetchedInv.Stocks.map((st: any, idx: number) => ({
              id: st.id || `stock-fetched-${idx}`,
              date: st.date || new Date().toISOString().split("T")[0],
              group: st.group || "General",
              name: st.name || "STOCK",
              qty: cleanNumber(st.qty),
              price: cleanNumber(st.price),
              amount: cleanNumber(st.amount),
              currentPrice: cleanNumber(st.currentPrice || st.price),
            }));
            nextState.assetSyncTimes.Stocks = nowStr;
          }

          // SIP
          if (Array.isArray(fetchedInv.SIP)) {
            nextState.investments.SIP = fetchedInv.SIP.map((sip: any, idx: number) => ({
              id: sip.id || `sip-fetched-${idx}`,
              date: sip.date || new Date().toISOString().split("T")[0],
              group: sip.group || "Mutual Fund",
              name: sip.name || "Mutual Fund",
              amount: cleanNumber(sip.amount),
              currentValue: cleanNumber(sip.currentValue || sip.amount),
            }));
            nextState.assetSyncTimes.SIP = nowStr;
          }

          // GoldSilver
          if (Array.isArray(fetchedInv.GoldSilver)) {
            nextState.investments.GoldSilver = fetchedInv.GoldSilver.map((gs: any, idx: number) => ({
              id: gs.id || `gs-fetched-${idx}`,
              date: gs.date || new Date().toISOString().split("T")[0],
              group: gs.group || "Metal",
              name: gs.name || "Metal Asset",
              qty: cleanNumber(gs.qty),
              price: cleanNumber(gs.price),
              amount: cleanNumber(gs.amount),
              currentPrice: cleanNumber(gs.currentPrice || gs.price),
            }));
            nextState.assetSyncTimes.GoldSilver = nowStr;
          }
        }

        nextState.globalSyncTime = nowStr;
        return nextState;
      });

      setSyncStatus("success");
      setTimeout(() => {
        setSyncStatus("idle");
      }, 5000);

    } catch (error: any) {
      console.error("Fetch synchronization failed", error);
      setSyncStatus("error");
      setSyncError(error.message || "Network error.");
    }
  };

  const sendActionToApi = async (payload: any) => {
    const isConfigured = scriptUrl && scriptUrl !== "YOUR_DEPLOYED_WEB_APP_URL" && scriptUrl.trim() !== "";
    if (!isConfigured) {
      console.log("No deployed Web App connected. Change saved locally.");
      return;
    }

    try {
      setSyncStatus("syncing");
      setSyncError(null);

      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`POST action failed: ${response.statusText}`);
      }

      await response.json();
      await triggerSync(scriptUrl);
    } catch (err: any) {
      console.error("Action API synchronization failed", err);
      setSyncStatus("error");
      setSyncError(`Action Sync Failed: ${err.message}.`);
    }
  };

  const handleAddTransaction = (bank: BankName, tx: Omit<Transaction, "id">) => {
    const newTx: Transaction = {
      ...tx,
      id: `${bank.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    };

    setState((prev) => {
      const updatedList = [...prev.expenses[bank], newTx];
      return {
        ...prev,
        expenses: { ...prev.expenses, [bank]: updatedList },
      };
    });

    sendActionToApi({
      action: "add",
      sheetName: bank,
      date: newTx.date,
      category: newTx.category,
      reason: newTx.reason,
      credit: newTx.credit,
      cost: newTx.cost,
    });
  };

  const handleDeleteTransaction = (bank: BankName, tx: Transaction) => {
    setState((prev) => {
      const filtered = prev.expenses[bank].filter((item) => item.id !== tx.id);
      return {
        ...prev,
        expenses: { ...prev.expenses, [bank]: filtered },
      };
    });

    sendActionToApi({
      action: "delete",
      sheetName: bank,
      date: tx.date,
      reason: tx.reason,
    });
  };

  const handleAddAsset = (assetClass: AssetClass, asset: any) => {
    const newId = `${assetClass.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const newAsset = { ...asset, id: newId };

    setState((prev) => {
      const list = prev.investments[assetClass] || [];
      return {
        ...prev,
        investments: { ...prev.investments, [assetClass]: [...list, newAsset] },
      };
    });

    const addPayload: any = {
      action: "add",
      sheetName: assetClass,
      date: newAsset.date,
      group: newAsset.group || "General",
      name: newAsset.name,
    };

    if (assetClass === "SIP") {
      addPayload.amount = newAsset.amount;
      addPayload.currentValue = newAsset.currentValue;
    } else {
      addPayload.qty = newAsset.qty;
      addPayload.price = newAsset.price;
      addPayload.currentPrice = newAsset.currentPrice;
    }

    sendActionToApi(addPayload);
  };

  const handleDeleteAsset = (assetClass: AssetClass, asset: { date: string; name: string }) => {
    setState((prev) => {
      const list = prev.investments[assetClass] || [];
      const filtered = list.filter((item: any) => !(item.date === asset.date && item.name === asset.name));
      return {
        ...prev,
        investments: { ...prev.investments, [assetClass]: filtered },
      };
    });

    sendActionToApi({
      action: "delete",
      sheetName: assetClass,
      date: asset.date,
      name: asset.name,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 font-sans antialiased" id="main-scroller">
      <div className="max-w-7xl mx-auto px-4 py-8 md:px-6">
        <AppHeader
          globalSyncTime={state.globalSyncTime}
          appsScriptUrl={scriptUrl}
          onUrlChange={handleUrlChange}
          onSync={() => triggerSync(scriptUrl)}
          syncStatus={syncStatus}
          syncError={syncError}
        />

        <DashboardStats expenses={state.expenses} investments={state.investments} />

        <div className="flex justify-center mb-8" id="navigation-bar">
          <div className="bg-slate-100 p-1 rounded-lg inline-flex items-center space-x-1 shadow-xs border border-slate-200/50">
            <button
              id="nav-expenses-btn"
              onClick={() => setActiveModule("expenses")}
              className={`flex items-center space-x-2 px-5 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer ${
                activeModule === "expenses" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Wallet size={15} />
              <span>Manage Expenses</span>
            </button>
            <button
              id="nav-portfolio-btn"
              onClick={() => setActiveModule("portfolio")}
              className={`flex items-center space-x-2 px-5 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer ${
                activeModule === "portfolio" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <LineChart size={15} />
              <span>View Investment Portfolio</span>
            </button>
            <button
              id="nav-analytics-btn"
              onClick={() => setActiveModule("analytics")}
              className={`flex items-center space-x-2 px-5 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer ${
                activeModule === "analytics" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <BarChart3 size={15} />
              <span>View Analytics</span>
            </button>
          </div>
        </div>

        <main className="transition-all duration-300" id="primary-view-container">
          {activeModule === "expenses" && (
            <ExpenseModule
              expenses={state.expenses}
              syncTimes={state.bankSyncTimes}
              onAddTransaction={handleAddTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activeModule === "portfolio" && (
            <InvestmentModule
              investments={state.investments}
              syncTime={state.globalSyncTime}
              onAddAsset={handleAddAsset}
              onDeleteAsset={handleDeleteAsset}
            />
          )}

          {activeModule === "analytics" && (
            <AnalyticsModule
              expenses={state.expenses}
              investments={state.investments}
            />
          )}
        </main>
      </div>
    </div>
  );
}