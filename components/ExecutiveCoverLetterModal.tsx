import React, { useState } from 'react';
import { 
  FileText, Download, Copy, Check, X, Sparkles, Building2, 
  Briefcase, User, RefreshCw, ShieldCheck, CheckCircle2, Award 
} from 'lucide-react';
import { downloadExecutiveCoverLetterWord } from '../lib/wordManualsExport';

interface ExecutiveCoverLetterModalProps {
  onClose: () => void;
  initialCompany?: string;
  initialPosition?: string;
  initialRecipient?: string;
}

export const ExecutiveCoverLetterModal: React.FC<ExecutiveCoverLetterModalProps> = ({
  onClose,
  initialCompany = '[Nombre de la Empresa o Institución]',
  initialPosition = '[Cargo / Posición a la que Postula]',
  initialRecipient = 'Estimada Gerencia de Selección / Comité de Búsqueda'
}) => {
  const [companyName, setCompanyName] = useState(initialCompany);
  const [jobPosition, setJobPosition] = useState(initialPosition);
  const [recipientName, setRecipientName] = useState(initialRecipient);
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const candidateName = 'CRISTIAN ANDRÉS MUÑOZ ROJAS';
  const candidateTitle = 'Ingeniero Civil Industrial';
  const email = 'cristian.munoz0223@gmail.com';
  const phone = '+56 9 6143 6853';
  const location = 'Santiago, Chile';
  const linkedin = 'www.linkedin.com/in/cristian-muñoz-3a747258';

  const currentDateFormatted = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Standard text formatted for direct copying or reading
  const plainTextLetter = `${candidateName}
${candidateTitle}
📍 ${location} | ✉️ ${email} | 📞 ${phone} | 🔗 ${linkedin}

Santiago de Chile, ${currentDateFormatted}

Señores / Señoras:
${recipientName}
${companyName}

REF: Postulación al cargo de ${jobPosition} — Propuesta de Valor y Antecedentes Profesionales

Estimados integrantes del Comité de Selección y Liderazgo de ${companyName}:

Me dirijo a ustedes con el propósito de presentar formalmente mi candidatura para el cargo de ${jobPosition}. Mi motivación profesional nace de la profunda convicción de que los mayores saltos de rentabilidad y excelencia en una organización no provienen de discursos teóricos, sino de la sincronización exacta entre la estrategia financiera directiva, la disciplina operativa en terreno y la adopción inteligente de herramientas tecnológicas de vanguardia.

Si tuviera que resumir la particularidad de mi trayectoria, radica en un perfil híbrido de muy baja frecuencia en el mercado: soy un Ingeniero Civil Industrial formado con rigurosidad en optimización de operaciones y control interno, que no se limita a auditar o diagnosticar cuellos de botella desde un escritorio, sino que concibe, diseña y programa soluciones de software y automatizaciones de grado empresarial utilizando la Inteligencia Artificial Generativa como multiplicador de fuerza. Esta combinación me permite actuar como un puente de alto rendimiento entre la alta dirección, los equipos operativos y la tecnología, resolviendo problemas estructurales en cuestión de semanas en lugar de esperar costosos ciclos de consultoría externa.

Respaldan esta propuesta hitos de gestión cuantitativos y verificables:

1. CONTROL INTERNO Y AUDITORÍA CERO OBSERVACIONES (Sector Inmobiliario / Financiero):
Lideré el control interno y la valoración patrimonial de un portafolio de 1.849 propiedades valorizado en UF 30.300 ($1.146M CLP), logrando el hito de cero (0) observaciones de auditoría ante la Comisión para el Mercado Financiero (CMF). Para erradicar la vulnerabilidad del "siempre se ha hecho así", concebí y supervisé el despliegue del sistema AssetFlow, plataforma que automatiza la reportería CMF (B13, B4, Nota 14), la prevención de lavado de activos (UAF/PEP) y el cálculo tributario de exenciones de arriendo según el D.L. 825 Art. 8° letra g).

2. CERO DIFERENCIAS DE INVENTARIO Y OPTIMIZACIÓN DE CAPITAL (Essity Chile - Manufactura Continua):
Reduje las discrepancias de inventario a cero y las mantuve en $0 diferencias por más de 10 meses consecutivos en bodegas críticas de repuestos que bordeaban las UF 158.000 ($6.000M CLP), instaurando un régimen riguroso de inventarios rotativos aleatorios (IRA). Asimismo, liberé más de UF 53.000 ($2.000M CLP) en capital de trabajo sin comprometer la continuidad operacional, mediante negociación estratégica de acuerdos marco con proveedores y planificación colaborativa S&OP.

3. CULTURA OPERATIVA Y ACOMPAÑAMIENTO EN TERRENO:
Mi estilo de liderazgo combina la exigencia analítica con la empatía formativa. Implementé protocolos de acompañamiento en terreno ("Sombra") para capacitar a ejecutivos, desarticular malas prácticas arraigadas y sustituirlas por cuadros de mando en tiempo real que devuelven la autonomía y el orgullo por el trabajo bien ejecutado.

Al incorporarme a ${companyName}, mi aporte inmediato no será únicamente la gestión eficaz de la rutina del cargo, sino la capacidad de:
• Eliminar puntos ciegos operacionales y blindar a la institución frente a riesgos normativos, fiscales o de auditoría interna y externa.
• Acelerar la transformación digital interna sin costos desmedidos, traduciendo requerimientos de negocio en herramientas concretas gracias a mi dominio práctico de la IA Generativa aplicada y metodologías ágiles.
• Optimizar costos y recursos de capital con el rigor de la ingeniería civil industrial y el enfoque Lean Six Sigma, asegurando que cada peso invertido maximice el margen operativo.
• Construir equipos comprometidos y de alto estándar, capaces de sostener los resultados en el tiempo mediante procesos estandarizados y medibles.

Agradeciendo de antemano el tiempo dedicado a revisar estos antecedentes y mi Currículum Vitae adjunto, manifiesto mi total disponibilidad para sostener una entrevista personal o técnica en la oportunidad que estimen conveniente.

Le saluda atentamente,

${candidateName}
${candidateTitle}
Teléfono: ${phone} | Email: ${email}
${location}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(plainTextLetter).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3500);
    });
  };

  const handleDownloadWord = () => {
    downloadExecutiveCoverLetterWord({
      companyName,
      jobPosition,
      recipientName,
      candidateName,
      candidateTitle,
      email,
      phone,
      linkedin,
      city: location
    });
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* HEADER MODAL */}
        <div className="bg-[#002D62] text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-300 rounded-xl border border-sky-400/30">
              <FileText size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-300 font-mono">
                DOCUMENTO EJECUTIVO ATS • WORD EDITABLE (.DOC)
              </span>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                Carta de Presentación Estándar
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* CUSTOMIZATION CONTROLS */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            Personalizar datos de postulación para descarga y copiado:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Cargo / Posición:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={jobPosition}
                  onChange={(e) => setJobPosition(e.target.value)}
                  placeholder="Ej. Jefe de Control Interno / Operaciones"
                  className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                />
                <Briefcase size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Empresa / Institución:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ej. SGS Chile / Cencosud"
                  className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                />
                <Building2 size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Destinatario / Comité:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ej. Gerencia de Personas y Atracción de Talento"
                  className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                />
                <User size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Quick Preset Shortcuts */}
          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-200/70 flex-wrap">
            <span className="text-[10px] font-black text-slate-500 font-mono uppercase tracking-wider">Atajos Rápidos:</span>
            <button
              type="button"
              onClick={() => {
                setJobPosition('Ingeniero de Datos / Data Engineer & Automatización');
                setCompanyName('SGS Chile');
                setRecipientName('Comité de Selección & Gerencia de Datos y Tecnología - SGS Chile');
              }}
              className="text-[11px] font-bold px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              title="Cargar automáticamente datos de postulación para SGS en Ingeniería de Datos"
            >
              <Sparkles size={12} className="text-amber-600" />
              🏢 SGS Chile — Ingeniería de Datos
            </button>
            <button
              type="button"
              onClick={() => {
                setJobPosition('Jefe de Departamento de Auditoría & Control');
                setCompanyName('Tesorería General de la República (TGR)');
                setRecipientName('Comité de Selección - Ministerio de Hacienda / TGR');
              }}
              className="text-[11px] font-bold px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              🏛️ TGR — Auditoría & Control
            </button>
          </div>
        </div>

        {/* DOCUMENT PREVIEW CONTAINER */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 space-y-6 text-sm font-sans leading-relaxed selection:bg-sky-100">
          
          {/* Header Block in Word Style */}
          <div className="border-b-2 border-[#002D62] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#002D62] uppercase">
                {candidateName}
              </h1>
              <p className="text-sm font-bold text-sky-700">
                {candidateTitle}
              </p>
            </div>
            <div className="text-[11px] text-slate-600 sm:text-right font-medium">
              <div>📍 {location} &nbsp;|&nbsp; ✉️ {email}</div>
              <div>📞 {phone} &nbsp;|&nbsp; 🔗 {linkedin}</div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500 font-medium">
            Santiago de Chile, {currentDateFormatted}
          </div>

          {/* Recipient */}
          <div className="text-xs text-slate-800 space-y-0.5">
            <p className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Destinatario:</p>
            <p className="font-bold text-sm text-slate-900">{recipientName}</p>
            <p className="font-semibold text-slate-700">{companyName}</p>
          </div>

          {/* Subject Line */}
          <div className="p-3 bg-slate-100 border-l-4 border-[#002D62] text-xs font-bold text-[#002D62] rounded-r-lg">
            REF: Postulación al cargo de {jobPosition} — Propuesta de Valor y Antecedentes Profesionales
          </div>

          {/* Letter Body */}
          <div className="space-y-4 text-xs sm:text-[13px] text-slate-800 text-justify leading-relaxed">
            <p>
              Estimados integrantes del Comité de Selección y Liderazgo de <strong>{companyName}</strong>:
            </p>

            <p>
              Me dirijo a ustedes con el propósito de presentar formalmente mi candidatura para el cargo de <strong>{jobPosition}</strong>. Mi motivación profesional nace de la profunda convicción de que los mayores saltos de rentabilidad y excelencia en una organización no provienen de discursos teóricos, sino de la sincronización exacta entre la estrategia financiera directiva, la disciplina operativa en terreno y la adopción inteligente de herramientas tecnológicas de vanguardia.
            </p>

            <p className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-100">
              Si tuviera que resumir la particularidad de mi trayectoria, radica en un <strong>perfil híbrido de muy baja frecuencia en el mercado</strong>: soy un <strong>Ingeniero Civil Industrial</strong> formado con rigurosidad en optimización de operaciones y control interno, que no se limita a auditar o diagnosticar cuellos de botella desde un escritorio, sino que <strong>concibe, diseña y programa soluciones de software y automatizaciones de grado empresarial utilizando la Inteligencia Artificial Generativa como multiplicador de fuerza</strong>. Esta combinación me permite actuar como un puente de alto rendimiento entre la alta dirección, los equipos operativos y la tecnología, resolviendo problemas estructurales en cuestión de semanas en lugar de esperar costosos ciclos de consultoría externa.
            </p>

            {/* Achievements Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 border-l-4 border-l-[#002D62] rounded-r-xl space-y-2.5">
              <p className="font-bold text-xs text-[#002D62]">
                Respaldan esta propuesta hitos de gestión cuantitativos y verificables:
              </p>
              <ul className="space-y-2 pl-4 list-disc text-slate-700">
                <li>
                  <strong>Control Interno y Auditoría Cero Observaciones (Sector Inmobiliario / Financiero):</strong> Lideré el control interno y la valoración patrimonial de un portafolio de 1.849 propiedades valorizado en UF 30.300 ($1.146M CLP), logrando el hito de <strong>cero (0) observaciones de auditoría ante la Comisión para el Mercado Financiero (CMF)</strong>. Para erradicar la vulnerabilidad del "siempre se ha hecho así", concebí y supervisé el despliegue del sistema <em>AssetFlow</em>, plataforma que automatiza la reportería CMF (B13, B4, Nota 14), la prevención de lavado de activos (UAF/PEP) y el cálculo tributario de exenciones de arriendo según el D.L. 825 Art. 8° letra g).
                </li>
                <li>
                  <strong>Cero Diferencias de Inventario y Optimización de Capital (Essity Chile - Manufactura Continua):</strong> Reduje las discrepancias de inventario a cero y las mantuve en <strong>$0 diferencias por más de 10 meses consecutivos</strong> en bodegas críticas de repuestos que bordeaban las UF 158.000 ($6.000M CLP), instaurando un régimen riguroso de inventarios rotativos aleatorios (IRA). Asimismo, <strong>liberé más de UF 53.000 ($2.000M CLP) en capital de trabajo</strong> sin comprometer la continuidad operacional, mediante negociación estratégica de acuerdos marco con proveedores y planificación colaborativa S&OP.
                </li>
                <li>
                  <strong>Cultura Operativa y Acompañamiento en Terreno:</strong> Mi estilo de liderazgo combina la exigencia analítica con la empatía formativa. Implementé protocolos de acompañamiento en terreno ("Sombra") para capacitar a ejecutivos, desarticular malas prácticas arraigadas y sustituirlas por cuadros de mando en tiempo real que devuelven la autonomía y el orgullo por el trabajo bien ejecutado.
                </li>
              </ul>
            </div>

            <p>
              Al incorporarme a <strong>{companyName}</strong>, mi aporte inmediato no será únicamente la gestión eficaz de la rutina del cargo, sino la capacidad de:
            </p>

            <ul className="space-y-1.5 pl-5 list-disc text-slate-700">
              <li><strong>Eliminar puntos ciegos operacionales</strong> y blindar a la institución frente a riesgos normativos, fiscales o de auditoría interna y externa.</li>
              <li><strong>Acelerar la transformación digital interna sin costos desmedidos</strong>, traduciendo requerimientos de negocio en herramientas concretas gracias a mi dominio práctico de la IA Generativa aplicada y metodologías ágiles.</li>
              <li><strong>Optimizar costos y recursos de capital</strong> con el rigor de la ingeniería civil industrial y el enfoque Lean Six Sigma, asegurando que cada peso invertido maximice el margen operativo.</li>
              <li><strong>Construir equipos comprometidos y de alto estándar</strong>, capaces de sostener los resultados en el tiempo mediante procesos estandarizados y medibles.</li>
            </ul>

            <p>
              Agradeciendo de antemano el tiempo dedicado a revisar estos antecedentes y mi Currículum Vitae adjunto, manifiesto mi total disponibilidad para sostener una entrevista personal o técnica en la oportunidad que estimen conveniente.
            </p>

            {/* Signature */}
            <div className="pt-4 space-y-1 border-t border-slate-100">
              <p>Le saluda atentamente,</p>
              <p className="font-bold text-sm text-[#002D62] pt-2">{candidateName}</p>
              <p className="font-semibold text-slate-600">{candidateTitle}</p>
              <p className="text-[11px] text-slate-500">Teléfono: {phone} • Email: {email}</p>
            </div>
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 sm:p-5 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Formato compatible:
            </span>
            <span className="bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded text-[10px] border border-sky-200">
              MS Word (.DOC / .DOCX)
            </span>
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200">
              Google Docs & LibreOffice
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '¡Texto Copiado!' : 'Copiar Texto ATS'}
            </button>

            <button
              onClick={handleDownloadWord}
              className="px-5 py-2.5 bg-[#002D62] hover:bg-[#001D42] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Download size={16} />
              {downloadSuccess ? '¡Word Descargado!' : 'Descargar en Word (.DOC)'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExecutiveCoverLetterModal;
