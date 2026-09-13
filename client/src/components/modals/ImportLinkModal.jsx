import React, { useState, useMemo } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import { X, Link2, Send, Sparkles, Layers, CheckCircle2, AlertCircle } from "lucide-react";

function analyzeTelegramInput(text) {
  if (!text || typeof text !== "string") return null;
  const lines = text
    .trim()
    .split(/[\r\n,]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  if (lines.length > 1) {
    return {
      type: "multi",
      count: lines.length,
      label: `${lines.length} Links in Batch`
    };
  }

  const single = lines[0];
  const rangeMatch = single.match(/[\/_](\d+)[-_.:]{1,2}(\d+)(?:[?#]|$)/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    const total = max - min + 1;
    return {
      type: "range",
      start: min,
      end: max,
      total,
      cappedTotal: Math.min(total, 100),
      isCapped: total > 100,
      label: `Range: #${min} → #${max} (${Math.min(total, 100)} msgs${total > 100 ? " capped" : ""})`
    };
  }

  const singleMatch = single.match(/[\/_](\d+)(?:[?#]|$)/);
  if (singleMatch) {
    return {
      type: "single",
      id: singleMatch[1],
      label: `Single Post #${singleMatch[1]}`
    };
  }

  return null;
}

export default function ImportLinkModal() {
  const { activeModal, setActiveModal, currentFolderId, refresh, showToast, settings } = useDrive();
  const [postUrl, setPostUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const analysis = useMemo(() => analyzeTelegramInput(postUrl), [postUrl]);

  if (activeModal !== "import_link") return null;

  const handleImport = async (e) => {
    e.preventDefault();
    if (!postUrl.trim()) return;

    if (!settings?.telegramUser?.connected) {
      showToast("Please connect your Cloud Sync node in Settings to enable direct stream imports!", "error");
      setActiveModal("settings");
      return;
    }

    setLoading(true);
    try {
      const res = await DriveAPI.importLink(postUrl.trim(), currentFolderId);
      if (res.success) {
        if (res.isBulk) {
          const skipMsg = res.skipped > 0 ? ` (${res.skipped} text-only messages skipped)` : "";
          showToast(`🎉 Successfully imported ${res.count} file${res.count > 1 ? "s" : ""}!${skipMsg}`);
        } else if (res.file) {
          showToast(`Imported "${res.file.name}" from ${res.file.telegram_channel_title || "Linked Channel"}`);
        }
        refresh();
        setActiveModal(null);
        setPostUrl("");
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed to import media stream link";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-white dark:bg-[#282a2c] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Import via Cloud Stream Link
              </h3>
              <p className="text-xs text-slate-400">
                Single posts, range links (e.g. 1054-1090), or multi-link batches
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Telegram Link / Range / Batch
              </label>
              {analysis && (
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    analysis.type === "range"
                      ? "bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300"
                      : analysis.type === "multi"
                      ? "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                      : "bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300"
                  }`}
                >
                  {analysis.type === "range" || analysis.type === "multi" ? (
                    <Layers className="w-3 h-3" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  {analysis.label}
                </span>
              )}
            </div>

            <div className="relative">
              <textarea
                rows={3}
                required
                autoFocus
                placeholder={"Single link:\nhttps://t.me/channel_name/123\n\nBulk Range link:\nhttps://t.me/c/2643917389/1036/1054-1090"}
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-800 dark:text-white resize-none font-mono text-xs leading-relaxed"
              />
            </div>

            {analysis?.isCapped && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Range exceeds 100. Importing first 100 messages to prevent Telegram rate limits.</span>
              </div>
            )}

            <p className="text-[11px] text-slate-400 mt-1.5">
              💡 Supports public channels, private channels (<code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">/c/...</code>), forum topics, and ranges (<code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">1054-1090</code>).
            </p>
          </div>

          <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/80 rounded-2xl p-3.5 text-xs text-sky-900 dark:text-sky-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-300">
              <Sparkles className="w-4 h-4 text-sky-500 shrink-0" />
              Smart Cloud Stream Import
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">
              Media files are linked instantly to your current folder with zero download wait time. Non-media and plain text messages in ranges are skipped automatically.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#323437] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !postUrl.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-xl shadow-md shadow-sky-500/20 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>
                    {analysis?.type === "range" || analysis?.type === "multi"
                      ? "Importing Batch..."
                      : "Fetching Media..."}
                  </span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 -rotate-12" />
                  <span>
                    {analysis?.type === "range"
                      ? `Import Range (${analysis.cappedTotal} Msgs)`
                      : analysis?.type === "multi"
                      ? `Import ${analysis.count} Links`
                      : "Import & Add to Drive"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
