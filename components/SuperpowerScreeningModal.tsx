import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Zap, Copy, Check, X, MessageSquare, Plus, Trash2, 
  Clipboard, RefreshCw, Flame, ShieldCheck, CheckCircle2, 
  Award, HelpCircle, Layers, ArrowRight, ArrowLeft,
  Briefcase, FileText, Building2, RotateCcw,
  Download, AlertCircle, Edit3, CheckCircle, ChevronRight
} from 'lucide-react';
import { JobOffer } from '../types';
import { 
  RECRUITER_COMMON_QUESTIONS, 
  generateSuperpowerAnswer, 
  generateSuperpowerPitch,
  parsePastedQuestions,
  RecruiterQuestionTemplate,
  JobApplicationContext 
} from '../lib/superpowerJobAi';
import { downloadScreeningAnswersWord } from '../lib/wordManualsExport';

export interface FormQuestionItem {
  id: string;
  question: string;
  answer: string;
  isGenerating: boolean;
  isCopied: boolean;
  tone: 'EXECUTIVE' | 'QUANTITATIVE' | 'INNOVATOR';
}

type WizardStep = 1 | 2 | 3 | 4;

interface SuperpowerScreeningModalProps {
  isOpen: boolean;
  offer: JobOffer;
  onClose: () => void;
}

