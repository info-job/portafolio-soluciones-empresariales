import React, { useState, useEffect } from 'react';
import { FileText, CloudDownload, Printer, Edit3, Save, Plus, Trash2, Briefcase, GraduationCap, Award, Network, ArrowLeft, CheckCircle2, ChevronRight, Settings, UserCheck, ShieldCheck, Download, Sparkles, HardDrive } from 'lucide-react';
import RecruiterInterviewReport from './RecruiterInterviewReport';
import InterviewSpeechModal from './InterviewSpeechModal';
import ExecutiveCoverLetterModal from './ExecutiveCoverLetterModal';
import { downloadCristianCvPdf, previewCristianCvPdf } from '../lib/cvPdfParser';
import { downloadCristianCvDocx, registerCvDocxInVault } from '../lib/cvDocxGenerator';

interface CVSection {
  id: string;
  title: string;
  subtitle: string;
  period: string;
  details: string[];
}

interface PersonalData {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  profileSummary: string;
}

export const CurriculumVitae: React.FC<{ onClose: () => void; currentUser?: string }> = ({ onClose, currentUser }) => {
  const [viewMode, setViewMode] = useState<'ONE_PAGE' | 'DETAILED'>('ONE_PAGE');
  const [isEditing, setIsEditing] = useState(false);
  const [showRecruiterReport, setShowRecruiterReport] = useState(false);
  const [showInterviewSpeech, setShowInterviewSpeech] = useState(false);
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Default Personal Data
  const [personal, setPersonal] = useState<PersonalData>({
    name: 'CRISTIAN ANDRÉS MUÑOZ ROJAS',
    title: 'Ingeniero Civil Industrial · Control de Gestión, Auditoría de Procesos y Operaciones',
    email: 'cristian.munoz0223@gmail.com',
    phone: '+56 9 6143 6853',
    location: 'Santiago, Chile',
    linkedin: 'linkedin.com/in/cristian-muñoz-3a747258',
    profileSummary: 'Ingeniero Civil Industrial con más de 12 años de experiencia liderando áreas de Control de Gestión, Auditoría Interna, Operaciones y Abastecimiento en sectores corporativos, manufactura multinacional y gestión patrimonial. Especialista en control presupuestario (OPEX/CAPEX), diseño de matrices de riesgo operacional y optimización de procesos mediante analítica avanzada (Power BI, SQL) y automatización. Formación complementaria en Ciencias Jurídicas (ENAC), aportando criterio técnico en cumplimiento normativo, contratos y debida diligencia. Historial comprobado en optimización de capital de trabajo por más de $2.000M CLP, administración de carteras inmobiliarias sin observaciones CMF y conducción directa de dotaciones operativas de hasta 20 personas. Disponibilidad Inmediata.'
  });

  // Default Experiences (3 cargos calibrados con viñetas concisas y métricas reales para 1 página)
  const [experiences, setExperiences] = useState<CVSection[]>([
    {
      id: 'exp-1',
      title: 'Jefatura de Control Interno y Gestión de Activos',
      subtitle: 'Corporación Inmobiliaria & Gestión Patrimonial',
      period: '2023 – 2026 | Santiago, Chile',
      details: [
        'Dirección técnica y control de gestión sobre portafolio de 1.849 activos inmobiliarios corporativos (UF 30.300 / $1.146M CLP), coordinando a peritos tasadores, arquitectos y analistas bajo estándares técnicos uniformes.',
        'Mantenimiento sostenido de cero observaciones en auditorías externas y ante la Comisión para el Mercado Financiero (CMF), mediante matrices de riesgo operacional y segregación de perfiles (SoD).',
        'Supervisión del presupuesto operacional (OPEX) y de conservación (CAPEX), asegurando la rendición periódica y consistencia contable del 100% de los gastos comunes, seguros y fondos de reserva.',
        'Diseño y puesta en marcha de la plataforma corporativa AssetFlow con motor OCR y reglas contables, digitalizando contratos y reportes CMF (Ficha B.4 y Nota 14), reduciendo tiempos de cierre de 15 días a menos de 1 hora.'
      ]
    },
    {
      id: 'exp-2',
      title: 'Jefatura de Operaciones, Abastecimiento & Logística Estratégica',
      subtitle: 'Essity Chile (Multinacional Sueca de Manufactura & Consumo)',
      period: '2018 – 2023 | Lampa, Santiago',
      details: [
        'Conducción directa de 8 colaboradores técnicos en operaciones y almacén central; gestión de turnos, estándares de seguridad laboral y cumplimiento de un 98% en nivel de servicio (SLA) para plantas productivas.',
        'Liderazgo de la planificación S&OP en repuestos y suministros críticos (cartera de UF 158.000 / $6.000M CLP), liberando más de UF 53.000 (~$2.000M CLP) en capital inmovilizado mediante acuerdos marco.',
        'Mantenimiento de $0 diferencias de inventario durante 10 meses consecutivos en activos críticos, instaurando rutinas diarias de inventarios rotativos aleatorios (IRA) en SAP MM/WM con 99.5% de exactitud.',
        'Negociación de acuerdos marco con proveedores estratégicos con 15% de reducción en lead times, e implementación de tableros directivos en Power BI enlazados a SAP para el control de inventarios.'
      ]
    },
    {
      id: 'exp-3',
      title: 'Supervisor de Operaciones de Caja & Tesorería (2014–2018) | Cajero (2008–2013)',
      subtitle: 'Rendic Hermanos S.A. (Unimarc / Red SMU)',
      period: '2008 – 2018 | Santiago, Chile',
      details: [
        'Supervisión y asignación de turnos a dotación de 15 a 20 cajeros por jornada; administración del fondo de tesorería del local y despacho de remesas blindadas (Brink\'s / Prosegur) con cuadratura diaria al 100%.',
        'Mantenimiento del estándar de cero observaciones en auditorías internas sorpresivas de tesorería y custodia de caudales durante más de 12 meses continuos.',
        'Promovido por mérito en 2014 a Supervisor de Cajas y Tesorero tras 5 años de desempeño intachable como Cajero (2008–2013), sustentado en precisión operativa, responsabilidad y probidad.'
      ]
    }
  ]);

  // Logros destacados de gestión sintéticos
  const [achievements, setAchievements] = useState<string[]>([
    'Optimización de Capital de Trabajo: Liberación de más de $2.000M CLP (UF 53.000) en Essity Chile mediante S&OP y acuerdos marco con proveedores estratégicos.',
    'Aseguramiento Regulatorio y CMF: Gestión patrimonial de 1.849 inmuebles (UF 30.300 / $1.146M CLP) sin observaciones de auditoría externa ni reparos CMF.',
    'Custodia Exacta de Inventarios: Cero diferencias ($0) durante 10 meses consecutivos en activos críticos de UF 158.000 ($6.000M CLP) en SAP MM/WM.',
    'Auditoría Interna en Tesorería: Más de 12 meses continuos sin observaciones de auditoría interna en arqueos sorpresivos y custodia de caudales en Rendic Hermanos S.A.'
  ]);

  // Competencias clave del Ingeniero
  const [competencies, setCompetencies] = useState<string[]>([
    'Control de Gestión & Riesgos: Auditoría de procesos, matrices de riesgo operacional, segregación de funciones (SoD), debida diligencia UAF/PEP (Ley N° 19.913) y marcos CMF/CAIGG.',
    'Gestión Financiera & Presupuestaria: Control presupuestario OPEX/CAPEX, evaluación económica de proyectos, optimización de capital inmovilizado y conciliación contable.',
    'Operaciones & Abastecimiento: Planificación de demanda y suministro (S&OP), acuerdos marco con proveedores estratégicos, gestión de inventarios (IRA) y continuidad operacional (SLAs).',
    'Analítica & Transformación Digital: Modelado en Power BI (DAX avanzado), consultas SQL relacionales, sistemas ERP (SAP MM/WM/FI, Oracle ERP) y desarrollo de plataformas de control.'
  ]);

  // Technical skills & Sistemas
  const [techSkills, setTechSkills] = useState<string[]>([
    'Sistemas ERP: SAP (MM/WM/FI), Oracle ERP, AssetFlow Enterprise.',
    'Analítica & Datos: Power BI (Modelado y DAX avanzado), Consultas SQL relacionales, Excel Financiero Avanzado (Power Query).',
    'Metodologías: Planificación S&OP, Metodología Lean / 5S, Gestión de Riesgos Operacionales (Matrices de Riesgo, SoD).',
    'Marcos Normativos: Normativa CMF, Ley N° 19.913 (UAF / PEP), Ley N° 21.180 (Transformación Digital), Ley N° 19.886 (Contratación Pública).'
  ]);

  // Education (Ingeniería Civil Industrial + Formación Jurídica ENAC)
  const defaultEducation =
    '• Ingeniería Civil Industrial — Licenciado en Ciencias de la Ingeniería (Optimización de Procesos, Control de Gestión y Finanzas Corporativas).\n• Formación en Ciencias Jurídicas: Técnico Jurídico en ENAC Cáritas Chile (2005 – 2008). Especialización aplicada en derecho administrativo, contratos mercantiles, procedimientos legales y debida diligencia corporativa.\n• Especializaciones Clave: Planificación S&OP • Auditoría y Control Interno (CAIGG/CGR) • Prevención UAF / PEP (Ley N° 19.913) • Business Intelligence (Power BI/DAX).';

  const [education, setEducation] = useState<string>(defaultEducation);

  // Languages
  const [languages, setLanguages] = useState<string>('Español (Nativo) | Inglés Intermedio / Técnico (Lectura fluida, redacción técnica, especificaciones de sistemas y documentación de licitaciones)');

  // Load from localStorage if available with version check
  useEffect(() => {
    try {
      const cvVersion = localStorage.getItem('cv_version');
      if (cvVersion !== 'v2026_11_executive_authentic_v36') {
        // Clear stale CV keys so updated default content takes precedence
        localStorage.removeItem('cv_personal');
        localStorage.removeItem('cv_experiences');
        localStorage.removeItem('cv_achievements');
        localStorage.removeItem('cv_competencies');
        localStorage.removeItem('cv_tech');
        localStorage.removeItem('cv_education');
        localStorage.removeItem('cv_languages');
        localStorage.setItem('cv_version', 'v2026_11_executive_authentic_v36');
        setEducation(defaultEducation);
        return;
      }

      const cachedPersonal = localStorage.getItem('cv_personal');
      if (cachedPersonal) setPersonal(JSON.parse(cachedPersonal));

      const cachedExperiences = localStorage.getItem('cv_experiences');
      if (cachedExperiences) setExperiences(JSON.parse(cachedExperiences));

      const cachedAchievements = localStorage.getItem('cv_achievements');
      if (cachedAchievements) setAchievements(JSON.parse(cachedAchievements));

      const cachedCompetencies = localStorage.getItem('cv_competencies');
      if (cachedCompetencies) setCompetencies(JSON.parse(cachedCompetencies));

      const cachedTechSkills = localStorage.getItem('cv_tech');
      if (cachedTechSkills) setTechSkills(JSON.parse(cachedTechSkills));

      const cachedEducation = localStorage.getItem('cv_education');
      if (cachedEducation && cachedEducation.includes('ENAC') && cachedEducation.includes('2005')) {
        setEducation(cachedEducation);
      } else {
        localStorage.setItem('cv_education', defaultEducation);
        setEducation(defaultEducation);
      }

      const cachedLanguages = localStorage.getItem('cv_languages');
      if (cachedLanguages) setLanguages(cachedLanguages);
    } catch (e) {
      console.error("Error reading from localStorage:", e);
    }
  }, []);

  const saveCVData = () => {
    try {
      localStorage.setItem('cv_personal', JSON.stringify(personal));
      localStorage.setItem('cv_experiences', JSON.stringify(experiences));
      localStorage.setItem('cv_achievements', JSON.stringify(achievements));
      localStorage.setItem('cv_competencies', JSON.stringify(competencies));
      localStorage.setItem('cv_tech', JSON.stringify(techSkills));
      localStorage.setItem('cv_education', education);
      localStorage.setItem('cv_languages', languages);

      setSuccessMsg('¡Currículum guardado con éxito en la base del sistema!');
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
  };

  const exportToWord = () => {
    const expToHTML = (exps: CVSection[]) => {
      return exps.map(exp => `
        <div style="margin-bottom: 7px; page-break-inside: avoid;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
            <tr>
              <td style="font-size: 9.5pt; font-weight: bold; color: #0f172a; text-align: left; padding: 0;">${exp.title}</td>
              <td style="font-size: 8.5pt; color: #64748b; text-align: right; padding: 0; white-space: nowrap;">${exp.period}</td>
            </tr>
          </table>
          <p style="margin: 0 0 3px 0; font-size: 9pt; color: #334155; font-weight: 600;">
            ${exp.subtitle}
          </p>
          <ul style="margin: 2px 0 4px 0; padding-left: 14px; list-style-type: square;">
            ${exp.details.map(det => `<li style="font-size: 8.5pt; margin-bottom: 2px; color: #334155; line-height: 1.25; text-align: justify;">${det}</li>`).join('')}
          </ul>
        </div>
      `).join('');
    };

    const wordContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>CV - ${personal.name}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 8.5in 11in;
            margin: 0.38in 0.45in 0.38in 0.45in;
          }
          body {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 8.5pt;
            line-height: 1.22;
            color: #1e293b;
          }
          h2 {
            font-size: 9.5pt;
            font-weight: bold;
            color: #0f172a;
            border-bottom: 1pt solid #0f172a;
            padding-bottom: 1.5px;
            margin-top: 7px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <!-- CABECERA LINEAL EJECUTIVA -->
        <div style="text-align: center; margin-bottom: 8px;">
          <h1 style="font-size: 15pt; font-weight: bold; color: #0f172a; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: -0.3px;">${personal.name}</h1>
          <div style="font-size: 9.5pt; font-weight: bold; color: #334155; margin: 0 0 3px 0;">${personal.title}</div>
          <div style="font-size: 8.5pt; color: #0f172a; margin: 0; line-height: 1.3;">
            <b>${personal.location}</b> &nbsp;|&nbsp; <b>Tel: ${personal.phone}</b> &nbsp;|&nbsp; <b>${personal.email}</b> &nbsp;|&nbsp; <b>Disponibilidad Inmediata</b> &nbsp;|&nbsp; ${personal.linkedin}
          </div>
        </div>

        <h2>Perfil Profesional</h2>
        <p style="text-align: justify; font-size: 8.5pt; line-height: 1.25; color: #334155; margin: 0 0 6px 0;">
          ${personal.profileSummary.replace(/\n/g, '<br>')}
        </p>

        <h2>Competencias Clave del Ingeniero</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 8px; font-size: 8.5pt; color: #334155; line-height: 1.22;">
              &bull; <b>Control de Gestión & Auditoría:</b> Auditorías Cero Obs. (CMF/CGR), Matrices de Riesgo, Prevención UAF / PEP (Ley N° 19.913), SoD.<br/>
              &bull; <b>Supply Chain & Optimización:</b> Optimización Working Capital (+$2.000M CLP), Inventarios IRA ($0 Dif en UF 158.000), Lean & S&OP.
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 8px; font-size: 8.5pt; color: #334155; line-height: 1.22;">
              &bull; <b>Liderazgo & Presupuestos:</b> Conducción de Dotaciones (hasta 20 personas), Presupuestos OPEX/CAPEX, Negociación Convenios Marco.<br/>
              &bull; <b>Sistemas & Transformación Digital:</b> Ley N° 21.180 (Cero Papel), ERP SAP (MM/WM/FI), AssetFlow Enterprise, Power BI / SQL.
            </td>
          </tr>
        </table>

        <h2>Experiencia Profesional</h2>
        ${expToHTML(experiences)}

        <h2>Educación & Formación Continua</h2>
        <p style="font-size: 8.5pt; color: #334155; margin: 0 0 5px 0; line-height: 1.25;">
          ${education.replace(/\n/g, '<br>')}
        </p>

        <h2>Idiomas</h2>
        <p style="font-size: 8.5pt; color: #334155; margin: 0; line-height: 1.25;">
          <b>${languages}</b> &nbsp;|&nbsp; <b>Disponibilidad:</b> Inmediata
        </p>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + wordContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CURRICULUM_ATS_${personal.name.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportToTxt = () => {
    const textContent = `
${personal.name}
${personal.title.toUpperCase()}

INFORMACIÓN DE CONTACTO
-----------------------
📍 Ubicación: ${personal.location}
📞 Teléfono: ${personal.phone}
✉️ Email: ${personal.email}
⚡ Disponibilidad: DISPONIBILIDAD INMEDIATA
🔗 LinkedIn: ${personal.linkedin}

PERFIL PROFESIONAL
------------------
${personal.profileSummary}

EXPERIENCIA PROFESIONAL
-----------------------
${experiences.map(exp => `
* ${exp.title.toUpperCase()}
  ${exp.subtitle} | Periodo: ${exp.period}
  ${exp.details.map(det => `  - ${det}`).join('\n')}
`).join('\n')}

LOGROS DE ACUMULACIÓN DE IMPACTO
--------------------------------
${achievements.map(ach => `* ${ach}`).join('\n')}

COMPETENCIAS CLAVE Y METODOLOGÍAS
---------------------------------
${competencies.map(comp => `* ${comp}`).join('\n')}

HABILIDADES TÉCNICAS Y SISTEMAS
-------------------------------
${techSkills.map(tech => `* ${tech}`).join('\n')}

FORMACIÓN SUPERIOR
------------------
${education}

IDIOMAS
-------
${languages}

[CV Optimizado para Filtros ATS y Lectores Ópticos (OCR) - Generado de forma síncrona en PropWork]
`;

    const blob = new Blob([textContent.trim()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CURRICULUM_TEXT_ATS_${personal.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyAtsText = () => {
    const textContent = `
${personal.name}
${personal.title.toUpperCase()}

📍 Ubicación: ${personal.location}
📞 Teléfono: ${personal.phone}
✉️ Email: ${personal.email}
⚡ Disponibilidad: DISPONIBILIDAD INMEDIATA
🔗 LinkedIn: ${personal.linkedin}

PERFIL PROFESIONAL
${personal.profileSummary}

EXPERIENCIA PROFESIONAL
${experiences.map(exp => `
${exp.title.toUpperCase()}
${exp.subtitle} | ${exp.period}
${exp.details.map(det => `- ${det}`).join('\n')}
`).join('\n')}

LOGROS DE ACUMULACIÓN DE IMPACTO
${achievements.map(ach => `- ${ach}`).join('\n')}

COMPETENCIAS CLAVE Y METODOLOGÍAS
${competencies.map(comp => `- ${comp}`).join('\n')}

HABILIDADES TÉCNICAS Y SISTEMAS
${techSkills.map(tech => `- ${tech}`).join('\n')}

FORMACIÓN SUPERIOR
${education}

IDIOMAS
${languages}
`;

    navigator.clipboard.writeText(textContent.trim()).then(() => {
      setSuccessMsg('¡Texto ATS copiado al portapapeles! Listo para pegar en portales de postulación.');
      setTimeout(() => setSuccessMsg(null), 4000);
    }).catch(err => {
      console.error('Error al copiar el texto: ', err);
    });
  };

  const handleAddField = (type: 'experience' | 'achievement' | 'competency' | 'tech') => {
    if (type === 'experience') {
      const newExp: CVSection = {
        id: `exp-${Date.now()}`,
        title: 'MUESTRA DE CARGO - NUEVO',
        subtitle: 'Empresa o Institución',
        period: 'Año Inicio – Año Fin',
        details: ['Detalle clave de rendimiento u hito alcanzado número uno.', 'Detalle número dos con impacto cualitativo o cuantitativo.']
      };
      setExperiences([...experiences, newExp]);
    } else if (type === 'achievement') {
      setAchievements([...achievements, 'Nuevo logro sobresaliente alcanzado en su experiencia.']);
    } else if (type === 'competency') {
      setCompetencies([...competencies, 'Área funcional: Detalle de conocimientos clave mapeados.']);
    } else if (type === 'tech') {
      setTechSkills([...techSkills, 'Herramientas: Sistemas operacionales o de desarrollo.']);
    }
  };

  const handleRemoveField = (type: 'experience' | 'achievement' | 'competency' | 'tech', idx: number, uuid?: string) => {
    if (type === 'experience' && uuid) {
      setExperiences(experiences.filter(exp => exp.id !== uuid));
    } else if (type === 'achievement') {
      setAchievements(achievements.filter((_, i) => i !== idx));
    } else if (type === 'competency') {
      setCompetencies(competencies.filter((_, i) => i !== idx));
    } else if (type === 'tech') {
      setTechSkills(techSkills.filter((_, i) => i !== idx));
    }
  };

  const handleUpdateDetail = (expId: string, detIdx: number, val: string) => {
    setExperiences(experiences.map(exp => {
      if (exp.id === expId) {
        const nextDetails = [...exp.details];
        nextDetails[detIdx] = val;
        return { ...exp, details: nextDetails };
      }
      return exp;
    }));
  };

  const handleAddDetail = (expId: string) => {
    setExperiences(experiences.map(exp => {
      if (exp.id === expId) {
        return { ...exp, details: [...exp.details, 'Nueva descripción del rol y contribución relevante.'] };
      }
      return exp;
    }));
  };

  const handleRemoveDetail = (expId: string, detIdx: number) => {
    setExperiences(experiences.map(exp => {
      if (exp.id === expId) {
        return { ...exp, details: exp.details.filter((_, i) => i !== detIdx) };
      }
      return exp;
    }));
  };

  return (
    <div className="h-full bg-slate-50 p-8 overflow-auto custom-audit-scroll">
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        
        {/* HEADER BAR EJECUTIVA SOBRIA */}
        <div className="bg-white rounded-xl p-5 text-slate-900 shadow-xs border border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
                Control de Gestión & Transformación Digital
              </span>
              <span className="text-[10px] font-mono text-emerald-800 font-bold">
                ✓ Formato ATS • Alta Legibilidad • Sin Exceso de Color
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Currículum Vitae — Cristian Andrés Muñoz Rojas
            </h1>
            <p className="text-slate-600 text-xs">
              Diseño sobrio y estructurado para lectura inmediata de reclutadores, comisiones evaluadoras y filtros ATS.
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
               onClick={() => setIsEditing(!isEditing)}
               className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                 isEditing ? 'bg-amber-600 text-white border-amber-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
               }`}
            >
              <Edit3 size={14} /> {isEditing ? 'Cerrar Edición' : 'Editar Datos'}
            </button>
            
            {isEditing && (
              <button 
                onClick={saveCVData}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save size={14} /> Guardar Cambios
              </button>
            )}

            <button
              onClick={async () => {
                setSuccessMsg('Generando documento Microsoft Word nativo (.docx)...');
                const res = await downloadCristianCvDocx();
                if (res.success) {
                  setSuccessMsg('✓ Documento Word (.DOCX) generado y descargado con éxito. Quedó registrado en su Bóveda.');
                } else {
                  setSuccessMsg(`Aviso: ${res.error || 'Error al generar .docx'}`);
                }
                setTimeout(() => setSuccessMsg(null), 5000);
              }}
              className="px-4 py-2 bg-[#002D62] hover:bg-[#001D42] text-white border border-blue-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:translate-y-0.5 cursor-pointer"
              title="Descargar Currículum Vitae en formato Microsoft Word nativo (.docx) con OpenXML"
            >
              <FileText size={15} className="text-emerald-400" />
              <span>Descargar .DOCX</span>
            </button>

            <button
              onClick={async () => {
                setSuccessMsg('Sincronizando y alojando documento .docx en Bóveda Digital...');
                const res = await registerCvDocxInVault();
                if (res.success) {
                  setSuccessMsg('✓ ¡Currículum Vitae (.DOCX) alojado y disponible en su Bóveda de Documentos!');
                } else {
                  setSuccessMsg(res.message);
                }
                setTimeout(() => setSuccessMsg(null), 5000);
              }}
              className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs active:translate-y-0.5 cursor-pointer"
              title="Alojar y certificar este CV en la Bóveda de Documentos del sistema"
            >
              <HardDrive size={14} className="text-amber-300" />
              <span>Alojar en Bóveda</span>
            </button>

            <button
              onClick={() => {
                try {
                  const res = downloadCristianCvPdf();
                  if (res.success) {
                    setSuccessMsg('✓ Currículum Vitae (PDF Limpio ATS) descargado con éxito.');
                  } else {
                    previewCristianCvPdf();
                    setSuccessMsg('Abriendo vista previa del PDF en el navegador...');
                  }
                } catch {
                  previewCristianCvPdf();
                  setSuccessMsg('Abriendo vista previa del PDF en el navegador...');
                }
                setTimeout(() => setSuccessMsg(null), 4000);
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Descargar Currículum Vitae en PDF formato ejecutivo sobrio"
            >
              <Download size={14} /> Descargar PDF
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Imprimir directamente o Guardar como PDF de 1 sola página"
            >
              <Printer size={14} /> Imprimir 1 Pág.
            </button>

            <button
              onClick={exportToWord}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Descargar versión ligera .DOC alternativa"
            >
              <CloudDownload size={14} /> .DOC (HTML)
            </button>

            <button
              onClick={copyAtsText}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Copiar texto estructurado para portales de postulación"
            >
              <FileText size={14} /> Copiar Texto
            </button>

            <button
              onClick={() => setShowCoverLetterModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText size={14} /> Carta Presentación
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 rounded-lg transition-all cursor-pointer ml-auto md:ml-0"
              title="Volver al Panel"
            >
              <ArrowLeft size={16} />
            </button>
          </div>
        </div>

        {/* MENSAJE DE CONFIRMACIÓN */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-300 px-4 py-3 rounded-lg flex items-center gap-2.5 text-emerald-900 animate-in fade-in">
            <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
            <div className="text-xs font-bold">{successMsg}</div>
          </div>
        )}

        {/* MODO EDICIÓN ACTIVO */}
        {isEditing && (
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-6 space-y-5 text-slate-900">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <h3 className="text-sm font-bold text-amber-900 uppercase">Panel de Edición Rápida</h3>
              <button 
                onClick={saveCVData}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Save size={13} /> Guardar Todos los Cambios
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={personal.name} 
                  onChange={(e) => setPersonal({ ...personal, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Título / Cargo</label>
                <input 
                  type="text" 
                  value={personal.title} 
                  onChange={(e) => setPersonal({ ...personal, title: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Email</label>
                <input 
                  type="text" 
                  value={personal.email} 
                  onChange={(e) => setPersonal({ ...personal, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Teléfono</label>
                <input 
                  type="text" 
                  value={personal.phone} 
                  onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Ubicación</label>
                <input 
                  type="text" 
                  value={personal.location} 
                  onChange={(e) => setPersonal({ ...personal, location: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">LinkedIn</label>
                <input 
                  type="text" 
                  value={personal.linkedin} 
                  onChange={(e) => setPersonal({ ...personal, linkedin: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Resumen del Perfil Profesional</label>
              <textarea 
                rows={4}
                value={personal.profileSummary}
                onChange={(e) => setPersonal({ ...personal, profileSummary: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs leading-relaxed text-slate-800"
              />
            </div>
          </div>
        )}

        {/* ESTILOS DE IMPRESIÓN PARA 1 PÁGINA EXACTA */}
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 7mm 9mm 7mm 9mm;
            }
            body {
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
            .custom-audit-scroll {
              overflow: visible !important;
              height: auto !important;
              padding: 0 !important;
            }
            .cv-page-container {
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}</style>

        {/* SELECTOR DE MODO DE VISTA (EJECUTIVO 1 PÁGINA VS DETALLADO) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-800">Formato de Lectura:</span>
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setViewMode('ONE_PAGE')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  viewMode === 'ONE_PAGE'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✓ Formato Ejecutivo 1 Página (Recomendado)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('DETAILED')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  viewMode === 'DETAILED'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Formato Detallado
              </button>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {viewMode === 'ONE_PAGE' 
              ? '⚡ Diseño sintetizado: Lectura rápida para reclutadores expertos, sin redundancias y calibrado para 1 sola hoja.' 
              : 'Despliega todas las viñetas y detalle exhaustivo de funciones.'}
          </div>
        </div>

        {/* HOJA DE DOCUMENTO EJECUTIVA */}
        <div className={`bg-white border border-slate-300 shadow-sm rounded-xl text-slate-900 mx-auto cv-page-container ${
          viewMode === 'ONE_PAGE' 
            ? 'p-6 md:p-8 space-y-2.5 max-w-[850px] print:shadow-none print:border-none print:p-0 print:m-0' 
            : 'p-8 md:p-14 space-y-6 max-w-5xl'
        }`}>
          
          {/* CABECERA PRINCIPAL DEL CANDIDATO */}
          <div className={`space-y-1 border-b ${viewMode === 'ONE_PAGE' ? 'border-slate-800 pb-2' : 'border-slate-900 pb-4'}`}>
            <h2 className={`font-bold tracking-tight text-slate-900 uppercase ${viewMode === 'ONE_PAGE' ? 'text-2xl' : 'text-2xl md:text-3xl'}`}>
              {personal.name}
            </h2>
            <div className={`font-semibold text-slate-700 ${viewMode === 'ONE_PAGE' ? 'text-xs' : 'text-sm'}`}>
              {personal.title}
            </div>
            <div className={`text-slate-800 flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1 ${viewMode === 'ONE_PAGE' ? 'text-[10.5px]' : 'text-xs'}`}>
              <span className="font-bold text-slate-900">{personal.location}</span>
              <span className="text-slate-400">•</span>
              <span className="font-bold text-slate-900">Tel: {personal.phone}</span>
              <span className="text-slate-400">•</span>
              <a href={`mailto:${personal.email}`} className="font-bold text-slate-900 underline hover:text-slate-700">{personal.email}</a>
              <span className="text-slate-400">•</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                Disponibilidad Inmediata
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">{personal.linkedin}</span>
            </div>
          </div>

          {/* SECCIÓN 1: PERFIL PROFESIONAL */}
          <div className={viewMode === 'ONE_PAGE' ? 'space-y-1' : 'space-y-2'}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
              Perfil Profesional
            </h3>
            <p className={`text-slate-800 text-justify whitespace-pre-line ${viewMode === 'ONE_PAGE' ? 'text-[10.5px] leading-snug' : 'text-xs leading-relaxed'}`}>
              {personal.profileSummary}
            </p>
          </div>

          {/* SECCIÓN 2: COMPETENCIAS CLAVE DEL INGENIERO */}
          <div className={viewMode === 'ONE_PAGE' ? 'space-y-1' : 'space-y-2.5'}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
              Competencias Clave del Ingeniero
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 pl-2.5 border-l border-slate-200 text-[10px] md:text-[10.5px] text-slate-700 leading-snug">
              <div>
                <p>• <strong className="text-slate-900">Control de Gestión & Auditoría:</strong> Auditorías Cero Obs. (CMF/CGR), Matrices de Riesgo, Prevención UAF / PEP (Ley N° 19.913), SoD.</p>
                <p className="mt-1">• <strong className="text-slate-900">Supply Chain & Optimización:</strong> Optimización Working Capital (+$2.000M CLP), Inventarios IRA ($0 Dif en UF 158.000), Lean & S&OP.</p>
              </div>
              <div>
                <p>• <strong className="text-slate-900">Liderazgo & Presupuestos:</strong> Conducción de Dotaciones (hasta 20 colaboradores), Presupuestos OPEX/CAPEX, Negociación Convenios Marco.</p>
                <p className="mt-1">• <strong className="text-slate-900">Sistemas & Transformación Digital:</strong> Ley N° 21.180 (Cero Papel), ERP SAP (MM/WM/FI), AssetFlow Enterprise, Power BI / SQL.</p>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: EXPERIENCIA PROFESIONAL RELEVANTE */}
          <div className={viewMode === 'ONE_PAGE' ? 'space-y-1.5' : 'space-y-4'}>
            <div className="flex items-center justify-between border-b border-slate-300 pb-0.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Experiencia Profesional Relevante
              </h3>
              {isEditing && (
                <button 
                  onClick={() => handleAddField('experience')}
                  className="text-[10px] font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1 no-print"
                >
                  <Plus size={12} /> Agregar Cargo
                </button>
              )}
            </div>

            <div className={viewMode === 'ONE_PAGE' ? 'space-y-2' : 'space-y-5'}>
              {experiences.map((exp) => (
                <div key={exp.id} className={viewMode === 'ONE_PAGE' ? 'space-y-0.5' : 'space-y-1.5'}>
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5">
                    <h4 className={`font-bold text-slate-900 ${viewMode === 'ONE_PAGE' ? 'text-[11.5px]' : 'text-sm'}`}>
                      {exp.title}
                    </h4>
                    <span className={`font-mono text-slate-500 shrink-0 font-semibold ${viewMode === 'ONE_PAGE' ? 'text-[10px]' : 'text-xs'}`}>
                      {exp.period}
                    </span>
                  </div>
                  
                  <div className={`font-semibold text-slate-700 ${viewMode === 'ONE_PAGE' ? 'text-[10px]' : 'text-xs'}`}>
                    {exp.subtitle}
                  </div>

                  <ul className={`pt-0.5 pl-2.5 border-l border-slate-200 ${viewMode === 'ONE_PAGE' ? 'space-y-0.5' : 'space-y-1.5'}`}>
                    {exp.details.map((det, detIdx) => (
                      <li key={detIdx} className={`text-slate-700 flex items-start gap-1.5 ${viewMode === 'ONE_PAGE' ? 'text-[10px] leading-snug' : 'text-xs leading-relaxed'}`}>
                        <span className="text-slate-400 select-none text-[8px] mt-0.5 shrink-0">■</span>
                        <span className="flex-1 text-justify">{det}</span>
                        {isEditing && (
                          <button 
                            onClick={() => handleRemoveDetail(exp.id, detIdx)}
                            className="text-rose-500 hover:text-rose-700 p-0.5 no-print"
                            title="Eliminar viñeta"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  {isEditing && (
                    <button 
                      onClick={() => handleAddDetail(exp.id)}
                      className="text-[10px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 pt-1 ml-3"
                    >
                      <Plus size={11} /> Agregar viñeta a este cargo
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECCIÓN 4: LOGROS DESTACADOS DE GESTIÓN (VISIBLES EN MODO DETALLADO) */}
          {viewMode === 'DETAILED' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Logros Destacados de Gestión
                </h3>
                {isEditing && (
                  <button 
                    onClick={() => handleAddField('achievement')}
                    className="text-[10px] font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1"
                  >
                    <Plus size={12} /> Agregar Logro
                  </button>
                )}
              </div>

              <ul className="space-y-1.5 pl-3 border-l border-slate-200">
                {achievements.map((ach, idx) => (
                  <li key={idx} className="text-xs text-slate-700 leading-relaxed flex items-start gap-2">
                    <span className="text-slate-400 select-none">•</span>
                    <span className="flex-1 text-justify">{ach}</span>
                    {isEditing && (
                      <button 
                        onClick={() => handleRemoveField('achievement', idx)}
                        className="text-rose-500 hover:text-rose-700 p-0.5"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* SECCIÓN 4 / 5: FORMACIÓN ACADÉMICA & BASE JURÍDICA */}
          <div className={viewMode === 'ONE_PAGE' ? 'space-y-1' : 'space-y-2'}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
              Formación Académica & Base Jurídica
            </h3>
            <div className={`text-slate-700 whitespace-pre-line pl-2.5 border-l border-slate-200 ${
              viewMode === 'ONE_PAGE' ? 'text-[10px] leading-snug' : 'text-xs leading-relaxed'
            }`}>
              {education}
            </div>
          </div>

          {/* SECCIÓN EXTENDIDA DE SISTEMAS (VISIBLES EN MODO DETALLADO) */}
          {viewMode === 'DETAILED' && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                Sistemas, Metodologías & Herramientas Técnicas
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 pl-3 border-l border-slate-200">
                {techSkills.map((tech, idx) => (
                  <div key={`tech-${idx}`} className="text-xs text-slate-700 leading-relaxed flex items-start gap-2">
                    <span className="text-slate-400 select-none">•</span>
                    <span>{tech}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN IDIOMAS & DISPONIBILIDAD */}
          <div className={viewMode === 'ONE_PAGE' ? 'space-y-0.5 pt-0.5 border-t border-slate-200' : 'space-y-2'}>
            {viewMode === 'DETAILED' ? (
              <>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                  Idiomas
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed pl-3 border-l border-slate-200">
                  {languages}
                </p>
              </>
            ) : (
              <p className="text-[10px] text-slate-700 leading-tight">
                <strong className="text-slate-900">Idiomas:</strong> {languages} &nbsp;|&nbsp; <strong className="text-slate-900">Disponibilidad:</strong> Inmediata
              </p>
            )}
          </div>

        </div>

      </div>

      {showRecruiterReport && (
        <RecruiterInterviewReport onClose={() => setShowRecruiterReport(false)} />
      )}

      {showInterviewSpeech && (
        <InterviewSpeechModal onClose={() => setShowInterviewSpeech(false)} />
      )}

      {showCoverLetterModal && (
        <ExecutiveCoverLetterModal onClose={() => setShowCoverLetterModal(false)} />
      )}
    </div>
  );
};

export default CurriculumVitae;
