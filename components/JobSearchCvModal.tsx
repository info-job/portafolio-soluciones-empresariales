import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Upload, CheckCircle2, Sparkles, AlertCircle, ArrowRight, 
  X, Briefcase, Award, ShieldCheck, RefreshCw, Layers, Check, Plus, Trash2,
  Download, Edit3, UserCheck
} from 'lucide-react';
import { CvProfile } from '../types';
import { parseCvPdfFile, generateDemoCristianPdf, downloadCristianCvPdf, previewCristianCvPdf } from '../lib/cvPdfParser';

interface JobSearchCvModalProps {
  isOpen: boolean;
  isMandatory: boolean; // if true, cannot be closed with X until a CV is confirmed
  currentCvProfile: CvProfile | null;
  onConfirmCv: (profile: CvProfile) => void;
  onClose?: () => void;
}

export const JobSearchCvModal: React.FC<JobSearchCvModalProps> = ({
  isOpen,
  isMandatory,
  currentCvProfile,
  onConfirmCv,
  onClose
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Staged profile (either freshly parsed or currently active)
  const [stagedProfile, setStagedProfile] = useState<CvProfile | null>(currentCvProfile);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Sync staged profile when modal opens or current profile updates
  useEffect(() => {
    if (isOpen) {
      setStagedProfile(currentCvProfile);
      setErrorMsg(null);
      setIsProcessing(false);
      setProcessingStatus('');
      setIsEditingProfile(false);
    }
  }, [isOpen, currentCvProfile]);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
    const isDocx = lowerName.endsWith('.docx') || lowerName.endsWith('.doc') || file.type.includes('word');
    const isTxt = lowerName.endsWith('.txt') || lowerName.endsWith('.md') || file.type.startsWith('text/');

    if (!isPdf && !isDocx && !isTxt) {
      setErrorMsg('Por favor selecciona un documento en formato PDF (.pdf), Word (.docx) o Texto (.txt).');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);
    setProcessingStatus('Leyendo archivo y estructura del documento...');

    try {
      await new Promise(r => setTimeout(r, 200));
      setProcessingStatus('Extrayendo texto, competencias y trayectoria laboral...');
      const profile = await parseCvPdfFile(file);
      
      await new Promise(r => setTimeout(r, 250));
      setProcessingStatus('Indexando habilidades y calibrando algoritmo de coincidencia...');
      setStagedProfile(profile);
    } catch (err: any) {
      console.error('Error procesando archivo de CV:', err);
      setErrorMsg('Ocurrió un error al procesar el archivo. Intenta nuevamente o usa el CV modelo base.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await processFile(file);
    }
  };

  const handleLoadDemoModelCv = async () => {
    setErrorMsg(null);
    setIsProcessing(true);
    setProcessingStatus('Generando documento PDF de 1 página...');
    try {
      await new Promise(r => setTimeout(r, 300));
      setProcessingStatus('Extrayendo habilidades de Cristian Andrés Muñoz Rojas...');
      const { profile } = await generateDemoCristianPdf();
      setStagedProfile(profile);
    } catch (err) {
      console.error('Error generando demo CV:', err);
      setErrorMsg('Error al cargar CV modelo base.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleAddSkill = () => {
    if (!newSkillInput.trim() || !stagedProfile) return;
    const clean = newSkillInput.trim();
    if (stagedProfile.extractedSkills.some(s => s.toLowerCase() === clean.toLowerCase())) {
      return;
    }
    setStagedProfile({
      ...stagedProfile,
      extractedSkills: [...stagedProfile.extractedSkills, clean]
    });
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    if (!stagedProfile) return;
    setStagedProfile({
      ...stagedProfile,
      extractedSkills: stagedProfile.extractedSkills.filter(s => s !== skillToRemove)
    });
  };

  const handleConfirm = () => {
    if (!stagedProfile) return;
    onConfirmCv(stagedProfile);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-[100000] bg-slate-950/85 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex justify-center items-start pt-4 sm:pt-10">
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden mb-10 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER BAR */}
        <div className="bg-[#0B3C5D] text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl shadow-sm">
              <FileText size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded font-mono uppercase tracking-widest">
                  {isMandatory ? 'PASO 1 OBLIGATORIO' : 'CONFIGURACIÓN DE CV'}
                </span>
                <span className="text-amber-300/80 text-xs font-mono font-bold">ALGORITMO MATCH & FILTROS CHILE</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight mt-0.5">
                Carga y Calibración de Currículum Vitae (PDF)
              </h2>
            </div>
          </div>

          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              title="Cerrar modal"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* CONTENT BODY */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* EXPLANATORY NOTICE */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 sm:p-5 flex items-start gap-4 text-indigo-950">
            <ShieldCheck size={26} className="text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <strong className="block font-black text-indigo-900 uppercase tracking-wide text-xs">
                ¿Por qué es necesario ingresar tu CV?
              </strong>
              <p className="text-slate-700 leading-relaxed font-normal">
                Para que el motor inteligente pueda <strong>calcular con exactitud tu compatibilidad (Match %)</strong> frente a las convocatorias de empleo públicas y privadas de Chile, identificar tus <strong>fortalezas clave</strong>, resaltar los <strong>requisitos pendientes</strong> y filtrar las ofertas laborales por rango salarial y rubro adecuado.
              </p>
            </div>
          </div>

          {/* DRAG & DROP / UPLOAD SECTION */}
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center relative group ${
                isDragging 
                  ? 'border-amber-500 bg-amber-50/50 scale-[1.01]' 
                  : 'border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.txt"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-slate-950 flex items-center justify-center transition-all shadow-sm mb-4">
                <Upload size={30} className={isProcessing ? 'animate-bounce' : ''} />
              </div>

              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                {isProcessing ? 'Procesando Documento...' : 'Arrastra aquí tu CV (PDF o Word DOCX) o haz clic para examinar'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Admite documentos PDF, Word (.docx) o texto (Currículum chileno, formato Europass, LinkedIn PDF o resumen ejecutivo).
              </p>

              {isProcessing && (
                <div className="mt-4 flex items-center gap-2 bg-indigo-100 text-indigo-900 px-4 py-2 rounded-xl text-xs font-mono font-bold animate-pulse">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>{processingStatus}</span>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs flex items-center gap-2 font-mono">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* FAST-PATH: DEMO MODEL CV */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-100/90 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-black text-sm shadow-xs">
                  ★
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase text-slate-900">
                      CV • Perfil Profesional Destacado
                    </span>
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black font-mono px-2 py-0.2 rounded-full uppercase">
                      Ingeniería + CMF + S&OP + IA
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-600 block mt-0.5">
                    Carga el CV Modelo de Cristian Andrés Muñoz Rojas con desglose de perfil profesional en 1 página optimizada para ATS.
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const res = downloadCristianCvPdf();
                    if (res.success) {
                      setDownloadNotice('✓ CV en PDF descargado exitosamente.');
                    } else {
                      previewCristianCvPdf();
                      setDownloadNotice('Abriendo vista previa en una nueva pestaña...');
                    }
                    setTimeout(() => setDownloadNotice(null), 5000);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Descargar archivo PDF de 1 página optimizado para ATS con Perfil Profesional"
                >
                  <Download size={13} />
                  <span>Descargar PDF (1 Pág. ATS)</span>
                </button>

                <button
                  type="button"
                  onClick={() => previewCristianCvPdf()}
                  className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Abrir vista previa del PDF en una nueva pestaña"
                >
                  <FileText size={13} className="text-slate-600" />
                  <span>Ver PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadDemoModelCv}
                  disabled={isProcessing}
                  className="bg-[#0B3C5D] hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  Cargar CV Modelo
                </button>
              </div>
            </div>

            {downloadNotice && (
              <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between">
                <span>{downloadNotice}</span>
                <button type="button" onClick={() => setDownloadNotice(null)} className="text-emerald-700 hover:text-emerald-900">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* STAGED CV RESULT CARD (IF LOADED) */}
          {stagedProfile && (
            <div className="bg-white rounded-2xl border-2 border-emerald-500/40 p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black font-mono px-2 py-0.5 rounded uppercase">
                        ✓ CV Analizado & Listo
                      </span>
                      {stagedProfile.rarityTag && (
                        <span className="bg-amber-400 text-slate-950 text-[9px] font-black font-mono px-2 py-0.5 rounded uppercase flex items-center gap-1">
                          ★ {stagedProfile.rarityTag}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        className="text-[10px] text-slate-500 hover:text-indigo-600 font-mono underline ml-1 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 size={11} />
                        <span>{isEditingProfile ? 'Cerrar edición' : 'Editar datos'}</span>
                      </button>
                    </div>

                    {!isEditingProfile ? (
                      <>
                        <h4 className="text-base font-black text-slate-900 uppercase tracking-tight mt-0.5">
                          {stagedProfile.candidateName}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono">
                          {stagedProfile.candidateTitle} • Archivo: {stagedProfile.fileName} ({stagedProfile.fileSize})
                        </p>
                      </>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="text-[10px] font-mono uppercase font-bold text-slate-500 block">Nombre del Postulante:</label>
                          <input
                            type="text"
                            value={stagedProfile.candidateName}
                            onChange={(e) => setStagedProfile({ ...stagedProfile, candidateName: e.target.value.toUpperCase() })}
                            className="w-full text-xs font-black uppercase px-2.5 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono uppercase font-bold text-slate-500 block">Título / Especialidad:</label>
                          <input
                            type="text"
                            value={stagedProfile.candidateTitle}
                            onChange={(e) => setStagedProfile({ ...stagedProfile, candidateTitle: e.target.value })}
                            className="w-full text-xs font-mono px-2.5 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right font-mono text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Rango Estimado:</span>
                  <strong className="text-emerald-700 text-sm font-black">
                    ${((stagedProfile.suggestedSalaryMin || 3800000) / 1000000).toFixed(1)}M - ${((stagedProfile.suggestedSalaryMax || 5400000) / 1000000).toFixed(1)}M CLP
                  </strong>
                </div>
              </div>

              {/* RARITY PILLARS CALLOUT IF AVAILABLE */}
              {stagedProfile.rarityPillars && stagedProfile.rarityPillars.length > 0 && (
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-black text-sm">★</span>
                      <span className="text-xs font-black uppercase tracking-wider text-amber-300 font-mono">
                        Convergencia Estratégica: Los 4 Pilares del Perfil Profesional
                      </span>
                    </div>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                      Índice: 99.8%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {stagedProfile.rarityPillars.map((pillar, pIdx) => (
                      <div key={pIdx} className="bg-white/5 border border-white/10 p-2.5 rounded-xl space-y-1">
                        <span className="text-[11px] font-black text-white block uppercase tracking-tight">
                          {pillar.title}
                        </span>
                        <p className="text-[10px] text-slate-300 leading-snug">
                          {pillar.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DETECTED SKILLS CHIPS */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-black text-slate-700 uppercase font-mono">
                    Competencias Identificadas en el Documento ({stagedProfile.extractedSkills.length}):
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Haz clic en ✕ para retirar o añade nuevas abajo
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {stagedProfile.extractedSkills.map((sk, idx) => (
                    <span
                      key={idx}
                      className="bg-white border border-slate-300 text-slate-800 text-[11px] font-bold font-mono px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs group hover:border-rose-400"
                    >
                      <span>✓ {sk}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(sk)}
                        className="text-slate-400 hover:text-rose-600 font-bold ml-1 text-xs"
                        title="Quitar habilidad"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                {/* ADD MANUAL SKILL */}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Agregar otra competencia clave (ej: Python, Power BI, CGR, Ley 19.886)..."
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                    className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    + Añadir
                  </button>
                </div>
              </div>

              {/* ACTION CONFIRM BUTTON */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadCristianCvPdf()}
                    className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-3 rounded-2xl font-bold font-mono uppercase transition-all cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Descargar PDF (1 Página ATS)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleConfirm}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  <UserCheck size={18} />
                  <span>Confirmar y Activar este CV</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default JobSearchCvModal;
