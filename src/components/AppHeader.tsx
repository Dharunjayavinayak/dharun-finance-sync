/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Database, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Link } from "lucide-react";

interface AppHeaderProps {
  globalSyncTime: string | null;
  appsScriptUrl: string;
  onUrlChange: (newUrl: string) => void;
  onSync: () => Promise<void>;
  syncStatus: "idle" | "syncing" | "success" | "error";
  syncError: string | null;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  globalSyncTime,
  appsScriptUrl,
  onUrlChange,
  onSync,
  syncStatus,
  syncError,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [inputValue, setInputValue] = useState(appsScriptUrl);

  const isConfigured = appsScriptUrl && appsScriptUrl !== "YOUR_DEPLOYED_WEB_APP_URL" && appsScriptUrl.trim() !== "";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUrlChange(inputValue.trim());
    setShowConfig(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 mb-6 shadow-xs" id="app-header-container">
      {/* Top row: Brand & Global Sync Time */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-slate-800 font-sans">
            FINANCE<span className="text-indigo-600">SYNC</span>
            <span className="text-xs font-light text-slate-400 ml-1">PRO</span>
          </h1>
          
          {/* Apps Script Endpoint Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-3 py-1 rounded border border-slate-200/80 truncate max-w-[280px] md:max-w-[400px]" title={appsScriptUrl}>
              URL: {isConfigured ? appsScriptUrl : "YOUR_DEPLOYED_WEB_APP_URL"}
            </span>
            <span className={`inline-flex h-2 w-2 rounded-full ${isConfigured ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} title={isConfigured ? "Script Connected" : "Local State Mode"}></span>
          </div>
        </div>

        {/* Sync Now & Config Drawer Toggle Buttons */}
        <div className="flex items-center gap-3">
          <div className="text-left md:text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Global Sync Time</p>
            <p className="text-xs font-mono text-slate-600" id="global-sync-time">
              {globalSyncTime ? globalSyncTime : "Not Synced (Local)"}
            </p>
          </div>

          <button
            id="toggle-config-drawer"
            onClick={() => {
              setShowConfig(!showConfig);
              setInputValue(appsScriptUrl);
            }}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <Link size={14} className="text-slate-400" />
            <span>Endpoint Settings</span>
            {showConfig ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <motion.button
            id="sync-now-button"
            onClick={onSync}
            disabled={syncStatus === "syncing"}
            whileTap={{ scale: 0.97 }}
            className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer ${
              syncStatus === "syncing" ? "opacity-75" : ""
            }`}
          >
            <RefreshCw
              size={14}
              className={`${syncStatus === "syncing" ? "animate-spin" : ""}`}
            />
            <span>{syncStatus === "syncing" ? "Syncing..." : "Sync Now"}</span>
          </motion.button>
        </div>
      </div>

      {/* Sync Status / Feedback notifications */}
      <div className="max-w-7xl mx-auto">
        <AnimatePresence>
          {syncStatus === "error" && syncError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center space-x-2 font-mono"
              id="sync-error-banner"
            >
              <AlertTriangle size={14} className="text-rose-500 shrink-0" />
              <div className="flex-1 truncate">
                <strong>Connection Failed:</strong> {syncError}
              </div>
              <button
                onClick={onSync}
                className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[10px] font-bold uppercase transition-colors"
              >
                Retry
              </button>
            </motion.div>
          )}

          {syncStatus === "success" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center space-x-2 font-mono"
              id="sync-success-banner"
            >
              <CheckCircle size={14} className="text-emerald-600 shrink-0" />
              <div>
                <strong>Sync Complete:</strong> Successfully refreshed expenses and investments from spreadsheet sheets.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Collapsible End Point Settings Form */}
      <div className="max-w-7xl mx-auto">
        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-slate-200"
              id="config-drawer-form"
            >
              <form onSubmit={handleSave} className="space-y-3 max-w-2xl bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-mono">
                    Google Apps Script Web App URL
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      required
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer"
                      >
                        Save & Apply
                      </button>
                      {isConfigured && (
                        <button
                          type="button"
                          onClick={() => {
                            setInputValue("YOUR_DEPLOYED_WEB_APP_URL");
                            onUrlChange("YOUR_DEPLOYED_WEB_APP_URL");
                            setShowConfig(false);
                          }}
                          className="px-4 py-1.5 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-500 border border-slate-200 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Provide the full published Web App URL from your Google Apps Script editor. Ensure the script is deployed with access configured as <strong>&quot;Anyone&quot;</strong> and running as your account to allow public fetching and state synchronization.
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