export const SuperpowerScreeningModal: React.FC<SuperpowerScreeningModalProps> = ({
  isOpen,
  offer,
  onClose
}) => {
  // Estado del Asistente por Pasos (Wizard)
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [step1Validated, setStep1Validated] = useState<boolean>(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Paso 1: Antecedentes del Puesto de Trabajo
  const [jobTitle, setJobTitle] = useState<string>(offer?.title || '');
  const [jobCompany, setJobCompany] = useState<string>(offer?.company || '');
  const [jobDescription, setJobDescription] = useState<string>(offer?.description || '');

  // Paso 2: Preguntas de la Postulación
  const [questions, setQuestions] = useState<FormQuestionItem[]>([
    {
      id: '1',
      question: '',
      answer: '',
      isGenerating: false,
      isCopied: false,
      tone: 'EXECUTIVE'
    }
  ]);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  // Modal para pegar bloque con múltiples preguntas
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [rawBatchText, setRawBatchText] = useState<string>('');
  
  // Modal de plantillas de reclutadores
  const [showPresetsDrawer, setShowPresetsDrawer] = useState<boolean>(false);

  // Paso 3 & 4: Estado de Generación y Copiado
  const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
  const [copyAllStatus, setCopyAllStatus] = useState<boolean>(false);
  const [wordExportStatus, setWordExportStatus] = useState<boolean>(false);

  // Pestaña auxiliar: Elevator Pitch (30s)
  const [showPitchModal, setShowPitchModal] = useState<boolean>(false);
  const [pitchText, setPitchText] = useState<string>('');
  const [isGeneratingPitch, setIsGeneratingPitch] = useState<boolean>(false);
  const [copiedPitch, setCopiedPitch] = useState<boolean>(false);

  // Sincronizar oferta cuando cambia
  useEffect(() => {
    if (offer) {
      setJobTitle(offer.title || '');
      setJobCompany(offer.company || '');
      setJobDescription(offer.description || '');
    }
  }, [offer]);

  if (!isOpen) return null;

  // Contexto dinámico unificado del cargo para la IA
  const getJobContext = (): JobApplicationContext => ({
    title: jobTitle.trim() || offer.title || 'Cargo sin especificar',
    company: jobCompany.trim() || offer.company || 'Empresa Empleadora',
    description: jobDescription.trim() || offer.description || '',
    portal: offer.portal,
    modality: offer.modality,
    salaryMin: offer.salaryMin,
    salaryMax: offer.salaryMax,
    requiredSkills: offer.requiredSkills,
  });

  // ===============================
  // VALIDACIONES Y NAVEGACIÓN PASO A PASO
  // ===============================

  // Validación de Paso 1
  const validateStep1 = (): boolean => {
    if (!jobTitle.trim()) {
      setStep1Error('Por favor ingresa o confirma el nombre del cargo al que postulas para asegurar que la IA estructure las respuestas con precisión.');
      return false;
    }
    setStep1Error(null);
    setStep1Validated(true);
    return true;
  };

  const handleGoToStep2 = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  // Validación de Paso 2
  const validateStep2 = (): boolean => {
    const validQuestions = questions.filter(q => q.question.trim().length > 0);
    if (validQuestions.length === 0) {
      setStep2Error('Por favor ingresa o pega al menos una pregunta que debas responder en la postulación.');
      return false;
    }
    setStep2Error(null);
    return true;
  };

  const handleGoToStep3 = async () => {
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    if (validateStep2()) {
      setCurrentStep(3);
      // Si ninguna tiene respuesta generada, auto-generar de forma asistida
      const needsGeneration = questions.some(q => q.question.trim().length > 0 && !q.answer.trim());
      if (needsGeneration) {
        handleGenerateAll();
      }
    }
  };

  const handleGoToStep4 = () => {
    const answeredCount = questions.filter(q => q.answer.trim().length > 0).length;
    if (answeredCount === 0) {
      // Intentar generar si no hay respuestas
      handleGenerateAll();
      return;
    }
    setCurrentStep(4);
  };

  // ===============================
  // MANEJADORES DE ANTECEDENTES (PASO 1)
  // ===============================
  const handlePasteClipboardToTitle = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setJobTitle(text.trim());
        setStep1Error(null);
      }
    } catch {}
  };

  const handlePasteClipboardToDescription = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) setJobDescription(text.trim());
    } catch {}
  };

  const handleResetJobContext = () => {
    setJobTitle(offer.title || '');
    setJobCompany(offer.company || '');
    setJobDescription(offer.description || '');
    setStep1Error(null);
  };

  // ===============================
  // MANEJADORES DE PREGUNTAS (PASO 2)
  // ===============================
  const handleUpdateQuestion = (id: string, text: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, question: text } : q));
    if (step2Error) setStep2Error(null);
  };

  const handleUpdateAnswer = (id: string, text: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, answer: text } : q));
  };

  const handleUpdateTone = (id: string, tone: 'EXECUTIVE' | 'QUANTITATIVE' | 'INNOVATOR') => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, tone } : q));
  };

  const handleSetGlobalTone = (tone: 'EXECUTIVE' | 'QUANTITATIVE' | 'INNOVATOR') => {
    setQuestions(prev => prev.map(q => ({ ...q, tone })));
  };

  const handleAddQuestion = (initialText = '') => {
    const newId = Date.now().toString();
    setQuestions(prev => [
      ...prev,
      {
        id: newId,
        question: initialText,
        answer: '',
        isGenerating: false,
        isCopied: false,
        tone: 'EXECUTIVE'
      }
    ]);
    if (step2Error) setStep2Error(null);
  };

  const handleRemoveQuestion = (id: string) => {
    if (questions.length <= 1) {
      setQuestions([{
        id: Date.now().toString(),
        question: '',
        answer: '',
        isGenerating: false,
        isCopied: false,
        tone: 'EXECUTIVE'
      }]);
      return;
    }
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handlePasteClipboardToItem = async (id: string) => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) return;

      const parsed = parsePastedQuestions(text);
      if (parsed.length > 1) {
        setQuestions(prev => {
          const index = prev.findIndex(q => q.id === id);
          if (index === -1) return prev;
          const updated = [...prev];
          updated[index] = { ...updated[index], question: parsed[0] };
          
          const extras: FormQuestionItem[] = parsed.slice(1).map((pQ, i) => ({
            id: `${Date.now()}_${i}`,
            question: pQ,
            answer: '',
            isGenerating: false,
            isCopied: false,
            tone: 'EXECUTIVE'
          }));
          return [...updated, ...extras];
        });
      } else {
        handleUpdateQuestion(id, text.trim());
      }
    } catch {}
  };

  // Pegado en bloque con auto-detección
  const handleProcessBatchText = () => {
    if (!rawBatchText.trim()) return;
    const parsed = parsePastedQuestions(rawBatchText);
    if (parsed.length === 0) return;

    const newItems: FormQuestionItem[] = parsed.map((qText, i) => ({
      id: `${Date.now()}_batch_${i}`,
      question: qText,
      answer: '',
      isGenerating: false,
      isCopied: false,
      tone: 'EXECUTIVE'
    }));

    setQuestions(newItems);
    setShowBatchModal(false);
    setRawBatchText('');
    setStep2Error(null);
  };

  // Añadir pregunta de plantilla frecuente
  const handleApplyPresetTemplate = (template: RecruiterQuestionTemplate) => {
    if (questions.length === 1 && !questions[0].question.trim()) {
      handleUpdateQuestion(questions[0].id, template.question);
    } else {
      handleAddQuestion(template.question);
    }
    setShowPresetsDrawer(false);
    setStep2Error(null);
  };

  // ===============================
  // GENERACIÓN CON IA (PASO 3)
  // ===============================
  const handleGenerateSingle = async (id: string) => {
    const target = questions.find(q => q.id === id);
    if (!target || !target.question.trim()) return;

    setQuestions(prev => prev.map(q => q.id === id ? { ...q, isGenerating: true } : q));

    try {
      const answer = await generateSuperpowerAnswer(getJobContext(), target.question, target.tone);
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, answer, isGenerating: false } : q));
    } catch {
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, isGenerating: false } : q));
    }
  };

  const handleGenerateAll = async () => {
    const pending = questions.filter(q => q.question.trim().length > 0);
    if (pending.length === 0) return;

    setIsGeneratingAll(true);
    setQuestions(prev => prev.map(q => q.question.trim() ? { ...q, isGenerating: true } : q));

    const currentContext = getJobContext();
    await Promise.all(
      pending.map(async (item) => {
        try {
          const answer = await generateSuperpowerAnswer(currentContext, item.question, item.tone);
          setQuestions(prev => prev.map(q => q.id === item.id ? { ...q, answer, isGenerating: false } : q));
        } catch {
          setQuestions(prev => prev.map(q => q.id === item.id ? { ...q, isGenerating: false } : q));
        }
      })
    );
    setIsGeneratingAll(false);
  };

  // ===============================
  // COPIADO Y EXPORTACIÓN (PASO 4)
  // ===============================
  const handleCopySingleAnswer = (id: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, isCopied: true } : q));
    setTimeout(() => {
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, isCopied: false } : q));
    }, 2500);
  };

  const handleCopyAllAnswers = () => {
    const answered = questions.filter(q => q.answer.trim().length > 0);
    if (answered.length === 0) return;

    const fullText = answered.map((item, idx) => 
      `PREGUNTA ${idx + 1}:\n${item.question}\n\nRESPUESTA (Cargo: ${jobTitle || offer.title} — ${jobCompany || offer.company}):\n${item.answer}\n`
    ).join('\n---\n\n');

    navigator.clipboard.writeText(fullText);
    setCopyAllStatus(true);
    setTimeout(() => setCopyAllStatus(false), 3000);
  };

  const handleDownloadWordDoc = () => {
    const answered = questions.filter(q => q.answer.trim().length > 0);
    if (answered.length === 0) return;

    downloadScreeningAnswersWord({
      jobTitle: jobTitle || offer.title || 'Cargo Postulado',
      companyName: jobCompany || offer.company || 'Empresa Empleadora',
      items: answered.map(item => ({
        question: item.question,
        answer: item.answer,
        tone: item.tone
      }))
    });

    setWordExportStatus(true);
    setTimeout(() => setWordExportStatus(false), 3500);
  };

  // Elevator Pitch modal
  const handleGeneratePitch = async () => {
    setIsGeneratingPitch(true);
    try {
      const pitch = await generateSuperpowerPitch(getJobContext());
      setPitchText(pitch);
    } finally {
      setIsGeneratingPitch(false);
    }
  };

  const handleCopyPitch = () => {
    if (!pitchText) return;
    navigator.clipboard.writeText(pitchText);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 3000);
  };

  // Cálculos de progreso del asistente
  const validQuestionsCount = questions.filter(q => q.question.trim().length > 0).length;
  const answeredQuestionsCount = questions.filter(q => q.answer.trim().length > 0).length;
  const isAnyGenerating = questions.some(q => q.isGenerating) || isGeneratingAll;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border-2 border-indigo-200 overflow-hidden my-auto flex flex-col max-h-[94vh]">
        
        {/* HEADER DEL ASISTENTE */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 border-b border-amber-400/30 shrink-0 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-radial from-amber-400/10 to-transparent pointer-events-none" />

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black font-mono px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 shadow-sm">
                  <Zap size={11} className="fill-slate-950" />
                  ASISTENTE DE POSTULACIÓN CON IA
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-black font-mono px-2.5 py-0.5 rounded-full">
                  ★ RAREZA PERFIL: 99.8%
                </span>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-700">
                  {offer.portal}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight truncate">
                {jobTitle || offer.title}
              </h2>

              <p className="text-xs text-amber-200/90 font-mono flex items-center gap-2 flex-wrap">
                <strong className="text-white">{jobCompany || offer.company}</strong>
                <span>•</span>
                <span>Match: <strong className="text-emerald-400">{offer.matchScore}%</strong></span>
                <span>•</span>
                <span>{offer.modality}</span>
                <span>•</span>
                <span className="text-amber-300">Renta Ref: ${(offer.salaryMin || 0).toLocaleString('es-CL')} - ${(offer.salaryMax || 0).toLocaleString('es-CL')} CLP</span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowPitchModal(true);
                  if (!pitchText) handleGeneratePitch();
                }}
                className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 px-3 py-1.5 rounded-xl text-[10px] font-black font-mono uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                title="Ver Elevator Pitch de 30 segundos para entrevista oral"
              >
                <Flame size={12} className="text-amber-400" />
                <span className="hidden sm:inline">Pitch (30s)</span>
              </button>

              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer shrink-0"
                title="Cerrar Asistente"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* BARRA DE PROGRESO DEL ASISTENTE (STEPPER INTERACTIVO) */}
          <div className="mt-5 pt-3.5 border-t border-white/10">
            <div className="grid grid-cols-4 gap-2 text-xs font-mono">
              {/* PASO 1 */}
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`flex items-center justify-center sm:justify-start gap-2 p-2 rounded-xl border transition-all text-left cursor-pointer ${
                  currentStep === 1
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                    : currentStep > 1
                    ? 'bg-white/10 text-emerald-300 border-emerald-400/40 hover:bg-white/15'
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                  currentStep === 1 
                    ? 'bg-slate-950 text-amber-400' 
                    : currentStep > 1 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {currentStep > 1 ? <Check size={11} /> : '1'}
                </div>
                <div className="hidden sm:block truncate">
                  <div className="text-[10px] uppercase font-bold tracking-tight">Paso 1</div>
                  <div className="text-[11px] truncate">Antecedentes</div>
                </div>
              </button>

              {/* PASO 2 */}
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setCurrentStep(2);
                }}
                className={`flex items-center justify-center sm:justify-start gap-2 p-2 rounded-xl border transition-all text-left cursor-pointer ${
                  currentStep === 2
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                    : currentStep > 2
                    ? 'bg-white/10 text-emerald-300 border-emerald-400/40 hover:bg-white/15'
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                  currentStep === 2 
                    ? 'bg-slate-950 text-amber-400' 
                    : currentStep > 2 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {currentStep > 2 ? <Check size={11} /> : '2'}
                </div>
                <div className="hidden sm:block truncate">
                  <div className="text-[10px] uppercase font-bold tracking-tight">Paso 2</div>
                  <div className="text-[11px] truncate">Preguntas ({validQuestionsCount})</div>
                </div>
              </button>

              {/* PASO 3 */}
              <button
                type="button"
                onClick={() => {
                  if (validateStep1() && validateStep2()) setCurrentStep(3);
                }}
                className={`flex items-center justify-center sm:justify-start gap-2 p-2 rounded-xl border transition-all text-left cursor-pointer ${
                  currentStep === 3
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                    : currentStep > 3
                    ? 'bg-white/10 text-emerald-300 border-emerald-400/40 hover:bg-white/15'
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                  currentStep === 3 
                    ? 'bg-slate-950 text-amber-400' 
                    : currentStep > 3 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {currentStep > 3 ? <Check size={11} /> : '3'}
                </div>
                <div className="hidden sm:block truncate">
                  <div className="text-[10px] uppercase font-bold tracking-tight">Paso 3</div>
                  <div className="text-[11px] truncate">Generación IA</div>
                </div>
              </button>

              {/* PASO 4 */}
              <button
                type="button"
                onClick={() => {
                  if (validateStep1() && validateStep2()) setCurrentStep(4);
                }}
                className={`flex items-center justify-center sm:justify-start gap-2 p-2 rounded-xl border transition-all text-left cursor-pointer ${
                  currentStep === 4
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                    : answeredQuestionsCount > 0
                    ? 'bg-white/10 text-emerald-300 border-emerald-400/40 hover:bg-white/15'
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                  currentStep === 4 
                    ? 'bg-slate-950 text-amber-400' 
                    : answeredQuestionsCount > 0 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {currentStep === 4 ? '4' : answeredQuestionsCount > 0 ? <Check size={11} /> : '4'}
                </div>
                <div className="hidden sm:block truncate">
                  <div className="text-[10px] uppercase font-bold tracking-tight">Paso 4</div>
                  <div className="text-[11px] truncate">Revisión & Word</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL POR PASOS DEL ASISTENTE */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-audit-scroll">

          {/* ========================================================= */}
          {/* PASO 1: ANTECEDENTES DEL PUESTO AL QUE POSTULAS */}
          {/* ========================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Tarjeta Guía del Asistente */}
              <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-amber-50 border-2 border-indigo-200 rounded-3xl p-5 space-y-2 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Briefcase size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black font-mono uppercase text-indigo-900 tracking-wider">
                      PASO 1 DE 4 • CONDICIONAMIENTO DE CONTEXTO
                    </span>
                    <h3 className="text-sm font-black uppercase text-slate-900 font-mono tracking-tight">
                      Validación de Antecedentes del Empleo
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">
                  Para minimizar errores y asegurar respuestas consistentes, el asistente condicionará cada argumento de la IA según el <strong>nombre exacto del cargo</strong>, la <strong>empresa empleadora</strong> y los <strong>requisitos del aviso</strong>, conectándolos directamente con los logros de tu CV real.
                </p>
              </div>

              {/* Mensaje de Error en Paso 1 si falta algún campo */}
              {step1Error && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center gap-3 text-rose-900 text-xs font-semibold animate-in shake">
                  <AlertCircle size={18} className="text-rose-600 shrink-0" />
                  <span>{step1Error}</span>
                </div>
              )}

              {/* Formulario de Antecedentes */}
              <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 flex-wrap">
                  <h4 className="text-xs font-black uppercase text-slate-900 font-mono flex items-center gap-2">
                    <FileText size={15} className="text-indigo-600" />
                    <span>Datos de la Postulación</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleResetJobContext}
                    className="text-[10px] font-mono text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer bg-white"
                    title="Restablecer antecedentes originales del aviso"
                  >
                    <RotateCcw size={11} />
                    <span>Restablecer Datos Originales</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* NOMBRE DEL CARGO */}
                  <div className="md:col-span-7 space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1">
                        <Briefcase size={12} className="text-indigo-600" />
                        Cargo al que Postulo <span className="text-rose-600">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handlePasteClipboardToTitle}
                        className="text-[10px] font-bold font-mono text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 transition-all"
                        title="Pegar cargo copiado del portapapeles"
                      >
                        <Clipboard size={11} /> Pegar
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={jobTitle}
                      onChange={(e) => {
                        setJobTitle(e.target.value);
                        if (step1Error) setStep1Error(null);
                      }}
                      placeholder="Ej: Ingeniero de Datos, Jefe de Control Interno, PMO..."
                      className={`w-full bg-slate-50 border-2 rounded-2xl px-4 py-3 text-xs font-black text-slate-900 focus:outline-none transition-all shadow-xs ${
                        !jobTitle.trim() ? 'border-amber-300 focus:border-indigo-600' : 'border-slate-200 focus:border-indigo-600 bg-white'
                      }`}
                    />
                  </div>

                  {/* EMPRESA O INSTITUCIÓN */}
                  <div className="md:col-span-5 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1 px-1">
                      <Building2 size={12} className="text-slate-500" />
                      Empresa o Empleador
                    </label>
                    <input
                      type="text"
                      value={jobCompany}
                      onChange={(e) => setJobCompany(e.target.value)}
                      placeholder="Ej: SGS Chile, Cencosud, Banco de Chile..."
                      className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none transition-all shadow-xs focus:bg-white"
                    />
                  </div>

                  {/* DESCRIPCIÓN Y REQUISITOS DEL PUESTO */}
                  <div className="md:col-span-12 space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1">
                        <FileText size={12} className="text-indigo-600" />
                        Descripción del Puesto & Requisitos del Aviso
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {jobDescription.length} caracteres
                        </span>
                        <button
                          type="button"
                          onClick={handlePasteClipboardToDescription}
                          className="text-[10px] font-bold font-mono text-indigo-700 hover:text-indigo-950 flex items-center gap-1 cursor-pointer bg-indigo-100/70 hover:bg-indigo-100 px-2.5 py-0.5 rounded-lg border border-indigo-200 transition-all"
                          title="Pegar descripción copiada del aviso"
                        >
                          <Clipboard size={11} /> Pegar Descripción
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={4}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Pega aquí la descripción del puesto, responsabilidades o requisitos del aviso (Ej: 'Buscamos profesional para liderar canalizaciones de datos, automatización de procesos e integración con modelos analíticos...'). Cuanta más información pegues, más sólida será la respuesta de la IA."
                      className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 rounded-2xl p-3.5 text-xs text-slate-800 font-medium focus:outline-none transition-all placeholder:text-slate-400 leading-relaxed shadow-xs focus:bg-white"
                    />
                  </div>
                </div>

                {/* Tarjeta de Diagnóstico y Blindaje de Datos */}
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3">
                  <ShieldCheck size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-emerald-950 leading-relaxed">
                    <strong>Blindaje de Datos Activo:</strong> La IA utilizará los antecedentes de este puesto para calibrar los hitos de tu CV (<strong>$2.000M CLP en Essity</strong>, <strong>0 observaciones CMF en 1.849 propiedades</strong> y <strong>desarrollo del software AssetFlow con IA</strong>).
                  </div>
                </div>
              </div>

              {/* BOTONERA INFERIOR PASO 1 */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-mono font-bold uppercase transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleGoToStep2}
                  className="bg-[#002D62] hover:bg-[#001D42] text-white px-6 py-3 rounded-2xl text-xs font-black font-mono uppercase tracking-wider transition-all flex items-center gap-2 shadow-md active:scale-95 cursor-pointer"
                >
                  <span>Siguiente: Ingresar Preguntas</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASO 2: CAPTURA & FORMULACIÓN DE PREGUNTAS */}
          {/* ========================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Tarjeta Guía del Asistente */}
              <div className="bg-gradient-to-r from-amber-50 via-indigo-50 to-sky-50 border-2 border-amber-200 rounded-3xl p-5 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black font-mono uppercase text-amber-900 tracking-wider">
                        PASO 2 DE 4 • CAPTURA ASISTIDA DE PREGUNTAS
                      </span>
                      <h3 className="text-sm font-black uppercase text-slate-900 font-mono tracking-tight">
                        Preguntas que Debes Responder en la Postulación
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowBatchModal(true)}
                      className="bg-white hover:bg-slate-50 text-indigo-900 border border-indigo-200 px-3 py-1.5 rounded-xl text-[10px] font-black font-mono uppercase transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Pegar varias preguntas copiadas juntas"
                    >
                      <Layers size={12} className="text-indigo-600" />
                      Pegar Bloque Múltiple
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPresetsDrawer(true)}
                      className="bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 px-3 py-1.5 rounded-xl text-[10px] font-black font-mono uppercase transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Insertar preguntas típicas de selección laboral en Chile"
                    >
                      <HelpCircle size={12} className="text-amber-700" />
                      Preguntas Frecuentes
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-sans">
                  Pega las preguntas directamente desde el portal (Laborum, Chiletrabajos, Computrabajo o LinkedIn). Puedes ingresar preguntas individuales o usar el botón <strong>Pegar Bloque Múltiple</strong>.
                </p>

                {/* Calibrador de Tono Global */}
                <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60 flex-wrap text-xs">
                  <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">Tono Global para Todas:</span>
                  <button
                    type="button"
                    onClick={() => handleSetGlobalTone('EXECUTIVE')}
                    className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition-all cursor-pointer"
                  >
                    👔 Ejecutivo & Humanizado
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetGlobalTone('QUANTITATIVE')}
                    className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition-all cursor-pointer"
                  >
                    📊 Cifras ($2.000M / Cero Obs.)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetGlobalTone('INNOVATOR')}
                    className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition-all cursor-pointer"
                  >
                    ⚡ Perfil Híbrido & IA
                  </button>
                </div>
              </div>

              {/* Mensaje de Error si falta preguntas */}
              {step2Error && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center gap-3 text-rose-900 text-xs font-semibold animate-in shake">
                  <AlertCircle size={18} className="text-rose-600 shrink-0" />
                  <span>{step2Error}</span>
                </div>
              )}

              {/* LISTADO DE PREGUNTAS INDIVIDUALES */}
              <div className="space-y-4">
                {questions.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-white border-2 border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3 shadow-xs hover:border-indigo-300 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#002D62] text-white font-mono font-black text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-black font-mono uppercase text-slate-800">
                          Pregunta de Postulación #{index + 1}
                        </span>
                        {item.question.trim().length > 0 && (
                          <span className="bg-emerald-100 text-emerald-900 text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border border-emerald-300">
                            Lista para generar
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Selector de Tono Individual */}
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-[10px] font-mono">
                          <span className="text-slate-500 font-bold px-1 hidden sm:inline">Tono:</span>
                          {(['EXECUTIVE', 'QUANTITATIVE', 'INNOVATOR'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => handleUpdateTone(item.id, t)}
                              className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                                item.tone === t
                                  ? 'bg-[#002D62] text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {t === 'EXECUTIVE' ? 'Ejecutivo' : t === 'QUANTITATIVE' ? 'Cifras' : 'IA'}
                            </button>
                          ))}
                        </div>

                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition-all cursor-pointer"
                            title="Eliminar esta pregunta"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <textarea
                        rows={2}
                        value={item.question}
                        onChange={(e) => handleUpdateQuestion(item.id, e.target.value)}
                        placeholder="Pega aquí la pregunta de la postulación (Ej: '¿Cuáles han sido tus mayores logros en optimización de operaciones y control?', '¿Cuál es tu pretensión de renta y disponibilidad?')..."
                        className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 rounded-2xl p-3.5 pr-28 text-xs font-semibold text-slate-900 focus:outline-none transition-all placeholder:text-slate-400 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handlePasteClipboardToItem(item.id)}
                        className="absolute right-2.5 top-2.5 bg-white hover:bg-indigo-50 text-indigo-900 border border-slate-200 hover:border-indigo-300 px-2.5 py-1.5 rounded-xl text-[10px] font-black font-mono uppercase transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                        title="Pegar texto copiado del portapapeles"
                      >
                        <Clipboard size={12} />
                        <span>Pegar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón para Agregar otra pregunta */}
              <div className="flex items-center justify-center pt-2">
                <button
                  type="button"
                  onClick={() => handleAddQuestion('')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-dashed border-slate-300 hover:border-indigo-400 px-5 py-2.5 rounded-2xl text-xs font-mono font-black uppercase transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus size={15} />
                  <span>Agregar Otra Pregunta</span>
                </button>
              </div>

              {/* BOTONERA INFERIOR PASO 2 */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Volver a Antecedentes</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoToStep3}
                  className="bg-[#002D62] hover:bg-[#001D42] text-white px-6 py-3 rounded-2xl text-xs font-black font-mono uppercase tracking-wider transition-all flex items-center gap-2 shadow-md active:scale-95 cursor-pointer"
                >
                  <span>Siguiente: Generar con IA ({validQuestionsCount})</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASO 3: GENERACIÓN ASISTIDA CON IA */}
          {/* ========================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Tarjeta Guía del Asistente */}
              <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 border-2 border-indigo-200 rounded-3xl p-5 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <Sparkles size={16} className="text-amber-300" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black font-mono uppercase text-indigo-900 tracking-wider">
                        PASO 3 DE 4 • GENERACIÓN Y CALIBRACIÓN ASISTIDA
                      </span>
                      <h3 className="text-sm font-black uppercase text-slate-900 font-mono tracking-tight">
                        Estructurando Respuestas Fundamentadas con IA
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleGenerateAll}
                      disabled={isAnyGenerating}
                      className="bg-[#002D62] hover:bg-[#001D42] text-white px-4 py-2 rounded-xl text-xs font-black font-mono uppercase transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw size={13} className={isAnyGenerating ? 'animate-spin' : ''} />
                      {isAnyGenerating ? 'Generando...' : 'Regenerar Todas'}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-sans">
                  El motor del asistente está estructurando cada respuesta para <strong>{jobTitle || offer.title}</strong> en <strong>{jobCompany || offer.company}</strong>, enlazando tus antecedentes y los datos duros de tu CV.
                </p>

                {/* Barra de progreso de generación */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-700 mb-1">
                    <span>Progreso de Generación:</span>
                    <span>{answeredQuestionsCount} de {validQuestionsCount} completadas</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-indigo-600 to-emerald-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${validQuestionsCount > 0 ? (answeredQuestionsCount / validQuestionsCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* LISTADO DE PREGUNTAS CON RESPUESTA GENERADA */}
              <div className="space-y-5">
                {questions.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-white border-2 border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm"
                  >
                    {/* Header de la Pregunta */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 flex-wrap">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono font-black text-[10px] flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-[10px] font-black font-mono uppercase text-slate-500 tracking-wider">
                            Pregunta #{index + 1} • Tono: {item.tone}
                          </span>
                          {item.answer && !item.isGenerating && (
                            <span className="bg-emerald-100 text-emerald-900 text-[9px] font-black font-mono px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 size={10} className="text-emerald-700" /> Lista
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-black text-slate-900 font-mono">
                          {item.question || '(Pregunta sin texto)'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleGenerateSingle(item.id)}
                        disabled={item.isGenerating || !item.question.trim()}
                        className="bg-slate-100 hover:bg-indigo-50 text-indigo-950 border border-slate-200 px-3 py-1.5 rounded-xl text-[10px] font-black font-mono uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Regenerar solo esta respuesta"
                      >
                        <RefreshCw size={11} className={item.isGenerating ? 'animate-spin' : ''} />
                        <span>{item.isGenerating ? 'Generando...' : 'Regenerar'}</span>
                      </button>
                    </div>

                    {/* Área de la Respuesta Generada */}
                    {item.isGenerating ? (
                      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto" />
                        <div className="text-xs font-bold font-mono text-slate-800">
                          Estructurando respuesta con IA para {jobTitle}...
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Indexando CV de Cristian Muñoz: logros Essity ($2.000M) & CMF (0 observaciones)
                        </div>
                      </div>
                    ) : item.answer ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1">
                          <span className="font-bold uppercase text-indigo-950 flex items-center gap-1">
                            <Sparkles size={11} className="text-amber-500" />
                            Respuesta Estructurada por el Asistente:
                          </span>
                          <span>{item.answer.length} caracteres • Editable</span>
                        </div>
                        <textarea
                          rows={6}
                          value={item.answer}
                          onChange={(e) => handleUpdateAnswer(item.id, e.target.value)}
                          className="w-full p-4 bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-indigo-600 rounded-2xl text-xs font-mono text-slate-900 leading-relaxed outline-none transition-all shadow-inner"
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleCopySingleAnswer(item.id, item.answer)}
                            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black font-mono uppercase transition-all flex items-center gap-1.5 cursor-pointer border ${
                              item.isCopied
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                            }`}
                          >
                            {item.isCopied ? <Check size={12} /> : <Copy size={12} />}
                            <span>{item.isCopied ? '¡Copiado con Éxito!' : 'Copiar Esta Respuesta'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900">
                        <span>Aún no se ha generado la respuesta para esta pregunta.</span>
                        <button
                          type="button"
                          onClick={() => handleGenerateSingle(item.id)}
                          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black font-mono px-3 py-1.5 rounded-xl uppercase text-[10px]"
                        >
                          Generar Ahora
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* BOTONERA INFERIOR PASO 3 */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Volver a Preguntas</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoToStep4}
                  disabled={answeredQuestionsCount === 0}
                  className="bg-[#002D62] hover:bg-[#001D42] text-white px-6 py-3 rounded-2xl text-xs font-black font-mono uppercase tracking-wider transition-all flex items-center gap-2 shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <span>Siguiente: Revisión & Exportación ({answeredQuestionsCount})</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASO 4: REVISIÓN, COPIADO RÁPIDO & EXPORTACIÓN A WORD */}
          {/* ========================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Tarjeta de Resumen y Acciones Principales */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl border-2 border-amber-300/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black font-mono uppercase text-amber-300 tracking-wider flex items-center gap-1">
                      <CheckCircle size={12} className="text-emerald-400" />
                      PASO 4 DE 4 • CUESTIONARIO FINALIZADO Y BLINDADO
                    </span>
                    <h3 className="text-base sm:text-lg font-black uppercase text-white font-mono tracking-tight">
                      Cuestionario Listo para Postular en Portales
                    </h3>
                    <p className="text-xs text-slate-300 font-sans">
                      {answeredQuestionsCount} respuestas fundamentadas para <strong>{jobTitle}</strong> en <strong>{jobCompany}</strong>.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Botón Descargar en Word */}
                    <button
                      type="button"
                      onClick={handleDownloadWordDoc}
                      className="bg-sky-500 hover:bg-sky-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black font-mono uppercase transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                      title="Descargar documento Microsoft Word (.DOC) con membrete y respuestas"
                    >
                      <Download size={14} />
                      <span>{wordExportStatus ? '¡Descargado!' : 'Descargar en Word (.DOC)'}</span>
                    </button>

                    {/* Botón Copiar Todo */}
                    <button
                      type="button"
                      onClick={handleCopyAllAnswers}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black font-mono uppercase transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer border ${
                        copyAllStatus
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300'
                      }`}
                      title="Copiar todas las preguntas y respuestas para pegar en el formulario de postulación"
                    >
                      {copyAllStatus ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copyAllStatus ? '¡Todo Copiado!' : 'Copiar Todas'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* LISTA COMPLETA DE PREGUNTAS Y RESPUESTAS REVISADAS */}
              <div className="space-y-4">
                {questions.filter(q => q.answer.trim().length > 0).map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-white border-2 border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs hover:border-indigo-300 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-100 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#002D62] text-white font-mono font-black text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-black font-mono uppercase text-slate-900">
                          {item.question}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopySingleAnswer(item.id, item.answer)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black font-mono uppercase transition-all flex items-center gap-1.5 cursor-pointer border ${
                          item.isCopied
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                        }`}
                      >
                        {item.isCopied ? <Check size={12} /> : <Copy size={12} />}
                        <span>{item.isCopied ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <textarea
                        rows={5}
                        value={item.answer}
                        onChange={(e) => handleUpdateAnswer(item.id, e.target.value)}
                        className="w-full p-4 bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-indigo-600 rounded-2xl text-xs font-mono text-slate-900 leading-relaxed outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* BOTONERA INFERIOR PASO 4 */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Volver a Calibración IA</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      setQuestions([{
                        id: Date.now().toString(),
                        question: '',
                        answer: '',
                        isGenerating: false,
                        isCopied: false,
                        tone: 'EXECUTIVE'
                      }]);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Nueva Postulación</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-[#002D62] hover:bg-[#001D42] text-white px-6 py-2.5 rounded-xl text-xs font-black font-mono uppercase transition-all cursor-pointer shadow-sm"
                  >
                    Finalizar y Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER GENERAL DEL MODAL */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 shrink-0 flex items-center justify-between text-[11px] text-slate-500 font-mono flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Asistente Guiado Anti-Errores • Candidato: Cristian Andrés Muñoz Rojas</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Paso {currentStep} de 4</span>
            <span>•</span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-700 hover:text-slate-900 font-bold uppercase underline cursor-pointer"
            >
              Cerrar Asistente
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL / DRAWER AUXILIAR: PEGAR BLOQUE MÚLTIPLE */}
      {/* ========================================================= */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[250] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border-2 border-indigo-300 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-900 rounded-xl">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black font-mono uppercase text-slate-900">
                    Pegar Bloque Múltiple de Preguntas
                  </h3>
                  <p className="text-[11px] text-slate-500 font-sans">
                    El asistente detectará automáticamente los saltos de línea y numeraciones.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              rows={8}
              value={rawBatchText}
              onChange={(e) => setRawBatchText(e.target.value)}
              placeholder={`Pega aquí varias preguntas juntas copiada del aviso, por ejemplo:\n\n1. ¿Cuál es tu experiencia en auditoría y control de operaciones?\n2. ¿Qué proyectos de automatización o IA has desarrollado?\n3. ¿Cuáles son tus pretensiones de renta y disponibilidad?`}
              className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 rounded-2xl text-xs font-mono text-slate-900 outline-none focus:bg-white"
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setRawBatchText(text);
                  } catch {}
                }}
                className="text-[11px] font-mono font-bold text-indigo-700 hover:text-indigo-950 flex items-center gap-1 cursor-pointer"
              >
                <Clipboard size={12} /> Pegar desde Portapapeles
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-3.5 py-2 text-xs font-mono font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleProcessBatchText}
                  disabled={!rawBatchText.trim()}
                  className="bg-[#002D62] hover:bg-[#001D42] text-white px-5 py-2 rounded-xl text-xs font-black font-mono uppercase disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  Procesar y Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL / DRAWER AUXILIAR: PREGUNTAS FRECUENTES DE PORTALES */}
      {/* ========================================================= */}
      {showPresetsDrawer && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[250] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border-2 border-amber-300 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <HelpCircle size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black font-mono uppercase text-slate-900">
                    Preguntas Frecuentes de Portales de Selección en Chile
                  </h3>
                  <p className="text-[11px] text-slate-500 font-sans">
                    Haz clic en cualquier pregunta para agregarla directamente a tu postulación.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPresetsDrawer(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1 custom-audit-scroll">
              {RECRUITER_COMMON_QUESTIONS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleApplyPresetTemplate(item)}
                  className="p-3.5 bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-300 rounded-2xl transition-all cursor-pointer space-y-1 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black font-mono uppercase text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      {item.category}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <span>Insertar</span>
                      <ArrowRight size={11} />
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 font-mono">
                    {item.question}
                  </p>
                  <p className="text-[11px] text-slate-500 font-sans">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowPresetsDrawer(false)}
                className="px-4 py-2 text-xs font-mono font-bold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL AUXILIAR: ELEVATOR PITCH (30S) */}
      {/* ========================================================= */}
      {showPitchModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[250] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border-2 border-amber-400 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-950 rounded-xl">
                  <Flame size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black font-mono uppercase text-slate-900">
                    Elevator Pitch de 30 Segundos
                  </h3>
                  <p className="text-[11px] text-slate-500 font-sans">
                    Discurso verbal de alto impacto calibrado para {jobTitle || offer.title}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPitchModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {isGeneratingPitch ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl space-y-2">
                <RefreshCw size={24} className="animate-spin text-amber-500 mx-auto" />
                <div className="text-xs font-bold font-mono text-slate-800">Generando Elevator Pitch...</div>
              </div>
            ) : (
              <textarea
                rows={7}
                value={pitchText}
                onChange={(e) => setPitchText(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-mono text-slate-900 leading-relaxed outline-none"
              />
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleGeneratePitch}
                disabled={isGeneratingPitch}
                className="text-[11px] font-mono font-bold text-indigo-700 hover:text-indigo-950 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} className={isGeneratingPitch ? 'animate-spin' : ''} />
                <span>Regenerar Pitch</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPitch}
                  disabled={!pitchText}
                  className={`px-4 py-2 rounded-xl text-xs font-black font-mono uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                    copiedPitch
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  }`}
                >
                  {copiedPitch ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedPitch ? '¡Copiado!' : 'Copiar Pitch'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPitchModal(false)}
                  className="px-3.5 py-2 text-xs font-mono font-bold text-slate-600 hover:text-slate-900"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SuperpowerScreeningModal;
