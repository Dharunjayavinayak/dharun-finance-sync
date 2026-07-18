/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { AppHeader } from "./components/AppHeader";
import { DashboardStats } from "./components/DashboardStats";
import { ExpenseModule } from "./components/ExpenseModule";
import { InvestmentModule } from "./components/InvestmentModule";
import { DEFAULT_SYNC_STATE } from "./data";
import { SyncState, BankName, AssetClass, Transaction } from "./types";
import { Wallet, LineChart } from "lucide-react";

// ==========================================================
// 1. CONFIG STRING PLACEHOLDER
// Paste your published Google Apps Script Web App URL here.
// ==========================================================
const APPS_SCRIPT_URL = 'YOUR_DEPLOYED_WEB_APP_URL';

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

  const [activeModule, setActiveModule] = useState<"expenses" | "portfolio">("expenses");
  const [scriptUrl, setScriptUrl] = useState<string>(() => {
    // Let user override the hardcoded APPS_SCRIPT_URL in the UI, saved to localStorage
    const savedUrl = localStorage.getItem("finsync_script_url");
    if (savedUrl && savedUrl !== "YOUR_DEPLOYED_WEB_APP_URL") {
      return savedUrl;
    }
    return APPS_SCRIPT_URL;
  });

  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

  // Persistence to local storage
  useEffect(() => {
    localStorage.setItem("finsync_app_state", JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem("finsync_script_url", scriptUrl);
  }, [scriptUrl]);

  // Handle setting endpoint from UI Settings
  const handleUrlChange = (newUrl: string) => {
    setScriptUrl(newUrl);
    // After setting a new URL, trigger sync automatically
    if (newUrl && newUrl !== "YOUR_DEPLOYED_WEB_APP_URL") {
      triggerSync(newUrl);
    }
  };

  // Automated background sync on load if URL is configured
  useEffect(() => {
    const isConfigured = scriptUrl && scriptUrl !== "YOUR_DEPLOYED_WEB_APP_URL" && scriptUrl.trim() !== "";
    if (isConfigured) {
      triggerSync(scriptUrl);
    }
  }, []);

  // Sync / Fetch function
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
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();

      // Deep, robust parsing to prevent bad/missing sheets crashing the state
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
                credit: parseFloat(tx.credit) || 0,
                cost: parseFloat(tx.cost) || 0,
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
              name: st.name || "STOCK",
              qty: parseFloat(st.qty) || 0,
              price: parseFloat(st.price) || 0,
              currentPrice: parseFloat(st.currentPrice || st.price) || 0,
            }));
            nextState.assetSyncTimes.Stocks = nowStr;
          }

          // SIP
          if (Array.isArray(fetchedInv.SIP)) {
            nextState.investments.SIP = fetchedInv.SIP.map((sip: any, idx: number) => ({
              id: sip.id || `sip-fetched-${idx}`,
              date: sip.date || new Date().toISOString().split("T")[0],
              name: sip.name || "Mutual Fund",
              amount: parseFloat(sip.amount) || 0,
              currentValue: parseFloat(sip.currentValue || sip.amount) || 0,
            }));
            nextState.assetSyncTimes.SIP = nowStr;
          }

          // GoldSilver
          if (Array.isArray(fetchedInv.GoldSilver)) {
            nextState.investments.GoldSilver = fetchedInv.GoldSilver.map((gs: any, idx: number) => ({
              id: gs.id || `gs-fetched-${idx}`,
              date: gs.date || new Date().toISOString().split("T")[0],
              name: gs.name || "Metal Asset",
              qty: parseFloat(gs.qty) || 0,
              price: parseFloat(gs.price) || 0,
              currentPrice: parseFloat(gs.currentPrice || gs.price) || 0,
            }));
            nextState.assetSyncTimes.GoldSilver = nowStr;
          }
        }

        nextState.globalSyncTime = nowStr;
        return nextState;
      });

      setSyncStatus("success");
      // Clear success notification after 5 seconds
      setTimeout(() => {
        setSyncStatus("idle");
      }, 5000);

    } catch (error: any) {
      console.error("Fetch synchronization failed", error);
      setSyncStatus("error");
      setSyncError(error.message || "Network error. Please check CORS configs or script visibility.");
    }
  };

  // Asynchronous remote API update runner
  const sendActionToApi = async (payload: any) => {
    const isConfigured = scriptUrl && scriptUrl !== "YOUR_DEPLOYED_WEB_APP_URL" && scriptUrl.trim() !== "";
    if (!isConfigured) {
      console.log("No deployed Web App connected. Change saved strictly to local cache.");
      return;
    }

    try {
      // Set to syncing state for immediate feedback
      setSyncStatus("syncing");
      setSyncError(null);

      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8", // Crucial bypass for CORS pre-flight
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`POST action failed: ${response.statusText}`);
      }

      const resJson = await response.json();
      console.log("Action synchronized successfully", resJson);

      // Re-trigger global sync to make sure state reflects sheet calculations perfectly
      await triggerSync(scriptUrl);
    } catch (err: any) {
      console.error("Action API synchronization failed", err);
      setSyncStatus("error");
      setSyncError(`Action Sync Failed: ${err.message}. Your local copy is saved.`);
    }
  };

  // Transaction mutation handlers
  const handleAddTransaction = (bank: BankName, tx: Omit<Transaction, "id">) => {
    const newTx: Transaction = {
      ...tx,
      id: `${bank.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    };

    // Update state locally first (Optimistic response)
    setState((prev) => {
      const updatedList = [...prev.expenses[bank], newTx];
      return {
        ...prev,
        expenses: {
          ...prev.expenses,
          [bank]: updatedList,
        },
      };
    });

    // Send payload asynchronously
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
    // Update state locally first
    setState((prev) => {
      const filtered = prev.expenses[bank].filter((item) => item.id !== tx.id);
      return {
        ...prev,
        expenses: {
          ...prev.expenses,
          [bank]: filtered,
        },
      };
    });

    // Send payload asynchronously
    sendActionToApi({
      action: "delete",
      sheetName: bank,
      date: tx.date,
      reason: tx.reason,
    });
  };

  // Investment mutation handlers
  const handleAddAsset = (assetClass: AssetClass, asset: any) => {
    const newId = `${assetClass.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const newAsset = { ...asset, id: newId };

    // Update state locally
    setState((prev) => {
      const list = prev.investments[assetClass] || [];
      return {
        ...prev,
        investments: {
          ...prev.investments,
          [assetClass]: [...list, newAsset],
        },
      };
    });

    // Send payload asynchronously
    const addPayload: any = {
      action: "add",
      sheetName: assetClass,
      date: newAsset.date,
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
    // Update state locally first
    setState((prev) => {
      const list = prev.investments[assetClass] || [];
      // Remove matching asset from local array
      const filtered = list.filter((item: any) => !(item.date === asset.date && item.name === asset.name));
      return {
        ...prev,
        investments: {
          ...prev.investments,
          [assetClass]: filtered,
        },
      };
    });

    // Send payload asynchronously
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
        {/* Module 1: Universal Header & Setup Drawer */}
        <AppHeader
          globalSyncTime={state.globalSyncTime}
          appsScriptUrl={scriptUrl}
          onUrlChange={handleUrlChange}
          onSync={() => triggerSync(scriptUrl)}
          syncStatus={syncStatus}
          syncError={syncError}
        />

        {/* Dashboard Unified Financial State Cards */}
        <DashboardStats expenses={state.expenses} investments={state.investments} />

        {/* Dynamic Centered Navigation Action Panel */}
        <div className="flex justify-center mb-8" id="navigation-bar">
          <div className="bg-slate-100 p-1 rounded-lg inline-flex items-center space-x-1 shadow-xs border border-slate-200/50">
            <button
              id="nav-expenses-btn"
              onClick={() => setActiveModule("expenses")}
              className={`flex items-center space-x-2 px-5 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer ${
                activeModule === "expenses"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Wallet size={15} />
              <span>Manage Expenses</span>
            </button>
            <button
              id="nav-portfolio-btn"
              onClick={() => setActiveModule("portfolio")}
              className={`flex items-center space-x-2 px-5 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer ${
                activeModule === "portfolio"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <LineChart size={15} />
              <span>View Investment Portfolio</span>
            </button>
          </div>
        </div>

        {/* Primary Content View Area */}
        <main className="transition-all duration-300" id="primary-view-container">
          {activeModule === "expenses" ? (
            <ExpenseModule
              expenses={state.expenses}
              syncTimes={state.bankSyncTimes}
              onAddTransaction={handleAddTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          ) : (
            <InvestmentModule
              investments={state.investments}
              syncTimes={state.assetSyncTimes}
              onAddAsset={handleAddAsset}
              onDeleteAsset={handleDeleteAsset}
            />
          )}
        </main>
      </div>
    </div>
  );
}
