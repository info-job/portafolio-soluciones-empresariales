import React, { useState, useMemo } from 'react';
import {
  X, Copy, Check, Download, Image as ImageIcon, Mail,
  Sparkles, ShieldCheck, Phone, User, Briefcase
} from 'lucide-react';
import {
  DEFAULT_CRISTIAN_SIGNATURE_CONFIG,
  GmailSignatureConfig,
  SIGNATURE_THEMES,
  SignatureThemeId,
  buildGmailSignatureHtml,
  buildPlainTextSignature,
  buildStandaloneSignatureFileHtml,
  copyRichSignatureToClipboard,
  renderSignatureToPngDataUrl,
  triggerFileDownload,
} from '../lib/gmailSignatureBuilder';

interface GmailSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GmailSignatureModal: React.FC<GmailSignatureModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<GmailSignatureConfig>(DEFAULT_CRISTIAN_SIGNATURE_CONFIG);
  const [copiedRich, setCopiedRich] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [downloadedType, setDownloadedType] = useState<'html' | 'png' | null>(null);

  const signatureHtml = useMemo(() => buildGmailSignatureHtml(config), [config]);
  const signaturePlain = useMemo(() => buildPlainTextSignature(config), [config]);

  if (!isOpen) return null;

  const handleCopyForGmail = async () => {
    const ok = await copyRichSignatureToClipboard(signatureHtml, signaturePlain);
    if (ok) {
      setCopiedRich(true);
      setTimeout(() => setCopiedRich(false), 3500);
    }
  };

  const handleCopyRawHtml = async () => {
    try {
      await navigator.clipboard.writeText(signatureHtml);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    } catch {
      // ignore
    }
  };

  const handleDownloadHtml = () => {
    const fullHtml = buildStandaloneSignatureFileHtml(config);
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const safeFileName = (config.fullName || 'Cristian_Munoz_Rojas')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_');
    triggerFileDownload(blob, `Firma_Gmail_${safeFileName}.html`);
    setDownloadedType('html');
    setTimeout(() => setDownloadedType(null), 3000);
  };

  const handleDownloadPng = () => {
    const dataUrl = renderSignatureToPngDataUrl(config);
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    const safeFileName = (config.fullName || 'Cristian_Munoz_Rojas')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_');
    link.download = `Firma_Gmail_${safeFileName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadedType('png');
    setTimeout(() => setDownloadedType(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden my-auto">
        <div className="bg-[#0B2545] text-white px-6 py-5 flex items-center justify-between border-b-4 border-[#C9A227]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/15">
              <Mail size={22} className="text-[#F5D77A]" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">
                Pie de Firma Profesional para Gmail
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                100% compatible con Gmail Web, Android, iOS y Outlook (HTML tablas inline + Descarga .HTML y .PNG HD)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[82vh] overflow-y-auto">
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                Estilo Visual Ejecutivo
              </label>
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(SIGNATURE_THEMES) as SignatureThemeId[]).map((themeKey) => {
                  const theme = SIGNATURE_THEMES[themeKey];
                  const active = config.theme === themeKey;
                  return (
                    <button
                      key={themeKey}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, theme: themeKey }))}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-4 h-4 rounded-full border shrink-0"
                          style={{ backgroundColor: theme.badgeBg, borderColor: theme.accentBar }}
                        />
                        <div>
                          <div className="text-xs font-bold leading-tight">{theme.label}</div>
                          <div className={`text-[10px] ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                            {theme.subtitle}
                          </div>
                        </div>
                      </div>
                      {active && <Check size={14} className="text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                  <User size={11} /> Nombre Completo
                </label>
                <input
                  type="text"
                  value={config.fullName}
                  onChange={(e) => setConfig((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:border-[#0B2545]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                  <Briefcase size={11} /> Título Profesional / Cargo
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:border-[#0B2545]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                  <Phone size={11} /> Teléfono Celular
                </label>
                <input
                  type="text"
                  value={config.phoneDisplay}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      phoneDisplay: e.target.value,
                      phoneRaw: e.target.value.replace(/\D/g, ''),
                    }))
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-semibold border border-slate-300 rounded-xl focus:outline-none focus:border-[#0B2545]"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeWhatsAppLink}
                    onChange={(e) => setConfig((prev) => ({ ...prev, includeWhatsAppLink: e.target.checked }))}
                    className="rounded border-slate-300 accent-emerald-600"
                  />
                  Incluir enlace directo a WhatsApp
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeEmail}
                    onChange={(e) => setConfig((prev) => ({ ...prev, includeEmail: e.target.checked }))}
                    className="rounded border-slate-300 accent-emerald-600"
                  />
                  Incluir correo electrónico ({config.email})
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeConfidentiality}
                    onChange={(e) => setConfig((prev) => ({ ...prev, includeConfidentiality: e.target.checked }))}
                    className="rounded border-slate-300 accent-emerald-600"
                  />
                  Añadir nota breve de confidencialidad
                </label>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between gap-5">
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs bg-white">
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span className="flex items-center gap-2">
                  <Sparkles size={13} className="text-emerald-600" />
                  Vista Previa Real en Correo Gmail
                </span>
                <span className="font-mono text-[10px] text-slate-400">HTML Inline • Table Layout</span>
              </div>
              <div className="p-5 space-y-5 bg-white">
                <div className="text-xs text-slate-500 space-y-1.5 border-b border-slate-100 pb-4">
                  <p>Estimado/a,</p>
                  <p>Quedo atento a sus comentarios y a su entera disposición para coordinar una reunión.</p>
                  <p className="pt-1">Saludos cordiales,</p>
                </div>

                <div
                  className="p-4 rounded-xl border border-dashed border-slate-300 bg-white overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: signatureHtml }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleCopyForGmail}
                className="w-full py-3.5 px-5 bg-[#0B2545] hover:bg-[#133A6B] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedRich ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                {copiedRich
                  ? '¡Copiado! Ahora pega en Gmail (Configuración → Firma → Ctrl+V)'
                  : 'Copiar Firma Lista para Gmail (1 Clic)'}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  {downloadedType === 'html' ? <Check size={14} /> : <Download size={14} />}
                  {downloadedType === 'html' ? '¡HTML Descargado!' : 'Descargar .HTML'}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  {downloadedType === 'png' ? <Check size={14} /> : <ImageIcon size={14} />}
                  {downloadedType === 'png' ? '¡PNG Descargado!' : 'Descargar .PNG (HD)'}
                </button>

                <button
                  type="button"
                  onClick={handleCopyRawHtml}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {copiedCode ? '¡Código Copiado!' : 'Copiar Código HTML'}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] text-slate-600 space-y-1.5">
              <div className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5 text-[10.5px]">
                <ShieldCheck size={14} className="text-emerald-600" />
                Cómo instalar en Gmail (15 segundos)
              </div>
              <ol className="list-decimal pl-4 space-y-0.5 leading-relaxed">
                <li>Haz clic en <strong>Copiar Firma Lista para Gmail (1 Clic)</strong> o abre el archivo <strong>.HTML</strong> descargado.</li>
                <li>Ve a <strong>Gmail → ⚙️ Configuración → Ver toda la configuración → General → Firma</strong>.</li>
                <li>Crea una nueva firma, pega con <strong>Ctrl + V</strong> (o <strong>Cmd + V</strong>) y pulsa <strong>Guardar cambios</strong> al final.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GmailSignatureModal;
