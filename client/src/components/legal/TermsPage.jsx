import React from "react";
import { FileText, ArrowLeft, ShieldCheck, Scale, Mail, AlertTriangle } from "lucide-react";

export default function TermsPage({ onNavigate, siteSettings }) {
  const supportEmail = siteSettings?.supportEmail || "support@telegram-drive.in";

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-200 selection:bg-blue-500 selection:text-white font-sans py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <button
            onClick={() => onNavigate("landing")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
            <Scale className="w-4 h-4 text-cyan-400" />
            <span>TeleDrive Terms & Conditions</span>
          </div>
        </div>

        {/* Title Banner */}
        <div className="space-y-3">
          <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
            Terms of Service
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Last updated: September 1, 2026 • Applies to all visitors and registered users
          </p>
        </div>

        {/* Terms Content Body */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-10 space-y-8 text-xs sm:text-sm leading-relaxed text-slate-300">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using TeleDrive (<a href="https://telegram-drive.in" className="text-cyan-400 hover:underline">telegram-drive.in</a>), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              2. Description of Service
            </h2>
            <p>
              TeleDrive provides an open web management interface and streaming conduit that interacts with the Telegram MTProto protocol, enabling users to upload, stream, organize, and share digital files. Individual file uploads are currently supported up to 2GB per file.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              3. User Responsibilities & Acceptable Use
            </h2>
            <p>
              You agree not to use TeleDrive for:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li>Storing, transmitting, or distributing illegal materials, malware, ransomware, or malicious exploits.</li>
              <li>Infringing upon intellectual property, copyright, or trademark rights of third parties.</li>
              <li>Attempting to disrupt, exploit, overload, or bypass system rate limits or server infrastructure.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              4. Content Ownership & Rights
            </h2>
            <p>
              You retain 100% full ownership and copyright of all files, documents, and media you upload to or stream through TeleDrive. TeleDrive claims no ownership or proprietary rights over any user-uploaded files.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              5. Disclaimer & Limitation of Liability
            </h2>
            <p>
              TeleDrive is provided on an "AS IS" and "AS AVAILABLE" basis. While we employ rigorous multi-DC streaming and persistent database synchronizations, we are not liable for any data loss, service interruptions, or actions resulting from changes to Telegram's external API policies.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              6. Termination & Inquiries
            </h2>
            <p>
              We reserve the right to suspend accounts that violate acceptable use policies. For questions regarding these terms:
            </p>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <Mail className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">TeleDrive Legal Team</p>
                <a href={`mailto:${supportEmail}`} className="text-cyan-400 hover:underline">
                  {supportEmail}
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="text-center text-xs text-slate-500 pt-4">
          <p>© {new Date().getFullYear()} TeleDrive. Fair, transparent, and user-centric terms.</p>
        </div>
      </div>
    </div>
  );
}
