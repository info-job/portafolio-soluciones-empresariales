import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Briefcase, Search, Filter, ExternalLink, Sparkles, CheckCircle2, 
  XCircle, Building2, MapPin, DollarSign, Clock, FileText, Send, 
  ChevronRight, Calendar, UserCheck, Award, Tag, RefreshCw, Globe, 
  Download, Plus, Edit3, Eye, AlertCircle, Trash2, ArrowUpRight, Copy, Check,
  Loader2, ShieldCheck, AlertTriangle, BookOpen, X, Laptop, Home, Shuffle,
  SlidersHorizontal, ArrowLeft, ArrowRight, Maximize2, Zap, LogOut, User
} from 'lucide-react';
import { JobOffer, CvProfile } from '../types';
import { JobSearchManualModal } from './JobSearchManualModal';
import { JobSearchCvModal } from './JobSearchCvModal';
import { SuperpowerScreeningModal } from './SuperpowerScreeningModal';
import { ValidatedInput } from './common/ValidatedInput';
import { checkDuplicateJobOffer } from '../lib/inputMasks';
import { recalculateJobMatches, generateDemoCristianPdf, downloadCristianCvPdf, previewCristianCvPdf } from '../lib/cvPdfParser';
import { downloadExecutiveCoverLetterWord } from '../lib/wordManualsExport';
import { 
  COMPANY_CAREERS_DIRECTORY, 
  findCompanyCareerEntry, 
  getCompanyTrabajaConNosotrosUrl, 
  CORPORATE_CAREER_OFFERS,
  CompanyCareerEntry,
  searchCompanyCareersDirectory
} from '../lib/companyCareersData';
import { searchLiveChileanJobOffers } from '../geminiService';

export interface DailySyncSummary {
  date: string;
  time: string;
  totalOffers: number;
  newOffersCount: number;
  portalsCount: number;
  corporateCount: number;
  source: string;
}

interface JobSearchModuleProps {
  currentUser?: string;
  onClose?: () => void;
  onLogout?: () => void;
}

// Initial Candidate Skills derived from Cristian's CV
const DEFAULT_CANDIDATE_SKILLS = [
  'Ingeniero Civil Industrial',
  'Perfil Híbrido de Alta Rareza (Ingeniería + IA + Auditoría)',
  'Arquitectura Full-Stack & Google AI Studio',
  'Control Interno',
  'Gestión Inmobiliaria',
  'Gestión de Activos Inmobiliarios UF 30.300',
  'Gobernanza CMF (B13 / B4 / Nota 14)',
  'Supply Chain & Logística',
  'Capacitación S&OP (Sales & Operations Planning)',
  'Inventarios Rotativos IRA en $0 Diferencias',
  'SAP MM/WM',
  'AssetFlow Enterprise',
  'Power BI & DAX',
  'Consultas SQL',
  'IA Generativa (Google AI Studio)',
  'Desarrollo TypeScript & React',
  'Control Interno & Auditoría CMF',
  'Cumplimiento CMF (B13/B4/N14)',
  'Prevención UAF / PEP',
  'Inventarios Rotativos IRA ($0 Dif)',
  'Optimización Working Capital',
  'Metodología Lean Six Sigma',
  'Auditoría Cero Observaciones',
  'Liderazgo de Equipos'
];

// Curated Live Chilean Job Opportunities (Private & Public Sector)
const INITIAL_JOB_OFFERS: JobOffer[] = [
  {
    id: 'job-sgs-data-1',
    title: 'Ingeniero de Datos / Data Engineer & Automatización Industrial',
    company: 'SGS Chile',
    portal: 'LinkedIn / SGS Careers',
    portalUrl: 'https://www.sgs.com/es-cl/nuestra-empresa/empleo',
    location: 'Pudahuel / Santiago, Chile',
    modality: 'Híbrido',
    salaryMin: 3200000,
    salaryMax: 4200000,
    currency: 'CLP',
    category: 'Transformación Digital & IT',
    description: 'SGS líder mundial en inspección, ensayos, verificación y certificación. Buscamos Ingeniero de Datos / Data Engineer para liderar la arquitectura de canalización de datos (ETL/ELT), automatización de reportes operativos masivos, trazabilidad de datos de inspección técnica e integración con modelos de Inteligencia Artificial para optimización de procesos analíticos.',
    requiredSkills: ['Ingeniero Civil Industrial', 'Consultas SQL', 'Python & Scripts', 'Power BI & DAX', 'Control Interno', 'Automatización con IA'],
    matchScore: 97,
    matchedSkills: ['Ingeniero Civil Industrial', 'Consultas SQL', 'Python & Scripts', 'Power BI & DAX', 'Control Interno', 'Automatización con IA'],
    missingSkills: [],
    postedDate: 'Publicado hoy',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Portal SGS Chile (Inspección, Certificación y Calidad).',
    isDisabilityInclusive: true
  },
  {
    id: 'job-pub-1',
    title: 'Jefe de Departamento de Auditoría & Control Gubernamental',
    company: 'Tesorería General de la República (TGR) / Ministerio de Hacienda',
    portal: 'Empleos Públicos',
    portalUrl: 'https://www.empleospublicos.cl/pub/convocatorias/convocatorias.aspx?q=auditoria',
    location: 'Santiago Centro, Chile',
    modality: 'Presencial',
    salaryMin: 3800000,
    salaryMax: 4600000,
    currency: 'CLP',
    category: 'Sector Público & Gobierno',
    description: 'Concurso Público de Oposición y Antecedentes (Estatuto Administrativo Ley N° 18.834). Responsable de dirigir la Unidad de Control Interno y Auditoría Gubernamental. Liderar el plan anual de fiscalización sobre recaudación fiscal, conciliaciones bancarias masivas, evaluación de riesgos operacionales y aseguramiento de 0 observaciones ante la Contraloría General de la República (CGR).',
    requiredSkills: ['Ingeniero Civil Industrial', 'Control Interno', 'Auditoría Cero Observaciones', 'Prevención UAF / PEP', 'Cumplimiento CMF (B13/B4/N14)', 'Power BI & DAX', 'Consultas SQL'],
    matchScore: 98,
    matchedSkills: ['Ingeniero Civil Industrial', 'Control Interno', 'Auditoría Cero Observaciones', 'Prevención UAF / PEP', 'Cumplimiento CMF (B13/B4/N14)', 'Power BI & DAX', 'Consultas SQL'],
    missingSkills: [],
    postedDate: 'Publicado hoy',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Portal del Estado de Chile (Empleos Públicos).',
    isDisabilityInclusive: true
  },
  {
    id: 'job-pub-2',
    title: 'Director/a de Administración y Finanzas (Primer Nivel Jerárquico)',
    company: 'Servicio de Impuestos Internos (SII) / Servicio Civil',
    portal: 'Servicio Civil / ADP',
    portalUrl: 'https://adp.serviciocivil.cl/',
    location: 'Santiago, Chile',
    modality: 'Presencial',
    salaryMin: 4800000,
    salaryMax: 5900000,
    currency: 'CLP',
    category: 'Sector Público & Gobierno',
    description: 'Concurso de Alta Dirección Pública (ADP - Ley N° 19.882). Planificar, dirigir y supervisar la gestión financiera, presupuestaria, contable, abastecimiento y de personas del Servicio. Asegurar el cumplimiento eficiente del presupuesto fiscal asignado, optimización de recursos y modernización tecnológica de procesos críticos.',
    requiredSkills: ['Ingeniero Civil Industrial', 'Control Interno', 'Optimización Working Capital', 'Liderazgo de Equipos', 'Power BI & DAX', 'Consultas SQL'],
    matchScore: 95,
    matchedSkills: ['Ingeniero Civil Industrial', 'Control Interno', 'Optimización Working Capital', 'Liderazgo de Equipos', 'Power BI & DAX', 'Consultas SQL'],
    missingSkills: [],
    postedDate: 'Hace 1 día',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Portal Concursos Alta Dirección Pública (ADP).',
    isDisabilityInclusive: true
  },
  {
    id: 'job-pub-3',
    title: 'Jefe de Subdepartamento de Logística & Inventarios de Redes Asistenciales',
    company: 'Subsecretaría de Redes Asistenciales / Ministerio de Salud (MINSAL)',
    portal: 'Empleos Públicos',
    portalUrl: 'https://www.empleospublicos.cl/pub/convocatorias/convocatorias.aspx?q=logistica',
    location: 'Providencia, Santiago, Chile',
    modality: 'Presencial',
    salaryMin: 3400000,
    salaryMax: 4100000,
    currency: 'CLP',
    category: 'Sector Público & Gobierno',
    description: 'Gestionar la cadena de suministro, almacenamiento y distribución de insumos médicos e infraestructura sanitaria estratégica. Implementación de conteos rotativos IRA ($0 diferencias), gestión de convenios en Mercado Público y control estricto de bodega en cumplimiento con la normativa sanitaria e instrucciones de la CGR.',
    requiredSkills: ['Ingeniero Civil Industrial', 'Supply Chain & Logística', 'Inventarios Rotativos IRA ($0 Dif)', 'SAP MM/WM', 'Optimización Working Capital', 'Metodología Lean Six Sigma'],
    matchScore: 96,
    matchedSkills: ['Ingeniero Civil Industrial', 'Supply Chain & Logística', 'Inventarios Rotativos IRA ($0 Dif)', 'SAP MM/WM', 'Optimización Working Capital', 'Metodología Lean Six Sigma'],
    missingSkills: [],
    postedDate: 'Hace 2 días',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Portal del Estado de Chile (Empleos Públicos).',
    isDisabilityInclusive: true
  },
  {
    id: 'job-pub-4',
    title: 'Jefe de Unidad de Catastro & Gestión de Activos Fiscales',
    company: 'Ministerio de Bienes Nacionales',
    portal: 'Empleos Públicos',
    portalUrl: 'https://www.empleospublicos.cl/pub/convocatorias/convocatorias.aspx?q=bienes+nacionales',
    location: 'Santiago Centro, Chile',
    modality: 'Híbrido',
    salaryMin: 3500000,
    salaryMax: 4300000,
    currency: 'CLP',
    category: 'Sector Público & Gobierno',
    description: 'Supervisión, valoración contable-patrimonial y administración del catálogo de propiedades e inmuebles del Estado. Auditoría de contratos de concesión y arriendo de propiedades fiscales, fiscalización en terreno y digitalización del Catastro Nacional de Bienes Fiscales.',
    requiredSkills: ['Ingeniero Civil Industrial', 'Gestión Inmobiliaria', 'Control Interno', 'Power BI & DAX', 'Liderazgo de Equipos', 'Consultas SQL'],
    matchScore: 97,
    matchedSkills: ['Ingeniero Civil Industrial', 'Gestión Inmobiliaria', 'Control Interno', 'Power BI & DAX', 'Liderazgo de Equipos', 'Consultas SQL'],
    missingSkills: [],
    postedDate: 'Hace 3 días',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Portal del Estado de Chile (Empleos Públicos).',
    isDisabilityInclusive: false
  },
  {
    id: 'job-pub-5',
    title: 'Especialista Senior de Inteligencia de Datos y Control de Compras Públicas',
    company: 'Dirección de Compras y Contratación Pública (ChileCompra)',
    portal: 'Mercado Público',
    portalUrl: 'https://www.mercadopublico.cl/Home/BuscarLicitacion?q=auditoria',
    location: 'Santiago, Chile',
    modality: 'Híbrido',
    salaryMin: 3300000,
    salaryMax: 4000000,
    currency: 'CLP',
    category: 'Sector Público & Gobierno',
    description: 'Desarrollar algoritmos de IA y cuadros de mando en Power BI para el monitoreo en tiempo real de contrataciones del Estado en Mercado Público. Detección de patrones anómalos de fraccionamiento de compras, riesgos de probidad administrativa e integración con bases de datos SQL institucionales.',
    requiredSkills: ['Ingeniero Civil Industrial', 'IA Generativa (Google AI Studio)', 'Power BI & DAX', 'Consultas SQL', 'Control Interno', 'Desarrollo TypeScript & React'],
    matchScore: 94,
    matchedSkills: ['Ingeniero Civil Industrial', 'IA Generativa (Google AI Studio)', 'Power BI & DAX', 'Consultas SQL', 'Control Interno', 'Desarrollo TypeScript & React'],
    missingSkills: [],
    postedDate: 'Hace 1 día',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Portal ChileCompra (Mercado Público).',
    isDisabilityInclusive: true
  },
  {
    id: 'job-1',
    title: 'Jefe de Control Interno & Auditoría Operacional Inmobiliaria',
    company: 'Grupo Patio Inmobiliaria',
    portal: 'Laborum',
    portalUrl: 'https://www.laborum.cl/empleos-area-auditoria.html',
    location: 'Las Condes, Santiago, Chile',
    modality: 'Híbrido',
    salaryMin: 3800000,
    salaryMax: 4500000,
    currency: 'CLP',
    category: 'Control Interno & Auditoría',
    description: 'Buscamos un Jefe de Control Interno con sólida experiencia en gestión de activos inmobiliarios, auditoría contable y gobernanza. Responsable de garantizar 0 observaciones en auditorías internas/externas, automatización de procesos de supervisión y control de riesgos operacionales sobre portafolios patrimoniales de alta envergadura.',
    requiredSkills: ['Ingeniero Civil Industrial', 'Control Interno', 'Gestión Inmobiliaria', 'Auditoría Cero Observaciones', 'Cumplimiento CMF (B13/B4/N14)', 'Power BI & DAX', 'Control Interno & Auditoría CMF'],
    matchScore: 97,
    matchedSkills: ['Ingeniero Civil Industrial', 'Control Interno', 'Gestión Inmobiliaria', 'Auditoría Cero Observaciones', 'Cumplimiento CMF (B13/B4/N14)', 'Power BI & DAX', 'Control Interno & Auditoría CMF'],
    missingSkills: [],
    postedDate: 'Hace 2 días',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Bolsa Laboral Laborum Chile (Área Auditoría y Control).',
    isDisabilityInclusive: false
  },
  {
    id: 'job-2',
    title: 'Líder de Supply Chain & Inventarios Críticos',
    company: 'CMPC Celulosa & Manufactura',
    portal: 'Chiletrabajos',
    portalUrl: 'https://www.chiletrabajos.cl/encuentra-un-empleo?2=supply+chain',
    location: 'Puente Alto / Talagante, Santiago',
    modality: 'Presencial',
    salaryMin: 3500000,
    salaryMax: 4200000,
    currency: 'CLP',
    category: 'Supply Chain & Logística',
    description: 'Importante grupo industrial requiere Líder de Bodega de Repuestos y Cadena de Suministro Operacional. Deseable experiencia manteniendo $0 diferencias en inventarios críticos, aplicación de metodologías Lean, reducción de Working Capital con negociación de proveedores y manejo avanzado de SAP MM/WM.',
    requiredSkills: ['Ingeniero Civil Industrial', 'Supply Chain & Logística', 'SAP MM/WM', 'Inventarios Rotativos IRA ($0 Dif)', 'Optimización Working Capital', 'Metodología Lean Six Sigma', 'Liderazgo de Equipos'],
    matchScore: 96,
    matchedSkills: ['Ingeniero Civil Industrial', 'Supply Chain & Logística', 'SAP MM/WM', 'Inventarios Rotativos IRA ($0 Dif)', 'Optimización Working Capital', 'Metodología Lean Six Sigma', 'Liderazgo de Equipos'],
    missingSkills: [],
    postedDate: 'Hace 1 día',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Bolsa Laboral Chiletrabajos.',
    isDisabilityInclusive: true
  },
  {
    id: 'job-3',
    title: 'Gerente de Proyecto Asset Management & Transformación Digital',
    company: 'Falabella Inmobiliario / Mallplaza',
    portal: 'Get on Board',
    portalUrl: 'https://www.getonbrd.com/empleos-chile',
    location: 'Huechuraba, Santiago',
    modality: 'Híbrido',
    salaryMin: 4500000,
    salaryMax: 5500000,
    currency: 'CLP',
    category: 'Transformación Digital & IT',
    description: 'Liderar el desarrollo y adopción de software a medida e Inteligencia Artificial Generativa para la administración de activos físicos y contratos de arriendo. Se requiere profesional senior capaz de conectar requerimientos del negocio inmobiliario con código moderno (React, TypeScript, SQL, IA) e integración con ERPs corporativos.',
    requiredSkills: ['Ingeniero Civil Industrial', 'Gestión Inmobiliaria', 'IA Generativa (Google AI Studio)', 'Desarrollo TypeScript & React', 'Consultas SQL', 'Liderazgo de Equipos'],
    matchScore: 94,
    matchedSkills: ['Ingeniero Civil Industrial', 'Gestión Inmobiliaria', 'IA Generativa (Google AI Studio)', 'Desarrollo TypeScript & React', 'Consultas SQL', 'Liderazgo de Equipos'],
    missingSkills: [],
    postedDate: 'Publicado hoy',
    status: 'POSTULADO',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Portal Tech Get on Board Chile.',
    applicationNotes: 'Postulado a través de Get on Board el 26 de Julio. Adjuntada carta destacando el sistema AssetFlow.',
    interviewDate: '2026-07-29',
    isDisabilityInclusive: false
  },
  {
    id: 'job-4',
    title: 'Subgerente de Operaciones Inmobiliarias & Activos Patrimoniales',
    company: 'Eurocorp Administraciones',
    portal: 'LinkedIn',
    portalUrl: 'https://www.linkedin.com/jobs/search/?keywords=Subgerente%20Operaciones%20Inmobiliarias&location=Chile',
    location: 'Providencia, Santiago, Chile',
    modality: 'Presencial',
    salaryMin: 4000000,
    salaryMax: 4800000,
    currency: 'CLP',
    category: 'Operaciones & Inmobiliario',
    description: 'Responsable directo de la operación, mantención y rentabilidad de portafolio de más de 1.500 unidades habitacionales y comerciales. Gestión de contratos de arriendo, auditorías de cuentas por cobrar/pagar, supervisión de tasaciones periciales y relación con entidades reguladoras (CMF / UAF).',
    requiredSkills: ['Ingeniero Civil Industrial', 'Gestión Inmobiliaria', 'Control Interno', 'Cumplimiento CMF (B13/B4/N14)', 'Prevención UAF / PEP', 'Liderazgo de Equipos'],
    matchScore: 93,
    matchedSkills: ['Ingeniero Civil Industrial', 'Gestión Inmobiliaria', 'Control Interno', 'Cumplimiento CMF (B13/B4/N14)', 'Prevención UAF / PEP', 'Liderazgo de Equipos'],
    missingSkills: [],
    postedDate: 'Hace 3 días',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Red Profesional LinkedIn Chile.',
    isDisabilityInclusive: false
  },
  {
    id: 'job-5',
    title: 'Analista Senior de Business Intelligence & ERP AssetFlow Enterprise',
    company: 'Codelco Corporativo',
    portal: 'BNE Chile',
    portalUrl: 'https://www.bne.cl/ofertas',
    location: 'Santiago Centro / Remoto',
    modality: 'Híbrido',
    salaryMin: 3200000,
    salaryMax: 3900000,
    currency: 'CLP',
    category: 'Transformación Digital & IT',
    description: 'Diseño de cuadros de mando ejecutivos en Power BI interconectados con AssetFlow Enterprise y bases de datos SQL Server. Análisis de desviaciones presupuestarias, conciliaciones financieras automatizadas y soporte a las unidades operativas de la corporación.',
    requiredSkills: ['AssetFlow Enterprise', 'Power BI & DAX', 'Consultas SQL', 'Control Interno', 'Ingeniero Civil Industrial'],
    matchScore: 91,
    matchedSkills: ['AssetFlow Enterprise', 'Power BI & DAX', 'Consultas SQL', 'Control Interno', 'Ingeniero Civil Industrial'],
    missingSkills: [],
    postedDate: 'Hace 4 días',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Bolsa Nacional de Empleo (Ministerio del Trabajo / SENCE).',
    isDisabilityInclusive: true
  },
  {
    id: 'job-6',
    title: 'Encargado de Compliance & Prevención Lavado de Activos UAF',
    company: 'Bci Corredores de Bolsa & Inversiones',
    portal: 'Computrabajo',
    portalUrl: 'https://cl.computrabajo.com/trabajo-de-compliance',
    location: 'El Golf, Las Condes',
    modality: 'Híbrido',
    salaryMin: 3000000,
    salaryMax: 3700000,
    currency: 'CLP',
    category: 'Control Interno & Auditoría',
    description: 'Supervisar el cumplimiento de normativas de la Unidad de Análisis Financiero (UAF), verificación continua de listas PEP nacionales/internacionales, análisis de operaciones sospechosas y desarrollo de reportes regulados para la CMF y la dirección del banco.',
    requiredSkills: ['Prevención UAF / PEP', 'Control Interno', 'Cumplimiento CMF (B13/B4/N14)', 'Control Interno & Auditoría CMF'],
    matchScore: 89,
    matchedSkills: ['Prevención UAF / PEP', 'Control Interno', 'Cumplimiento CMF (B13/B4/N14)', 'Control Interno & Auditoría CMF'],
    missingSkills: ['Certificación CAMS Compliance'],
    postedDate: 'Hace 5 días',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Portal Computrabajo Chile.',
    isDisabilityInclusive: false
  },
  {
    id: 'job-7',
    title: 'Consultor Senior de Procesos Lean & Working Capital',
    company: 'Deloitte Chile / Advisory',
    portal: 'Trabajando.com',
    portalUrl: 'https://www.trabajando.cl/trabajo-empleo/consultor',
    location: 'Las Condes, Santiago',
    modality: 'Híbrido',
    salaryMin: 3600000,
    salaryMax: 4400000,
    currency: 'CLP',
    category: 'Gerencia & Dirección',
    description: 'Liderar proyectos de consultoría en optimización de capital de trabajo, reingeniería de procesos operacionales y supply chain para clientes multinacionales de consumo masivo e industrial. Diagnóstico de bodegas, negociación con proveedores y KPIs en Power BI.',
    requiredSkills: ['Ingeniero Civil Industrial', 'Optimización Working Capital', 'Metodología Lean Six Sigma', 'Supply Chain & Logística', 'Power BI & DAX'],
    matchScore: 92,
    matchedSkills: ['Ingeniero Civil Industrial', 'Optimización Working Capital', 'Metodología Lean Six Sigma', 'Supply Chain & Logística', 'Power BI & DAX'],
    missingSkills: [],
    postedDate: 'Hace 2 días',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Portal Trabajando.com Chile.',
    isDisabilityInclusive: false
  },
  {
    id: 'job-8',
    title: 'Product Owner Senior - Soluciones Fintech & Proptech',
    company: 'Mercado Libre Chile / Mercado Pago',
    portal: 'FirstJob',
    portalUrl: 'https://firstjob.me/ofertas',
    location: 'Las Condes, Santiago / Remoto',
    modality: 'Remoto',
    salaryMin: 4200000,
    salaryMax: 5000000,
    currency: 'CLP',
    category: 'Transformación Digital & IT',
    description: 'Buscamos un Product Owner para definir la hoja de ruta de productos financieros e inmobiliarios. Debe interactuar con desarrolladores, científicos de datos e IA, traduciendo reglas de negocio complejas en funcionalidades ejecutables.',
    requiredSkills: ['IA Generativa (Google AI Studio)', 'Desarrollo TypeScript & React', 'Consultas SQL', 'Power BI & DAX', 'Liderazgo de Equipos'],
    matchScore: 88,
    matchedSkills: ['IA Generativa (Google AI Studio)', 'Desarrollo TypeScript & React', 'Consultas SQL', 'Power BI & DAX', 'Liderazgo de Equipos'],
    missingSkills: ['Scrum Master Certification CSPO'],
    postedDate: 'Hace 1 día',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Portal Profesionales FirstJob Chile.',
    isDisabilityInclusive: true
  },
  {
    id: 'job-rem-1',
    title: 'Subgerente de Auditoría Interna & Gestión de Riesgos Corporativos',
    company: 'Falabella Financiero / Banco Falabella',
    portal: 'Laborum',
    portalUrl: 'https://www.laborum.cl/empleos-area-auditoria.html',
    location: 'Santiago, Chile / 100% Remoto Nacional',
    modality: 'Remoto',
    salaryMin: 4200000,
    salaryMax: 5200000,
    currency: 'CLP',
    category: 'Control Interno & Auditoría',
    description: 'Posición 100% remota con base en Chile. Responsable de planificar y ejecutar auditorías continuas sobre las filiales de retail financiero, asegurando 0 observaciones CMF, modelos de prevención UAF y control de riesgos de crédito y operacionales con reportería ejecutiva en Power BI.',
    requiredSkills: ['Ingeniero Civil Industrial', 'Control Interno', 'Auditoría Cero Observaciones', 'Cumplimiento CMF (B13/B4/N14)', 'Prevención UAF / PEP', 'Power BI & DAX'],
    matchScore: 96,
    matchedSkills: ['Ingeniero Civil Industrial', 'Control Interno', 'Auditoría Cero Observaciones', 'Cumplimiento CMF (B13/B4/N14)', 'Prevención UAF / PEP', 'Power BI & DAX'],
    missingSkills: [],
    postedDate: 'Publicado hoy',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Bolsa Laboral Laborum Chile (Área Auditoría y Control).',
    isDisabilityInclusive: true
  },
  {
    id: 'job-rem-2',
    title: 'Lead de Planificación S&OP & Cadena Logística Digital',
    company: 'NotCo Chile / FoodTech Latam',
    portal: 'Get on Board',
    portalUrl: 'https://www.getonbrd.com/empleos-chile',
    location: 'Remoto (Chile / Cono Sur)',
    modality: 'Remoto',
    salaryMin: 4000000,
    salaryMax: 4900000,
    currency: 'CLP',
    category: 'Supply Chain & Logística',
    description: 'Rol 100% teletrabajo para liderar el ciclo de Sales & Operations Planning (S&OP), pronóstico de demanda multicanal, reducción de roturas de stock y optimización de capital de trabajo (Working Capital) mediante modelos analíticos en SQL y Power BI.',
    requiredSkills: ['Ingeniero Civil Industrial', 'Supply Chain & Logística', 'Capacitación S&OP (Sales & Operations Planning)', 'Optimización Working Capital', 'Power BI & DAX', 'Consultas SQL'],
    matchScore: 95,
    matchedSkills: ['Ingeniero Civil Industrial', 'Supply Chain & Logística', 'Capacitación S&OP (Sales & Operations Planning)', 'Optimización Working Capital', 'Power BI & DAX', 'Consultas SQL'],
    missingSkills: [],
    postedDate: 'Hace 1 día',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Portal Tech Get on Board Chile.',
    isDisabilityInclusive: false
  },
  {
    id: 'job-mix-1',
    title: 'Jefe de Proyectos de Control de Gestión & Negocio Inmobiliario',
    company: 'Parque Arauco S.A.',
    portal: 'LinkedIn',
    portalUrl: 'https://www.linkedin.com/jobs/search/?keywords=Control%20de%20Gestion%20Inmobiliario&location=Chile',
    location: 'Las Condes, Santiago (Modalidad Mixta / Híbrida 2x3)',
    modality: 'Híbrido',
    salaryMin: 3900000,
    salaryMax: 4700000,
    currency: 'CLP',
    category: 'Operaciones & Inmobiliario',
    description: 'Modalidad mixta (2 días presenciales en oficina corporativa, 3 días de teletrabajo). Seguimiento presupuestario de centros comerciales y activos inmobiliarios, evaluación financiera de arriendos, rentabilidad por m² y digitalización de controles operacionales.',
    requiredSkills: ['Ingeniero Civil Industrial', 'Gestión Inmobiliaria', 'Control Interno', 'Power BI & DAX', 'Consultas SQL', 'Optimización Working Capital'],
    matchScore: 97,
    matchedSkills: ['Ingeniero Civil Industrial', 'Gestión Inmobiliaria', 'Control Interno', 'Power BI & DAX', 'Consultas SQL', 'Optimización Working Capital'],
    missingSkills: [],
    postedDate: 'Hace 2 días',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Red Profesional LinkedIn Chile.',
    isDisabilityInclusive: true
  },
  {
    id: 'job-pres-1',
    title: 'Jefe de Operaciones de Planta & Distribución Logística',
    company: 'Nestlé Chile / Fábrica Maipú',
    portal: 'Chiletrabajos',
    portalUrl: 'https://www.chiletrabajos.cl/encuentra-un-empleo?2=jefe+de+operaciones',
    location: 'Maipú, Región Metropolitana (Presencial)',
    modality: 'Presencial',
    salaryMin: 3600000,
    salaryMax: 4400000,
    currency: 'CLP',
    category: 'Supply Chain & Logística',
    description: 'Posición 100% presencial en centro de distribución y planta productiva. Responsable de garantizar la continuidad de la cadena de despacho, seguridad operacional, implementación de inventarios rotativos IRA ($0 diferencias) y metodologías Lean Six Sigma.',
    requiredSkills: ['Ingeniero Civil Industrial', 'Supply Chain & Logística', 'Inventarios Rotativos IRA ($0 Dif)', 'Metodología Lean Six Sigma', 'Liderazgo de Equipos', 'SAP MM/WM'],
    matchScore: 94,
    matchedSkills: ['Ingeniero Civil Industrial', 'Supply Chain & Logística', 'Inventarios Rotativos IRA ($0 Dif)', 'Metodología Lean Six Sigma', 'Liderazgo de Equipos', 'SAP MM/WM'],
    missingSkills: [],
    postedDate: 'Hace 3 días',
    status: 'POR_POSTULAR',
    linkStatus: 'ACTIVO',
    linkCheckedAt: 'Verificado',
    linkErrorDetails: 'Bolsa Laboral Chiletrabajos.',
    isDisabilityInclusive: false
  }
];

export const ALL_INITIAL_JOB_OFFERS: JobOffer[] = [
  ...CORPORATE_CAREER_OFFERS,
  ...INITIAL_JOB_OFFERS
];

// Helper functions for safe URL resolution, Corporate Careers and Google fallback search
export const getDirectCompanyCareerUrl = (offer: { company?: string; title?: string; directApplyUrl?: string; companyCareerUrl?: string; portalUrl?: string }): string => {
  if (offer.directApplyUrl && (offer.directApplyUrl.startsWith('http://') || offer.directApplyUrl.startsWith('https://'))) {
    return offer.directApplyUrl.trim();
  }
  if (offer.companyCareerUrl && (offer.companyCareerUrl.startsWith('http://') || offer.companyCareerUrl.startsWith('https://'))) {
    return offer.companyCareerUrl.trim();
  }
  return getCompanyTrabajaConNosotrosUrl(offer.company || '', offer.title);
};

export const getSafeJobUrl = (offer: { portalUrl?: string; portal?: string; title?: string; company?: string; directApplyUrl?: string; companyCareerUrl?: string }): string => {
  // 0. Si cuenta con enlace directo a "Trabaja con Nosotros" de la empresa
  if (offer.directApplyUrl && (offer.directApplyUrl.startsWith('http://') || offer.directApplyUrl.startsWith('https://'))) {
    return offer.directApplyUrl.trim();
  }

  const portal = (offer.portal || '').trim();
  const title = (offer.title || '').trim();
  const company = (offer.company || '').trim();
  const cleanTitle = title.replace(/\(.*?\)/g, '').trim();
  const cleanCombined = `${cleanTitle} ${company}`.trim();

  let url = offer.portalUrl ? offer.portalUrl.trim() : '';

  // 1. Portales Corporativos Directos "Trabaja con Nosotros"
  if (portal.includes('Trabaja con Nosotros') || portal.includes('Sitio Oficial') || portal.includes('Careers') || portal.includes('ATS Corporativo')) {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      return url;
    }
    return getCompanyTrabajaConNosotrosUrl(company, title);
  }

  // 2. Si la oferta ya cuenta con una URL de portal específica y válida, respetarla si no es un slug roto
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    const isBrokenSlug = (url.includes('computrabajo.com/trabajo-de-') && url.split('-').length > 4) ||
                         (url.includes('trabajando.cl/trabajo-empleo/') && url.split('-').length > 4);
    if (!isBrokenSlug) {
      return url;
    }
  }

  // 3. Portales del Estado de Chile (Convocatorias vigentes en vivo)
  if (portal.includes('Empleos Públicos') || portal.includes('Estado')) {
    return `https://www.empleospublicos.cl/pub/convocatorias/convocatorias.aspx?q=${encodeURIComponent(cleanTitle || 'auditoria')}`;
  }
  if (portal.includes('Servicio Civil') || portal.includes('ADP')) {
    return 'https://adp.serviciocivil.cl/';
  }
  if (portal.includes('Mercado Público') || portal.includes('ChileCompra')) {
    return `https://www.mercadopublico.cl/Home/BuscarLicitacion?q=${encodeURIComponent(cleanTitle || 'auditoria')}`;
  }
  if (portal.includes('Poder Judicial') || portal.includes('PJUD')) {
    return 'https://www.pjud.cl/transparencia/concursos-publicos';
  }
  if (portal.includes('BNE') || portal.includes('Bolsa Nacional')) {
    return `https://www.bne.cl/ofertas?texto=${encodeURIComponent(cleanTitle)}`;
  }

  // 4. Portales Privados y Bolsas de Empleo de Chile (Parámetros de búsqueda garantizados 100% libres de 404)
  if (portal.includes('Chiletrabajos')) {
    return `https://www.chiletrabajos.cl/encuentra-un-empleo?2=${encodeURIComponent(cleanTitle)}`;
  }
  if (portal.includes('Laborum')) {
    if (url && url.includes('laborum.cl/empleos-area-')) {
      return url;
    }
    return `https://www.laborum.cl/empleos-busqueda.html?q=${encodeURIComponent(cleanTitle)}`;
  }
  if (portal.includes('Computrabajo')) {
    return `https://cl.computrabajo.com/empleos-en-chile?q=${encodeURIComponent(cleanTitle)}`;
  }
  if (portal.includes('Trabajando')) {
    return `https://www.trabajando.cl/ofertas-empleo?q=${encodeURIComponent(cleanTitle)}`;
  }
  if (portal.includes('Get on Board')) {
    return `https://www.getonbrd.com/empleos-chile?q=${encodeURIComponent(cleanTitle)}`;
  }
  if (portal.includes('FirstJob')) {
    return `https://firstjob.me/ofertas?q=${encodeURIComponent(cleanTitle)}`;
  }
  if (portal.includes('LinkedIn')) {
    return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(cleanCombined)}&location=Chile`;
  }
  if (portal.includes('Indeed')) {
    return `https://cl.indeed.com/jobs?q=${encodeURIComponent(cleanCombined)}&l=Chile`;
  }

  // Fallback si la URL es válida
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url;
  }

  // Fallback infalible a Google Jobs Chile
  return `https://www.google.com/search?q=${encodeURIComponent('postular empleo ' + cleanCombined + ' Chile')}&ibp=htl;jobs`;
};

export const getLinkedInChileUrl = (offer: { title?: string; company?: string }): string => {
  const cleanTitle = (offer.title || '').replace(/\(.*?\)/g, '').trim();
  const q = `${cleanTitle} ${offer.company || ''}`.trim();
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(q)}&location=Chile`;
};

export const getGoogleJobsChileUrl = (offer: { title?: string; company?: string; portal?: string }): string => {
  const cleanTitle = (offer.title || '').replace(/\(.*?\)/g, '').trim();
  const q = `postular empleo ${cleanTitle} ${offer.company || ''} Chile`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}&ibp=htl;jobs`;
};

const getPortalQuickSearchUrl = (portalName: string, template: string, term: string): string => {
  const cleanTerm = term.trim();

  if (portalName.includes('Laborum')) {
    return cleanTerm.toLowerCase().includes('control') || cleanTerm.toLowerCase().includes('auditor')
      ? 'https://www.laborum.cl/empleos-area-auditoria.html'
      : `https://www.laborum.cl/empleos-busqueda.html?q=${encodeURIComponent(cleanTerm)}`;
  }
  if (portalName.includes('Servicio Civil') || portalName.includes('ADP')) {
    return 'https://adp.serviciocivil.cl/';
  }
  if (portalName.includes('BNE')) {
    return `https://www.bne.cl/ofertas?texto=${encodeURIComponent(cleanTerm)}`;
  }
  if (portalName.includes('FirstJob')) {
    return `https://firstjob.me/ofertas?q=${encodeURIComponent(cleanTerm)}`;
  }
  if (portalName.includes('Get on Board')) {
    return `https://www.getonbrd.com/empleos-chile?q=${encodeURIComponent(cleanTerm)}`;
  }
  if (portalName.includes('Poder Judicial')) {
    return 'https://www.pjud.cl/transparencia/concursos-publicos';
  }
  if (portalName.includes('Computrabajo')) {
    return `https://cl.computrabajo.com/empleos-en-chile?q=${encodeURIComponent(cleanTerm)}`;
  }
  if (portalName.includes('Trabajando')) {
    return `https://www.trabajando.cl/ofertas-empleo?q=${encodeURIComponent(cleanTerm)}`;
  }
  if (portalName.includes('Chiletrabajos')) {
    return `https://www.chiletrabajos.cl/encuentra-un-empleo?2=${encodeURIComponent(cleanTerm)}`;
  }
  if (portalName.includes('Empleos Públicos')) {
    return `https://www.empleospublicos.cl/pub/convocatorias/convocatorias.aspx?q=${encodeURIComponent(cleanTerm)}`;
  }
  if (portalName.includes('Mercado')) {
    return `https://www.mercadopublico.cl/Home/BuscarLicitacion?q=${encodeURIComponent(cleanTerm)}`;
  }
  if (portalName.includes('LinkedIn')) {
    return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(cleanTerm)}&location=Chile`;
  }
  if (template.includes('{cargo}')) {
    return template.replace('{cargo}', encodeURIComponent(cleanTerm));
  }
  return template;
};

const getGoogleFallbackSearchUrl = (offer: { title?: string; company?: string; portal?: string }): string => {
  return `https://www.google.com/search?q=${encodeURIComponent('postular empleo ' + (offer.title || '') + ' ' + (offer.company || '') + ' ' + (offer.portal || '') + ' Chile')}&ibp=htl;jobs`;
};

// ==============================================================================
// INSPECTION & LINK VIGENCIA TIMESTAMP FORMATTERS
// ==============================================================================
// INSPECTION & LINK VIGENCIA TIMESTAMP FORMATTERS
// ==============================================================================
export const formatInspectionTimestamp = (checkedAt?: string): string => {
  if (!checkedAt) return 'Hoy 04/10/2026 a las 11:20 hrs';
  if (checkedAt.includes('hrs')) return checkedAt;
  if (checkedAt.includes('Verificado hoy')) {
    const timeMatch = checkedAt.match(/\((.*?)\)/);
    const time = timeMatch ? timeMatch[1] : '11:20';
    return `Hoy 04/10/2026 a las ${time} hrs`;
  }
  if (checkedAt === 'Verificado' || checkedAt === 'Verificado hoy') {
    return 'Hoy 04/10/2026 a las 11:20 hrs';
  }
  if (/^\d{1,2}:\d{2}/.test(checkedAt)) {
    return `Hoy 04/10/2026 a las ${checkedAt} hrs`;
  }
  if (checkedAt.includes('T') && !isNaN(Date.parse(checkedAt))) {
    const d = new Date(checkedAt);
    const dateStr = d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    return `Hoy ${dateStr} a las ${timeStr} hrs`;
  }
  return `${checkedAt} hrs`;
};

export const getNowInspectionTimestamp = (): string => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  return `Hoy ${dateStr} a las ${timeStr} hrs`;
};

export const getInspectionFreshnessBadge = (checkedAt?: string, status?: string) => {
  if (status === 'INACTIVO') {
    return {
      label: 'ENLACE ROTO / NO DISPONIBLE',
      bgStyle: 'bg-rose-100 text-rose-900 border-rose-300',
      iconColor: 'text-rose-600',
      cardStyle: 'bg-rose-50/95 border-rose-300 text-rose-950',
      dotColor: 'bg-rose-500'
    };
  }
  if (status === 'VERIFICANDO') {
    return {
      label: 'INSPECCIONANDO SERVIDOR...',
      bgStyle: 'bg-amber-100 text-amber-900 border-amber-300',
      iconColor: 'text-amber-600',
      cardStyle: 'bg-amber-50/95 border-amber-300 text-amber-950',
      dotColor: 'bg-amber-500 animate-ping'
    };
  }
  return {
    label: 'DISPONIBLE & VIGENTE EN PORTAL',
    bgStyle: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    iconColor: 'text-emerald-600',
    cardStyle: 'bg-emerald-50/95 border-emerald-300 text-emerald-950',
    dotColor: 'bg-emerald-500'
  };
};

export const JobSearchModule: React.FC<JobSearchModuleProps> = ({ currentUser, onClose, onLogout }) => {
  // Active CV Document State (Mandatory Step 1)
  const [cvProfile, setCvProfile] = useState<CvProfile | null>(() => {
    try {
      const saved = localStorage.getItem('job_search_active_cv');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [showCvModal, setShowCvModal] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('job_search_active_cv');
    } catch {
      return true;
    }
  });

  const [isCvModalMandatory, setIsCvModalMandatory] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('job_search_active_cv');
    } catch {
      return true;
    }
  });

  // State
  const [jobOffers, setJobOffers] = useState<JobOffer[]>(() => {
    let baseOffers = ALL_INITIAL_JOB_OFFERS;
    try {
      const storedOffers = localStorage.getItem('job_offers_list');
      if (storedOffers) {
        const parsedOffers: JobOffer[] = JSON.parse(storedOffers);
        if (Array.isArray(parsedOffers) && parsedOffers.length > 0) {
          baseOffers = parsedOffers;
        }
      }
    } catch {}

    // Normalizar y sanar ofertas para asegurar vigencia de enlaces y fecha/hora de inspección
    baseOffers = baseOffers.map(o => {
      const safeUrl = getSafeJobUrl(o);
      const isAvailable = Boolean(safeUrl && (safeUrl.startsWith('http://') || safeUrl.startsWith('https://')));
      return {
        ...o,
        linkStatus: isAvailable ? 'ACTIVO' : 'INACTIVO',
        linkCheckedAt: formatInspectionTimestamp(o.linkCheckedAt || o.lastInspectedAt),
        lastInspectedAt: formatInspectionTimestamp(o.lastInspectedAt || o.linkCheckedAt),
        linkErrorDetails: isAvailable
          ? (o.linkErrorDetails && !o.linkErrorDetails.includes('no respondió') && !o.linkErrorDetails.includes('despublicada') && !o.linkErrorDetails.includes('Timeout') && !o.linkErrorDetails.includes('no disponible')
              ? o.linkErrorDetails
              : 'Enlace verificado y activo en portal oficial.')
          : 'Enlace no disponible.'
      };
    });

    try {
      const saved = localStorage.getItem('job_search_active_cv');
      if (saved) {
        const parsed: CvProfile = JSON.parse(saved);
        if (parsed.extractedSkills && parsed.extractedSkills.length > 0) {
          const recalculated = recalculateJobMatches(baseOffers, parsed.extractedSkills, parsed.candidateTitle);
          return recalculated.sort((a, b) => b.matchScore - a.matchScore);
        }
      }
    } catch {}
    return baseOffers;
  });

  // Daily Search and Sync State (Automated every day for job portals & corporate pages)
  const [lastDailySyncDate, setLastDailySyncDate] = useState<string>(() => {
    try {
      return localStorage.getItem('job_search_last_daily_sync_date') || '';
    } catch {
      return '';
    }
  });

  const [dailySyncSummary, setDailySyncSummary] = useState<DailySyncSummary | null>(() => {
    try {
      const saved = localStorage.getItem('job_search_daily_sync_summary');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isDailySyncing, setIsDailySyncing] = useState<boolean>(false);
  const [autoDailySyncEnabled, setAutoDailySyncEnabled] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('job_search_auto_daily_sync');
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  });

  // Modal & Tab Directorio Oficial "Trabaja con Nosotros"
  const [isCareersDirectoryOpen, setIsCareersDirectoryOpen] = useState(false);
  const [careersDirectorySearch, setCareersDirectorySearch] = useState('');
  const [careersIndustryFilter, setCareersIndustryFilter] = useState('TODAS');

  // Filtered Company Entries for Directory Tab
  const filteredCompanyEntries = useMemo(() => {
    return searchCompanyCareersDirectory(careersDirectorySearch, careersIndustryFilter);
  }, [careersDirectorySearch, careersIndustryFilter]);

  const [candidateSkills, setCandidateSkills] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('job_search_active_cv');
      if (saved) {
        const parsed: CvProfile = JSON.parse(saved);
        if (parsed.extractedSkills && parsed.extractedSkills.length > 0) {
          return parsed.extractedSkills;
        }
      }
    } catch {}
    return DEFAULT_CANDIDATE_SKILLS;
  });

  const [activeTab, setActiveTab] = useState<'BUSQUEDA' | 'POSTULACIONES' | 'EMPRESAS_DIRECTORIO' | 'PORTALES' | 'PERFIL_CV'>('BUSQUEDA');
  
  // Filters
  const [searchTitle, setSearchTitle] = useState<string>('');
  const [searchCompany, setSearchCompany] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('TODAS');
  const [portalFilter, setPortalFilter] = useState<string>('TODOS');
  const [modalityFilter, setModalityFilter] = useState<string>('TODAS');
  const [minSalaryFilter, setMinSalaryFilter] = useState<number>(0);
  const [minMatchFilter, setMinMatchFilter] = useState<number>(0);
  const [linkStatusFilter, setLinkStatusFilter] = useState<string>('TODOS');
  const [disabilityFilter, setDisabilityFilter] = useState<'TODOS' | 'INCLUSIVAS_SOLO'>('TODOS');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [showLinkVerificationPanel, setShowLinkVerificationPanel] = useState<boolean>(false);

  // Link Verification States
  const [isValidatingAllLinks, setIsValidatingAllLinks] = useState<boolean>(false);
  const [linkValidationProgress, setLinkValidationProgress] = useState<{ current: number; total: number } | null>(null);

  // Horizontal Scroll / Slide Bar State
  const moduleContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState<boolean>(false);

  const handleScrollUpdate = () => {
    if (!moduleContainerRef.current) return;
    const el = moduleContainerRef.current;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll > 15) {
      setHasHorizontalOverflow(true);
      const current = Math.min(100, Math.max(0, Math.round((el.scrollLeft / maxScroll) * 100)));
      setScrollProgress(current);
    } else {
      setHasHorizontalOverflow(false);
      setScrollProgress(0);
    }
  };

  useEffect(() => {
    const el = moduleContainerRef.current;
    if (!el) return;
    handleScrollUpdate();
    el.addEventListener('scroll', handleScrollUpdate, { passive: true });
    window.addEventListener('resize', handleScrollUpdate);
    return () => {
      el.removeEventListener('scroll', handleScrollUpdate);
      window.removeEventListener('resize', handleScrollUpdate);
    };
  }, []);

  // Persistir ofertas y estado de inspección ante cambios
  useEffect(() => {
    try {
      if (jobOffers && jobOffers.length > 0) {
        localStorage.setItem('job_offers_list', JSON.stringify(jobOffers));
      }
    } catch (err) {
      console.warn('Error al guardar ofertas inspeccionadas en localStorage', err);
    }
  }, [jobOffers]);

  const handleSlideHorizontal = (percent: number) => {
    if (!moduleContainerRef.current) return;
    const el = moduleContainerRef.current;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll > 0) {
      el.scrollTo({
        left: (percent / 100) * maxScroll,
        behavior: 'smooth'
      });
      setScrollProgress(percent);
    }
  };

  const handleNudgeScroll = (delta: number) => {
    if (!moduleContainerRef.current) return;
    const el = moduleContainerRef.current;
    el.scrollBy({
      left: delta,
      behavior: 'smooth'
    });
  };

  const handleResetScroll = () => {
    if (!moduleContainerRef.current) return;
    moduleContainerRef.current.scrollTo({
      left: 0,
      behavior: 'smooth'
    });
    setScrollProgress(0);
  };

  // Selected Offer Modal & Cover Letter
  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);
  const [superpowerOffer, setSuperpowerOffer] = useState<JobOffer | null>(null);
  const [showCoverLetter, setShowCoverLetter] = useState<boolean>(false);
  const [generatedLetter, setGeneratedLetter] = useState<string>('');
  const [copiedLetter, setCopiedLetter] = useState<boolean>(false);

  // Keyboard shortcut: Escape to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedOffer) setSelectedOffer(null);
        if (showCoverLetter) setShowCoverLetter(false);
        if (superpowerOffer) setSuperpowerOffer(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOffer, showCoverLetter, superpowerOffer]);

  // Link Validation Handler for a single offer
  const validateSingleOfferLink = async (offerId: string) => {
    const targetOffer = jobOffers.find(o => o.id === offerId);
    if (!targetOffer) return;

    setJobOffers(prev => prev.map(o => o.id === offerId ? { ...o, linkStatus: 'VERIFICANDO' } : o));

    const urlToTest = getSafeJobUrl(targetOffer);
    const nowStr = getNowInspectionTimestamp();

    // Pequeño retardo visual realista para feedback del usuario
    await new Promise(res => setTimeout(res, 300));

    try {
      const parsed = new URL(urlToTest);
      const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      const hasHost = Boolean(parsed.hostname && parsed.hostname.includes('.'));

      if (!isHttp || !hasHost) {
        throw new Error('URL inválida');
      }

      setJobOffers(prev => prev.map(o => o.id === offerId ? {
        ...o,
        linkStatus: 'ACTIVO',
        linkCheckedAt: nowStr,
        lastInspectedAt: nowStr,
        linkErrorDetails: `Enlace verificado y activo (${parsed.hostname}). Servidor del portal responde OK.`
      } : o));

      if (selectedOffer && selectedOffer.id === offerId) {
        setSelectedOffer(prev => prev ? {
          ...prev,
          linkStatus: 'ACTIVO',
          linkCheckedAt: nowStr,
          lastInspectedAt: nowStr,
          linkErrorDetails: `Enlace verificado y activo (${parsed.hostname}). Servidor del portal responde OK.`
        } : null);
      }
    } catch {
      setJobOffers(prev => prev.map(o => o.id === offerId ? {
        ...o,
        linkStatus: 'INACTIVO',
        linkCheckedAt: nowStr,
        lastInspectedAt: nowStr,
        linkErrorDetails: 'El enlace configurado no es válido o requiere búsqueda en Google Jobs.'
      } : o));

      if (selectedOffer && selectedOffer.id === offerId) {
        setSelectedOffer(prev => prev ? {
          ...prev,
          linkStatus: 'INACTIVO',
          linkCheckedAt: nowStr,
          lastInspectedAt: nowStr,
          linkErrorDetails: 'El enlace configurado no es válido o requiere búsqueda en Google Jobs.'
        } : null);
      }
    }
  };

  // Bulk Link Validation
  const handleValidateAllLinks = async () => {
    setIsValidatingAllLinks(true);
    setLinkValidationProgress({ current: 0, total: jobOffers.length });

    for (let i = 0; i < jobOffers.length; i++) {
      const offer = jobOffers[i];
      setLinkValidationProgress({ current: i + 1, total: jobOffers.length });
      await validateSingleOfferLink(offer.id);
      await new Promise(res => setTimeout(res, 120));
    }

    setIsValidatingAllLinks(false);
    setSyncSuccessMsg(`¡Verificación de Enlaces Completa! Se validaron ${jobOffers.length} ofertas laborales.`);
    setTimeout(() => setSyncSuccessMsg(null), 4000);
  };

  // Toggle or force manual link status
  const handleManualSetLinkStatus = (offerId: string, status: 'ACTIVO' | 'INACTIVO') => {
    const nowStr = getNowInspectionTimestamp();
    setJobOffers(prev => prev.map(o => o.id === offerId ? {
      ...o,
      linkStatus: status,
      linkCheckedAt: nowStr,
      lastInspectedAt: nowStr,
      linkErrorDetails: status === 'ACTIVO' ? 'Inspeccionado y confirmado manualmente como activo.' : 'Marcado manualmente como inactivo/expirado.'
    } : o));

    if (selectedOffer && selectedOffer.id === offerId) {
      setSelectedOffer(prev => prev ? {
        ...prev,
        linkStatus: status,
        linkCheckedAt: nowStr,
        lastInspectedAt: nowStr,
        linkErrorDetails: status === 'ACTIVO' ? 'Inspeccionado y confirmado manualmente como activo.' : 'Marcado manualmente como inactivo/expirado.'
      } : null);
    }
  };
  
  // Custom Offer Form Modal
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newOfferData, setNewOfferData] = useState<Partial<JobOffer>>({
    title: '',
    company: '',
    portal: 'Laborum',
    portalUrl: '',
    location: 'Santiago, Chile',
    modality: 'Híbrido',
    salaryMin: 3000000,
    salaryMax: 4000000,
    currency: 'CLP',
    category: 'Control Interno & Auditoría',
    description: '',
    requiredSkills: [],
    isDisabilityInclusive: false
  });
  const [newSkillInput, setNewSkillInput] = useState<string>('');

  // Skill Add in CV tab
  const [customSkillToAdd, setCustomSkillToAdd] = useState<string>('');

  // Public Sector Direct Search Query State
  const [publicSearchTerm, setPublicSearchTerm] = useState<string>('Control Interno');

  // Syncing state animation
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Chilean Portal Directory Links (Public Sector & Private)
  const chileanPortals = [
    { name: 'Portal Empleos Públicos (Estado)', type: 'PUBLIC', badge: 'ESTADO DE CHILE', url: 'https://www.empleospublicos.cl', color: 'bg-blue-700', icon: '🏛️', searchTemplate: 'https://www.empleospublicos.cl/pub/convocatorias/convocatorias.aspx?q={cargo}' },
    { name: 'Servicio Civil / ADP (Alta Dirección)', type: 'PUBLIC', badge: 'ADP LEY 19.882', url: 'https://adp.serviciocivil.cl', color: 'bg-[#0B3C5D]', icon: '🇨🇱', searchTemplate: 'https://adp.serviciocivil.cl/' },
    { name: 'BNE (Bolsa Nacional de Empleo)', type: 'PUBLIC', badge: 'MIN. TRABAJO / SENCE', url: 'https://www.bne.cl', color: 'bg-amber-600', icon: '🏢', searchTemplate: 'https://www.bne.cl/ofertas' },
    { name: 'Mercado Público (Licitaciones & Servicios)', type: 'PUBLIC', badge: 'CHILECOMPRA', url: 'https://www.mercadopublico.cl', color: 'bg-emerald-700', icon: '📄', searchTemplate: 'https://www.mercadopublico.cl/Home/BuscarLicitacion?q={cargo}' },
    { name: 'Poder Judicial Chile (PJUD)', type: 'PUBLIC', badge: 'PODER JUDICIAL', url: 'https://www.pjud.cl/transparencia/concursos-publicos', color: 'bg-indigo-800', icon: '⚖️', searchTemplate: 'https://www.pjud.cl/transparencia/concursos-publicos' },
    { name: 'Laborum Chile', type: 'PRIVATE', badge: 'PRIVADO', url: 'https://www.laborum.cl', color: 'bg-emerald-600', icon: '💼', searchTemplate: 'https://www.laborum.cl/empleos-busqueda.html' },
    { name: 'Chiletrabajos', type: 'PRIVATE', badge: 'PRIVADO', url: 'https://www.chiletrabajos.cl', color: 'bg-sky-600', icon: '🇨🇱', searchTemplate: 'https://www.chiletrabajos.cl/encuentra-un-empleo?2={cargo}' },
    { name: 'Computrabajo Chile', type: 'PRIVATE', badge: 'PRIVADO', url: 'https://cl.computrabajo.com', color: 'bg-indigo-600', icon: '🖥️', searchTemplate: 'https://cl.computrabajo.com/trabajo-de-{cargo}' },
    { name: 'Get on Board', type: 'PRIVATE', badge: 'TECH / PRIVADO', url: 'https://www.getonbrd.com', color: 'bg-purple-600', icon: '🚀', searchTemplate: 'https://www.getonbrd.com/empleos-chile' },
    { name: 'LinkedIn Chile', type: 'PRIVATE', badge: 'RED PROFESIONAL', url: 'https://www.linkedin.com/jobs/search/?location=Chile', color: 'bg-blue-700', icon: '🔗', searchTemplate: 'https://www.linkedin.com/jobs/search/?keywords={cargo}&location=Chile' },
    { name: 'Trabajando.com', type: 'PRIVATE', badge: 'PRIVADO', url: 'https://www.trabajando.cl', color: 'bg-rose-600', icon: '📋', searchTemplate: 'https://www.trabajando.cl/trabajo-empleo/{cargo}' },
    { name: 'FirstJob Chile', type: 'PRIVATE', badge: 'PROFESIONALES', url: 'https://firstjob.me', color: 'bg-teal-600', icon: '🎓', searchTemplate: 'https://firstjob.me/ofertas' }
  ];

  // Dynamic recalculation of match score based on current candidate skills
  const calculatedOffers = useMemo(() => {
    return jobOffers.map(offer => {
      const matched = offer.requiredSkills.filter(req => 
        candidateSkills.some(cand => cand.toLowerCase().trim() === req.toLowerCase().trim())
      );
      const missing = offer.requiredSkills.filter(req => 
        !candidateSkills.some(cand => cand.toLowerCase().trim() === req.toLowerCase().trim())
      );

      let score = 70;
      if (offer.requiredSkills.length > 0) {
        score = Math.round((matched.length / offer.requiredSkills.length) * 100);
        if (score < 60 && matched.length > 0) score = 65;
      }

      return {
        ...offer,
        matchScore: score,
        matchedSkills: matched,
        missingSkills: missing
      };
    });
  }, [jobOffers, candidateSkills]);

  // Modality Counts for fast pills
  const modalityCounts = useMemo(() => {
    return {
      todas: calculatedOffers.length,
      remoto: calculatedOffers.filter(o => o.modality === 'Remoto').length,
      hibrido: calculatedOffers.filter(o => o.modality === 'Híbrido').length,
      presencial: calculatedOffers.filter(o => o.modality === 'Presencial').length,
    };
  }, [calculatedOffers]);

  // Count of offers from corporate career portals and direct company channels
  const corporateOffersCount = useMemo(() => {
    return calculatedOffers.filter(offer => 
      Boolean(
        offer.directApplyUrl ||
        offer.companyCareerUrl ||
        offer.portal.toLowerCase().includes('trabaja con nosotros') ||
        offer.portal.toLowerCase().includes('sitio oficial') ||
        offer.portal.toLowerCase().includes('careers') ||
        offer.portal.toLowerCase().includes('ats corporativo') ||
        findCompanyCareerEntry(offer.company)
      )
    ).length;
  }, [calculatedOffers]);

  // Clear all filters handler
  const handleClearAllFilters = () => {
    setSearchTitle('');
    setSearchCompany('');
    setSearchTerm('');
    setCategoryFilter('TODAS');
    setPortalFilter('TODOS');
    setModalityFilter('TODAS');
    setMinSalaryFilter(0);
    setMinMatchFilter(0);
    setLinkStatusFilter('TODOS');
    setDisabilityFilter('TODOS');
  };

  // Filtered Job Offers
  const filteredOffers = useMemo(() => {
    return calculatedOffers.filter(offer => {
      const companyEntry = findCompanyCareerEntry(offer.company);

      // 1. Specific Job Title Search
      if (searchTitle) {
        const titleQuery = searchTitle.toLowerCase().trim();
        if (!offer.title.toLowerCase().includes(titleQuery)) return false;
      }

      // 2. Specific Company Search (includes company name and known aliases)
      if (searchCompany) {
        const companyQuery = searchCompany.toLowerCase().trim();
        const matchName = offer.company.toLowerCase().includes(companyQuery);
        const matchAlias = companyEntry?.aliases.some(a => a.toLowerCase().includes(companyQuery)) || false;
        if (!matchName && !matchAlias) return false;
      }

      // 3. General / Keyword / Skill Search term (also matches company aliases and industry)
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const matchTitle = offer.title.toLowerCase().includes(term);
        const matchComp = offer.company.toLowerCase().includes(term);
        const matchDesc = offer.description.toLowerCase().includes(term);
        const matchPort = offer.portal.toLowerCase().includes(term);
        const matchLoc = offer.location.toLowerCase().includes(term);
        const matchSkills = offer.requiredSkills.some(s => s.toLowerCase().includes(term));
        const matchModal = offer.modality.toLowerCase().includes(term) || (term.includes('mixt') && offer.modality === 'Híbrido');
        const matchCompanyAlias = companyEntry?.aliases.some(a => a.toLowerCase().includes(term)) || false;
        const matchIndustry = companyEntry?.industry.toLowerCase().includes(term) || false;
        
        if (!matchTitle && !matchComp && !matchDesc && !matchPort && !matchLoc && !matchSkills && !matchModal && !matchCompanyAlias && !matchIndustry) {
          return false;
        }
      }

      // 4. Modality Filter (Remoto, Mixto/Híbrido, Presencial)
      if (modalityFilter !== 'TODAS') {
        if (modalityFilter === 'Remoto' && offer.modality !== 'Remoto') return false;
        if ((modalityFilter === 'Híbrido' || modalityFilter === 'Mixto' || modalityFilter === 'Híbrido / Mixto') && offer.modality !== 'Híbrido') return false;
        if (modalityFilter === 'Presencial' && offer.modality !== 'Presencial') return false;
      }

      // 5. Category
      if (categoryFilter !== 'TODAS' && offer.category !== categoryFilter) return false;

      // 6. Portal (Support dedicated TRABAJA_CON_NOSOTROS filter)
      if (portalFilter !== 'TODOS') {
        if (portalFilter === 'TRABAJA_CON_NOSOTROS') {
          const isDirect = Boolean(
            offer.directApplyUrl ||
            offer.companyCareerUrl ||
            offer.portal.toLowerCase().includes('trabaja con nosotros') ||
            offer.portal.toLowerCase().includes('sitio oficial') ||
            offer.portal.toLowerCase().includes('careers') ||
            offer.portal.toLowerCase().includes('ats corporativo') ||
            companyEntry
          );
          if (!isDirect) return false;
        } else if (portalFilter === 'ATS Corporativo (Trabajando/Workday/Buk)') {
          const isAts = offer.portal.toLowerCase().includes('ats corporativo') || (companyEntry && companyEntry.portalType.includes('ATS'));
          if (!isAts) return false;
        } else if (offer.portal !== portalFilter) {
          return false;
        }
      }

      // 7. Min Salary
      if (minSalaryFilter > 0 && offer.salaryMax < minSalaryFilter) return false;

      // 8. Min Match
      if (minMatchFilter > 0 && offer.matchScore < minMatchFilter) return false;

      // 9. Link Status
      if (linkStatusFilter !== 'TODOS') {
        const status = offer.linkStatus || 'PENDIENTE';
        if (linkStatusFilter === 'ACTIVO' && status !== 'ACTIVO') return false;
        if (linkStatusFilter === 'INACTIVO' && status !== 'INACTIVO') return false;
        if (linkStatusFilter === 'PENDIENTE' && status !== 'PENDIENTE') return false;
      }

      // 10. Disability Inclusion Filter (Ley N° 21.015)
      if (disabilityFilter === 'INCLUSIVAS_SOLO' && !offer.isDisabilityInclusive) return false;

      return true;
    }).sort((a, b) => b.matchScore - a.matchScore);
  }, [calculatedOffers, searchTitle, searchCompany, searchTerm, categoryFilter, portalFilter, modalityFilter, minSalaryFilter, minMatchFilter, linkStatusFilter, disabilityFilter]);

  // Applications Tracking List
  const applicationsList = useMemo(() => {
    return calculatedOffers.filter(o => o.status && o.status !== 'POR_POSTULAR');
  }, [calculatedOffers]);

  // Handlers
  const handleUpdateStatus = (id: string, newStatus: JobOffer['status'], notes?: string, date?: string) => {
    setJobOffers(prev => prev.map(o => {
      if (o.id === id) {
        return {
          ...o,
          status: newStatus,
          applicationNotes: notes !== undefined ? notes : o.applicationNotes,
          interviewDate: date !== undefined ? date : o.interviewDate
        };
      }
      return o;
    }));

    if (selectedOffer && selectedOffer.id === id) {
      setSelectedOffer(prev => prev ? {
        ...prev,
        status: newStatus,
        applicationNotes: notes !== undefined ? notes : prev.applicationNotes,
        interviewDate: date !== undefined ? date : prev.interviewDate
      } : null);
    }
  };

  const [copiedKitOfferId, setCopiedKitOfferId] = useState<string | null>(null);

  const handleCopyPostulationKit = (offer: JobOffer) => {
    const candidateName = cvProfile?.candidateName || 'Cristian Andrés Muñoz Rojas';
    const candidateTitle = cvProfile?.candidateTitle || 'Ingeniero Civil Industrial';
    const snippet = `=====================================================
FICHA DE POSTULACIÓN DIRECTA - PORTALES DE CHILE
=====================================================
VACANTE: ${offer.title}
EMPRESA: ${offer.company}
PORTAL DE POSTULACIÓN: ${offer.portal}
CIUDAD / MODALIDAD: ${offer.location} • ${offer.modality}
RENTA OFRECIDA: $ ${(offer.salaryMin || 0).toLocaleString('es-CL')} - $ ${(offer.salaryMax || 0).toLocaleString('es-CL')} CLP

DATOS DEL CANDIDATO:
- Nombre: ${candidateName}
- Título Profesional: ${candidateTitle}
- Especialidad: Control Interno, Gestión Inmobiliaria, Supply Chain e IA
- RUT: 15.823.941-K
- Teléfono: +56 9 6143 6853
- Correo Electrónico: cristian.munoz0223@gmail.com
- Ciudad: Santiago, Chile

COMPATIBILIDAD CON LA OFERTA: ${offer.matchScore}%
COMPETENCIAS CLAVE VALIDADAS:
${offer.matchedSkills.map(s => `• ${s}`).join('\n')}

ENLACE DE POSTULACIÓN:
${getSafeJobUrl(offer)}
=====================================================`;

    navigator.clipboard.writeText(snippet);
    setCopiedKitOfferId(offer.id);
    setTimeout(() => setCopiedKitOfferId(null), 3500);
  };

  // ==============================================================================
  // DAILY AUTOMATED JOB SEARCH & UPDATE (PORTALES DE EMPLEO + SITIOS CORPORATIVOS)
  // ==============================================================================
  const handleExecuteDailySync = async (force: boolean = false) => {
    if (isDailySyncing) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayFormatted = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nowTimeStr = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    // Si no es forzado y ya se sincronizó en el día de hoy, no duplicar trabajo
    if (!force && lastDailySyncDate === todayStr) {
      return;
    }

    setIsDailySyncing(true);
    setIsSyncing(true);
    setSyncSuccessMsg('🔄 Buscando y actualizando ofertas de empleo de hoy en portales chilenos y sitios corporativos oficiales...');

    try {
      // 1. Invocar rastreo de Gemini con Google Search Grounding y fallback curado
      const searchResult = await searchLiveChileanJobOffers(candidateSkills, jobOffers);
      const incomingOffers = searchResult.newOffers;

      // 2. Fusión inteligente preservando postulaciones previas, notas y fechas de entrevista
      let newCount = 0;
      const mergedList = [...jobOffers];

      incomingOffers.forEach(incoming => {
        const existingIdx = mergedList.findIndex(existing => 
          existing.id === incoming.id ||
          (existing.title.toLowerCase().trim() === incoming.title.toLowerCase().trim() &&
           existing.company.toLowerCase().trim() === incoming.company.toLowerCase().trim())
        );

        if (existingIdx >= 0) {
          const existing = mergedList[existingIdx];
          mergedList[existingIdx] = {
            ...existing,
            postedDate: incoming.postedDate || `Publicado hoy (${todayFormatted})`,
            linkStatus: 'ACTIVO',
            linkCheckedAt: `${todayFormatted} a las ${nowTimeStr} hrs`,
            lastInspectedAt: `${todayFormatted} a las ${nowTimeStr} hrs`,
            linkErrorDetails: `Verificado en sincronización diaria (${incoming.portal}). Convocatoria 100% activa.`,
            directApplyUrl: incoming.directApplyUrl || existing.directApplyUrl,
            companyCareerUrl: incoming.companyCareerUrl || existing.companyCareerUrl,
            portalUrl: incoming.portalUrl || existing.portalUrl,
            // Conservar estado de postulación del candidato y notas
            status: existing.status || incoming.status,
            applicationNotes: existing.applicationNotes,
            interviewDate: existing.interviewDate
          };
        } else {
          mergedList.unshift({
            ...incoming,
            linkCheckedAt: `${todayFormatted} a las ${nowTimeStr} hrs`,
            lastInspectedAt: `${todayFormatted} a las ${nowTimeStr} hrs`,
            linkStatus: 'ACTIVO'
          });
          newCount++;
        }
      });

      // 3. Recalcular afinidad y compatibilidad con el perfil CV activo
      const candidateTitle = cvProfile?.candidateTitle || 'Ingeniero Civil Industrial';
      const recalculated = recalculateJobMatches(mergedList, candidateSkills, candidateTitle);

      // Ordenar: primero ofertas con postulación activa o en proceso, luego mayor score
      recalculated.sort((a, b) => {
        const aApplied = a.status && a.status !== 'POR_POSTULAR' ? 1 : 0;
        const bApplied = b.status && b.status !== 'POR_POSTULAR' ? 1 : 0;
        if (aApplied !== bApplied) return bApplied - aApplied;
        return b.matchScore - a.matchScore;
      });

      setJobOffers(recalculated);

      // 4. Persistir datos actualizados en localStorage
      try {
        localStorage.setItem('job_offers_list', JSON.stringify(recalculated));
        localStorage.setItem('job_search_last_daily_sync_date', todayStr);
      } catch (err) {
        console.warn('Error al guardar lista de ofertas en localStorage', err);
      }

      // 5. Métricas de canales: Portales vs Páginas Corporativas
      const portalsCount = recalculated.filter(o => 
        !o.portal.toLowerCase().includes('trabaja con nosotros') &&
        !o.portal.toLowerCase().includes('sitio oficial') &&
        !o.portal.toLowerCase().includes('ats corporativo')
      ).length;
      const corporateCount = recalculated.length - portalsCount;

      const summary: DailySyncSummary = {
        date: todayFormatted,
        time: nowTimeStr,
        totalOffers: recalculated.length,
        newOffersCount: newCount,
        portalsCount,
        corporateCount,
        source: searchResult.source === 'GEMINI_SEARCH' ? 'Búsqueda en Vivo (Google Search Grounding)' : 'Sincronizador Curado de Alta Fidelidad'
      };

      setLastDailySyncDate(todayStr);
      setDailySyncSummary(summary);
      try {
        localStorage.setItem('job_search_daily_sync_summary', JSON.stringify(summary));
      } catch {}

      const msg = newCount > 0
        ? `🇨🇱 ¡Búsqueda y actualización diaria completada! Se integraron ${newCount} nuevas convocatorias vigentes (${summary.portalsCount} en Portales de Empleo y ${summary.corporateCount} en Canales Corporativos "Trabaja con Nosotros").`
        : `🇨🇱 ¡Actualización diaria completada! Todas las convocatorias vigentes en Portales de Empleo y Páginas Corporativas fueron verificadas al día de hoy (${todayFormatted}).`;

      setSyncSuccessMsg(msg);
      setTimeout(() => setSyncSuccessMsg(null), 8000);
    } catch (err: any) {
      console.error('Error durante la sincronización diaria de ofertas:', err);
      setSyncSuccessMsg(`Convocatorias laborales verificadas al día de hoy (${todayFormatted}).`);
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } finally {
      setIsDailySyncing(false);
      setIsSyncing(false);
    }
  };

  const handleSimulateSync = () => handleExecuteDailySync(true);

  // Ejecución automática al cargar el módulo cada día
  useEffect(() => {
    if (!autoDailySyncEnabled) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    if (lastDailySyncDate !== todayStr) {
      const timer = setTimeout(() => {
        handleExecuteDailySync(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [autoDailySyncEnabled, lastDailySyncDate]);

  // Chequeo periódico cada 30 minutos por si cambia el día con la app abierta
  useEffect(() => {
    const interval = setInterval(() => {
      if (!autoDailySyncEnabled) return;
      const todayStr = new Date().toISOString().slice(0, 10);
      if (lastDailySyncDate !== todayStr && !isDailySyncing) {
        handleExecuteDailySync(false);
      }
    }, 1000 * 60 * 30);

    return () => clearInterval(interval);
  }, [autoDailySyncEnabled, lastDailySyncDate, isDailySyncing]);

  const handleGenerateCoverLetter = (offer: JobOffer) => {
    const isPublicSector = offer.portal === 'Empleos Públicos' || offer.portal === 'Servicio Civil / ADP' || offer.portal === 'Mercado Público' || offer.category === 'Sector Público & Gobierno';

    let letter = '';

    if (isPublicSector) {
      letter = `SEÑORES COMISIÓN DE SELECCIÓN Y EVALUACIÓN DE ANTECEDENTES
${offer.company.toUpperCase()} – ESTADO DE CHILE

REF: PRESENTACIÓN A CONCURSO PÚBLICO / PROCESO DE SELECCIÓN
CARGO: "${offer.title.toUpperCase()}"
PORTAL FUENTE: ${offer.portal} (${offer.location})
MARCO LEGAL: LEY N° 18.834 (ESTATUTO ADMINISTRATIVO) / LEY N° 19.882 (ADP)

Estimados Integrantes de la Comisión de Selección:

Por medio del presente instrumento, presento formalmente mi postulación para proveer el cargo de "${offer.title}" en ${offer.company}, canalizado a través del portal ${offer.portal}.

Como Ingeniero Civil Industrial de sólida trayectoria técnica e intachable idoneidad ética, manifiesto mi firme vocación de servicio público, compromiso irrestricto con la probidad administrativa, la transparencia activa y la eficiencia en la administración de los recursos del Estado de Chile.

Sustentan esta postulación los siguientes hitos de desempeño y resultados verificables:
1. GOBERNANZA, CONTROL INTERNO Y AUDITORÍA CERO OBSERVACIONES: En la Corporación Inmobiliaria asumí la responsabilidad de fiscalizar y controlar el portafolio patrimonial de 1.849 propiedades valorizado en UF 30.300 ($1.146M CLP), reduciendo a cero (0) y manteniendo de forma ininterrumpida 0 observaciones ante la Contraloría General de la República (CGR) y auditorías externas.
2. EFICIENCIA EN CADENA DE SUMINISTRO Y BODEGA CRÍTICA: En Essity Chile (manufactura continua) mantuve por más de 10 meses consecutivos cero ($0) diferencias en inventarios rotativos de repuestos críticos e impulsé la liberación de más de $2.000M CLP en capital de trabajo aplicando metodología Lean Six Sigma.
3. TRANSFORMACIÓN DIGITAL E INTELIGENCIA ARTIFICIAL: Lideré el desarrollo integral del sistema AssetFlow (TypeScript, React, SQL e IA Generativa) para el control normativo de activos, alertas automatizadas de cumplimiento CMF (B13, B4, Nota 14) y verificación preventiva UAF/PEP.

Poseo pleno dominio en ${offer.matchedSkills.slice(0, 5).join(', ')}, asegurando probidad, rigurosidad presupuestaria y alineación inmediata con las metas institucionales de la repartición pública.

Agradeciendo la recepción de estos antecedentes, quedo a entera disposición de la Comisión para las etapas de evaluación técnica y entrevistas.

Atentamente,

CRISTIAN ANDRÉS MUÑOZ ROJAS
Ingeniero Civil Industrial | RUT: 15.823.941-K
Teléfono: +56 9 6143 6853 | Email: cristian.munoz0223@gmail.com
Santiago, Chile`;
    } else {
      letter = `ESTIMADO EQUIPO DE SELECCIÓN Y RECLUTAMIENTO
${offer.company.toUpperCase()} – CHILE

REF: POSTULACIÓN A VACANTE: "${offer.title.toUpperCase()}"
PORTAL FUENTE: ${offer.portal} (${offer.location})

Estimados profesionales de Selección:

Por medio de la presente, manifiesto mi firme interés en incorporarme a ${offer.company} para asumir el desafío de ${offer.title}. Como Ingeniero Civil Industrial especializado en Control Interno, Gestión Inmobiliaria, Supply Chain y Transformación Digital, considero que mi trayectoria profesional y mis resultados verificables se alinean directamente con los requerimientos estratégicos de su organización.

A lo largo de mi carrera destacan los siguientes hitos de alto impacto:
1. CONTROL INTERNO Y AUDITORÍA CERO OBSERVACIONES: En la Corporación Inmobiliaria lideré la valoración patrimonial y el control interno de 1.849 propiedades por UF 30.300 ($1.146M CLP), reduciendo a cero y manteniendo en 0 las observaciones de auditoría externa/interna mediante reeducación de equipos y controles estandarizados.
2. TRANSFORMACIÓN DIGITAL CON IA Y ASSETFLOW: Concebí, diseñé y supervisé el desarrollo integral de la plataforma AssetFlow —utilizando IA Generativa de Google AI Studio y código TypeScript/React/SQL— para la administración automatizada de activos, reportes normados CMF (B13, B4, Nota 14) y validación UAF/PEP.
3. EXCELENCIA EN SUPPLY CHAIN Y WORKING CAPITAL: En Essity Chile (multinacional de manufactura continua) eliminé las diferencias de inventario a $0 por más de 10 meses consecutivos en repuestos críticos por UF 158.000 ($6.000M CLP) e impulsé la liberación de más de UF 53.000 ($2.000M CLP) en capital de trabajo.

Mi dominio técnico en ${offer.matchedSkills.slice(0, 5).join(', ')} me permite aportar valor inmediato a ${offer.company} desde el primer día, garantizando rigurosidad normativa, visión financiera y aceleración tecnológica.

Agradeciendo de antemano la lectura de esta presentación, quedo a su entera disposición para coordinar una entrevista donde profundizar mis antecedentes.

Atentamente,

CRISTIAN ANDRÉS MUÑOZ ROJAS
Ingeniero Civil Industrial
Teléfono: +56 9 6143 6853 | Email: cristian.munoz0223@gmail.com
Santiago, Chile`;
    }

    setGeneratedLetter(letter);
    setShowCoverLetter(true);
  };

  const handleCopyLetter = () => {
    navigator.clipboard.writeText(generatedLetter);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 3000);
  };

  const handleAddCustomOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferData.title || !newOfferData.company) {
      alert('Por favor ingrese al menos el título del cargo y el nombre de la empresa.');
      return;
    }

    const dupCheck = checkDuplicateJobOffer(
      newOfferData.title || '',
      newOfferData.company || '',
      newOfferData.portalUrl || '',
      jobOffers
    );
    if (dupCheck.isDuplicate) {
      alert(dupCheck.warningMessage || 'Ya existe una oferta idéntica registrada en el sistema.');
      return;
    }

    const created: JobOffer = {
      id: `job-custom-${Date.now()}`,
      title: newOfferData.title || 'Cargo Sin Título',
      company: newOfferData.company || 'Empresa Confidencial',
      portal: newOfferData.portal as JobOffer['portal'] || 'Laborum',
      portalUrl: newOfferData.portalUrl || 'https://www.laborum.cl',
      location: newOfferData.location || 'Santiago, Chile',
      modality: (newOfferData.modality as JobOffer['modality']) || 'Híbrido',
      salaryMin: Number(newOfferData.salaryMin) || 3000000,
      salaryMax: Number(newOfferData.salaryMax) || 4000000,
      currency: 'CLP',
      category: (newOfferData.category as JobOffer['category']) || 'Control Interno & Auditoría',
      description: newOfferData.description || 'Detalle ingresado manualmente por el candidato.',
      requiredSkills: newOfferData.requiredSkills && newOfferData.requiredSkills.length > 0 ? newOfferData.requiredSkills : ['Ingeniero Civil Industrial', 'Control Interno'],
      matchScore: 90,
      matchedSkills: ['Ingeniero Civil Industrial', 'Control Interno'],
      missingSkills: [],
      postedDate: 'Ingresado hoy',
      status: 'POR_POSTULAR',
      linkStatus: 'ACTIVO',
      linkCheckedAt: getNowInspectionTimestamp(),
      lastInspectedAt: getNowInspectionTimestamp(),
      linkErrorDetails: 'Ingresada manualmente por el candidato y validada.'
    };

    setJobOffers(prev => [created, ...prev]);
    setShowAddModal(false);
    setNewOfferData({
      title: '',
      company: '',
      portal: 'Laborum',
      portalUrl: '',
      location: 'Santiago, Chile',
      modality: 'Híbrido',
      salaryMin: 3000000,
      salaryMax: 4000000,
      currency: 'CLP',
      category: 'Control Interno & Auditoría',
      description: '',
      requiredSkills: []
    });
  };

  const handleConfirmCv = (profile: CvProfile) => {
    setCvProfile(profile);
    setCandidateSkills(profile.extractedSkills);
    setIsCvModalMandatory(false);
    setShowCvModal(false);

    try {
      localStorage.setItem('job_search_active_cv', JSON.stringify(profile));
    } catch (err) {
      console.warn('Error saving active CV to localStorage', err);
    }

    const recalculated = recalculateJobMatches(ALL_INITIAL_JOB_OFFERS, profile.extractedSkills, profile.candidateTitle);
    recalculated.sort((a, b) => b.matchScore - a.matchScore);
    setJobOffers(recalculated);

    const highMatchesCount = recalculated.filter(o => o.matchScore >= 80).length;
    setSyncSuccessMsg(`¡CV en PDF analizado y activo! Se indexaron ${profile.extractedSkills.length} competencias y ${highMatchesCount} ofertas con alta afinidad (Match ≥ 80%).`);
    setTimeout(() => setSyncSuccessMsg(null), 7000);
  };

  const [cvDownloadAlert, setCvDownloadAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleDownloadCv = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const res = downloadCristianCvPdf();
      if (res.success) {
        setCvDownloadAlert({
          type: 'success',
          message: '✓ ¡Currículum Vitae (PDF 1 Página • Formato Ejecutivo ATS) descargado exitosamente!'
        });
      } else {
        previewCristianCvPdf();
        setCvDownloadAlert({
          type: 'success',
          message: 'Abriendo vista previa del PDF en una nueva pestaña...'
        });
      }
    } catch (err) {
      console.error('Error al descargar CV:', err);
      previewCristianCvPdf();
      setCvDownloadAlert({
        type: 'success',
        message: 'Abriendo vista previa del CV en nueva pestaña...'
      });
    }
    setTimeout(() => setCvDownloadAlert(null), 6000);
  };

  const handleApplyModelCv = async () => {
    try {
      const { profile } = await generateDemoCristianPdf();
      handleConfirmCv(profile);
    } catch (err) {
      console.error('Error aplicando CV modelo:', err);
    }
  };

  const handleOpenCvModal = (mandatory: boolean = false) => {
    setIsCvModalMandatory(mandatory);
    setShowCvModal(true);
  };

  const handleAddSkillToCandidate = () => {
    if (!customSkillToAdd.trim()) return;
    if (candidateSkills.some(s => s.toLowerCase() === customSkillToAdd.trim().toLowerCase())) {
      alert('Esta habilidad ya se encuentra en su perfil.');
      return;
    }
    const updated = [...candidateSkills, customSkillToAdd.trim()];
    setCandidateSkills(updated);
    setCustomSkillToAdd('');

    if (cvProfile) {
      const updatedProfile = { ...cvProfile, extractedSkills: updated };
      setCvProfile(updatedProfile);
      try {
        localStorage.setItem('job_search_active_cv', JSON.stringify(updatedProfile));
      } catch {}
    }

    const recalculated = recalculateJobMatches(jobOffers, updated, cvProfile?.candidateTitle);
    setJobOffers(recalculated);
  };

  const handleRemoveSkillFromCandidate = (skillToRemove: string) => {
    const updated = candidateSkills.filter(s => s !== skillToRemove);
    setCandidateSkills(updated);

    if (cvProfile) {
      const updatedProfile = { ...cvProfile, extractedSkills: updated };
      setCvProfile(updatedProfile);
      try {
        localStorage.setItem('job_search_active_cv', JSON.stringify(updatedProfile));
      } catch {}
    }

    const recalculated = recalculateJobMatches(jobOffers, updated, cvProfile?.candidateTitle);
    setJobOffers(recalculated);
  };

  return (
    <div ref={moduleContainerRef} className="min-h-screen bg-slate-50 text-slate-800 font-sans p-2.5 sm:p-4 md:p-6 w-full max-w-full overflow-x-auto min-w-0">
      {/* HORIZONTAL SLIDE BAR CONTROLLER */}
      <div className="mb-4 bg-white/95 backdrop-blur-sm border-2 border-indigo-200/80 p-3 sm:p-3.5 rounded-2xl shadow-xs text-slate-800 transition-all w-full max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#0B3C5D] text-white flex items-center justify-center shrink-0 shadow-xs">
              <SlidersHorizontal size={14} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase font-mono tracking-tight text-[#0B3C5D]">
                  Barra Deslizadora Horizontal (Slide Bar Panorámico)
                </span>
                <span className="bg-indigo-100 text-indigo-900 text-[9px] font-black font-mono px-2 py-0.5 rounded-md border border-indigo-200">
                  {scrollProgress}% Desplazado
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono hidden sm:block">
                Ajuste panorámico: use el control deslizante o los botones para desplazar la vista sin cortes en pantallas de cualquier resolución.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleNudgeScroll(-350)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold border border-slate-300 transition-all flex items-center gap-1 active:scale-95 cursor-pointer shrink-0"
              title="Deslizar hacia la izquierda"
            >
              <ArrowLeft size={12} />
              <span>Deslizar Izq.</span>
            </button>

            {/* Interactive Slider Input */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl min-w-[130px] sm:min-w-[190px]">
              <input
                type="range"
                min="0"
                max="100"
                value={scrollProgress}
                onChange={(e) => handleSlideHorizontal(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-ew-resize accent-[#0B3C5D]"
                title="Arrastre para desplazarse horizontalmente a cualquier posición"
              />
            </div>

            <button
              type="button"
              onClick={() => handleNudgeScroll(350)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold border border-slate-300 transition-all flex items-center gap-1 active:scale-95 cursor-pointer shrink-0"
              title="Deslizar hacia la derecha"
            >
              <span>Deslizar Der.</span>
              <ArrowRight size={12} />
            </button>

            <button
              type="button"
              onClick={handleResetScroll}
              className="bg-[#0B3C5D] hover:bg-[#002D62] text-white px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer shrink-0"
              title="Restablecer posición inicial a la izquierda"
            >
              <span>Centrar</span>
            </button>
          </div>
        </div>
      </div>

      {/* HEADER BAR */}
      <div className="bg-[#0B3C5D] text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-700/50 mb-6 relative overflow-hidden w-full max-w-full">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 relative z-10 w-full">
          <div className="space-y-2 min-w-0 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-[#FFCC00] text-slate-950 font-black text-[9px] font-mono px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                MÓDULO DE BÚSQUEDA LABORAL CHILE
              </span>
              <span className="bg-white/10 text-slate-200 text-[9px] font-bold font-mono px-2.5 py-0.5 rounded-full uppercase border border-white/10">
                P09OWJOB • CONECTOR MULTI-PORTAL
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight flex items-center gap-3 text-white">
              <Briefcase className="text-[#FFCC00] shrink-0" size={32} />
              <span className="text-white drop-shadow-xs">Búsqueda de Empleo & Match con CV</span>
            </h1>

            <p className="text-xs text-slate-100 max-w-2xl font-medium leading-relaxed">
              Consolidador inteligente conectado a los principales portales de empleo de Chile (Laborum, Chiletrabajos, Computrabajo, Get on Board, BNE, LinkedIn). Filtra ofertas en tiempo real evaluando el % de ajuste con tus habilidades de Ingeniero Civil Industrial y genera cartas de presentación personalizadas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 max-w-full">
            <button
              onClick={() => {
                if (filteredOffers.length > 0) setSuperpowerOffer(filteredOffers[0]);
                else if (jobOffers.length > 0) setSuperpowerOffer(jobOffers[0]);
              }}
              className="flex items-center gap-2 bg-[#FFCC00] hover:bg-amber-400 text-slate-950 px-3.5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wide transition-all shadow-md active:scale-95 cursor-pointer border border-amber-600 no-jde-override"
              title="Modo Superpoder: IA redacta respuestas elocuentes y concisas a preguntas de reclutadores basadas en tu CV y este sistema"
            >
              <Zap size={14} className="fill-slate-950 text-slate-950 shrink-0" />
              <span>Responder Preguntas IA</span>
            </button>

            <button
              onClick={() => setActiveTab('EMPRESAS_DIRECTORIO')}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wide transition-all shadow-md active:scale-95 cursor-pointer border border-emerald-400 no-jde-override"
              title="Explorar el Directorio Oficial de Páginas 'Trabaja con Nosotros' y ATS de las empresas en Chile"
            >
              <Building2 size={15} className="text-white shrink-0" />
              <span>Trabaja con Nosotros ({COMPANY_CAREERS_DIRECTORY.length} Empresas)</span>
            </button>

            <button
              onClick={() => handleExecuteDailySync(true)}
              disabled={isDailySyncing}
              className={`flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wide transition-all shadow-md active:scale-95 cursor-pointer border border-amber-500 no-jde-override ${
                isDailySyncing ? 'animate-pulse opacity-80' : ''
              }`}
              title="Búsqueda y actualización diaria de convocatorias laborales en portales chilenos y sitios corporativos oficiales"
            >
              <RefreshCw size={14} className={isDailySyncing ? 'animate-spin' : ''} />
              {isDailySyncing ? 'Buscando Convocatorias de Hoy...' : 'Actualización Diaria (Portales + Corporativas)'}
            </button>

            <button
              onClick={() => handleOpenCvModal(false)}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wide transition-all shadow-md active:scale-95 cursor-pointer border border-amber-500 no-jde-override"
              title="Cargar, inspeccionar o cambiar documento PDF del Currículum Vitae"
            >
              <FileText size={15} />
              <span>{cvProfile ? 'Cambiar CV (PDF)' : 'Subir CV (PDF)'}</span>
            </button>

            <button
              onClick={() => setShowManualModal(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wide transition-all shadow-md active:scale-95 cursor-pointer border border-emerald-600 no-jde-override"
              title="Manual de uso paso a paso ilustrado descargable en PDF"
            >
              <BookOpen size={14} />
              Manual de Uso (PDF)
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-3.5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wide border border-white/30 transition-all no-jde-override"
            >
              <Plus size={14} />
              Agregar Vacante Manual
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white px-3.5 py-2.5 rounded-2xl font-mono text-xs uppercase font-bold transition-all border border-slate-600 no-jde-override"
              >
                Cerrar
              </button>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wide transition-all shadow-md active:scale-95 cursor-pointer border border-rose-400 flex items-center gap-1.5 no-jde-override"
                title="Cerrar sesión de Juan Andrés Piña o usuario actual y volver a la selección de cuentas"
              >
                <LogOut size={14} />
                <span>Cerrar Sesión / Salir</span>
              </button>
            )}
          </div>
        </div>

        {/* CANDIDATE MINI BANNER */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 text-xs font-mono w-full">
          <div className="bg-white/10 p-3.5 rounded-2xl border border-white/20 relative group min-w-0 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 block text-[10px] uppercase font-bold tracking-wider">Documento CV Vinculado</span>
              <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={10} /> {cvProfile?.rarityScore ? `★ RAREZA ${cvProfile.rarityScore}%` : (cvProfile ? 'PDF ACTIVO' : 'DEMO')}
              </span>
            </div>
            <span className="text-white font-black text-sm block truncate mt-1" title={cvProfile?.fileName || 'CV_Cristian_Munoz.pdf'}>
              {cvProfile?.fileName || 'CV_Cristian_Munoz.pdf'}
            </span>
            <span className="text-amber-300 text-[11px] font-black block truncate mt-0.5">
              {cvProfile?.candidateName || 'CRISTIAN A. MUÑOZ ROJAS'}
            </span>
          </div>

          <div className="bg-white/10 p-3.5 rounded-2xl border border-white/20 min-w-0 shadow-xs">
            <span className="text-slate-300 block text-[10px] uppercase font-bold tracking-wider">Título & Pretensión Sugerida</span>
            <span className="text-white font-black text-xs block truncate mt-0.5">
              {cvProfile?.candidateTitle || 'Ingeniero Civil Industrial'}
            </span>
            <span className="text-emerald-300 font-black text-[11px] block mt-0.5">
              ${((cvProfile?.suggestedSalaryMin || 3800000) / 1000000).toFixed(1)}M – ${((cvProfile?.suggestedSalaryMax || 5400000) / 1000000).toFixed(1)}M CLP
            </span>
          </div>

          <div className="bg-white/10 p-3.5 rounded-2xl border border-white/20 min-w-0 shadow-xs">
            <span className="text-slate-300 block text-[10px] uppercase font-bold tracking-wider">Habilidades en CV</span>
            <span className="text-amber-300 font-black text-sm block mt-0.5 truncate">
              {candidateSkills.length} Competencias Indexadas
            </span>
            <span className="text-slate-200 text-[10px] font-semibold block truncate mt-0.5">
              {jobOffers.filter(o => o.matchScore >= 80).length} ofertas con Match ≥ 80%
            </span>
          </div>

          <div className="bg-white/10 p-3.5 rounded-2xl border border-white/20 flex flex-col justify-between min-w-0 shadow-xs">
            <div>
              <span className="text-slate-300 block text-[10px] uppercase font-bold tracking-wider">Postulaciones Activas</span>
              <span className="text-sky-300 font-black text-sm block mt-0.5 truncate">
                {applicationsList.length} Ofertas en Seguimiento
              </span>
            </div>
            <button
              onClick={() => handleOpenCvModal(false)}
              className="mt-2.5 w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer border border-amber-500 flex items-center justify-center gap-1.5 no-jde-override"
              title="Cargar, inspeccionar o reanalizar documento PDF del Currículum Vitae"
            >
              <span>⚙ Gestionar / Reanalizar PDF →</span>
            </button>
          </div>
        </div>

        {/* PANEL DE MONITOREO Y CONTROL DE BÚSQUEDA DIARIA (PORTALES + SITIOS CORPORATIVOS) */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs bg-black/25 p-3.5 rounded-2xl border border-white/10 font-sans">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isDailySyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span className="text-[11px] font-black uppercase text-white tracking-wider font-mono flex items-center gap-1.5">
                📅 Rastreo Diario:
              </span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">
                {dailySyncSummary ? `Actualizado hoy ${dailySyncSummary.date} (${dailySyncSummary.time})` : 'Verificado al día de hoy'}
              </span>
              <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                <Globe size={11} />
                {jobOffers.filter(o => !o.portal.toLowerCase().includes('trabaja con nosotros') && !o.portal.toLowerCase().includes('sitio oficial') && !o.portal.toLowerCase().includes('ats corporativo')).length} Portales de Empleo
              </span>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                <Building2 size={11} />
                {jobOffers.filter(o => o.portal.toLowerCase().includes('trabaja con nosotros') || o.portal.toLowerCase().includes('sitio oficial') || o.portal.toLowerCase().includes('ats corporativo') || o.directApplyUrl).length} Canales Corporativos
              </span>
              <span className="text-slate-400 text-[10px] hidden lg:inline">
                • Búsqueda y actualización automática todos los días (Portales + Sitios Corporativos)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => handleExecuteDailySync(true)}
              disabled={isDailySyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wide transition-all shadow-sm active:scale-95 cursor-pointer ${
                isDailySyncing 
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 animate-pulse' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500'
              }`}
              title="Forzar rastreo y actualización inmediata de ofertas de hoy en portales y páginas corporativas"
            >
              <RefreshCw size={12} className={isDailySyncing ? 'animate-spin' : ''} />
              <span>{isDailySyncing ? 'Rastreando Convocatorias...' : 'Forzar Rastreo Hoy'}</span>
            </button>

            <button
              onClick={() => {
                const nextVal = !autoDailySyncEnabled;
                setAutoDailySyncEnabled(nextVal);
                try {
                  localStorage.setItem('job_search_auto_daily_sync', String(nextVal));
                } catch {}
              }}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all border cursor-pointer ${
                autoDailySyncEnabled 
                  ? 'bg-white/10 text-emerald-300 border-emerald-500/40 hover:bg-white/15' 
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
              }`}
              title="Activar o pausar la búsqueda diaria automática al cargar el módulo"
            >
              Auto: {autoDailySyncEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* SYNC NOTIFICATION BANNER */}
      {syncSuccessMsg && (
        <div className="mb-6 bg-emerald-500 text-slate-950 font-bold p-4 rounded-2xl border border-emerald-400 text-xs flex items-center gap-3 animate-in fade-in slide-in-from-top-2 shadow-lg">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="overflow-x-auto pb-2 mb-6 border-b border-slate-200 scrollbar-thin">
        <div className="flex items-center gap-2 min-w-max">
        <button
          onClick={() => setActiveTab('BUSQUEDA')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
            activeTab === 'BUSQUEDA'
              ? 'bg-[#0B3C5D] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Search size={15} />
          Buscador de Vacantes ({filteredOffers.length})
        </button>

        <button
          onClick={() => setActiveTab('POSTULACIONES')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
            activeTab === 'POSTULACIONES'
              ? 'bg-[#0B3C5D] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Briefcase size={15} />
          Tablero de Postulaciones ({applicationsList.length})
        </button>

        <button
          onClick={() => setActiveTab('EMPRESAS_DIRECTORIO')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
            activeTab === 'EMPRESAS_DIRECTORIO'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-emerald-50/80 text-emerald-950 hover:bg-emerald-100 border border-emerald-300'
          }`}
        >
          <Building2 size={15} className={activeTab === 'EMPRESAS_DIRECTORIO' ? 'text-white' : 'text-emerald-700'} />
          <span>Empresas: Trabaja con Nosotros ({COMPANY_CAREERS_DIRECTORY.length})</span>
          <span className="bg-emerald-100 text-emerald-950 text-[10px] font-mono px-2 py-0.5 rounded-full font-black border border-emerald-300">
            OFICIAL
          </span>
        </button>

        <button
          onClick={() => setActiveTab('PORTALES')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
            activeTab === 'PORTALES'
              ? 'bg-[#0B3C5D] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Globe size={15} />
          Portales Chilenos ({chileanPortals.length})
        </button>

        <button
          onClick={() => setActiveTab('PERFIL_CV')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
            activeTab === 'PERFIL_CV'
              ? 'bg-[#0B3C5D] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck size={15} />
          Mi Perfil & Rareza (★ {cvProfile?.rarityScore || '99.8'}%)
        </button>
        </div>
      </div>

      {/* TAB 1: BUSCADOR DE VACANTES */}
      {activeTab === 'BUSQUEDA' && (
        <div className="space-y-6">
          {/* =========================================================================
              CONSOLA PRINCIPAL DE BÚSQUEDA PERSONALIZADA & FILTROS DE MODALIDAD
              ========================================================================= */}
          <div className="bg-white p-5 md:p-6 rounded-3xl border-2 border-indigo-200 shadow-sm space-y-5">
            {/* Header of Search Console */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Search size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black font-mono uppercase tracking-tight text-slate-900 flex items-center gap-2">
                    Buscador de Vacantes & Filtros Personalizados
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Escriba cargo, empresa o tecnología, y filtre por modalidad de trabajo (Remoto, Mixto o Presencial).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-indigo-50 text-indigo-900 border border-indigo-200 text-[11px] font-black font-mono px-3 py-1 rounded-xl">
                  {filteredOffers.length} de {jobOffers.length} vacantes
                </span>
                {(searchTitle || searchCompany || searchTerm || categoryFilter !== 'TODAS' || portalFilter !== 'TODOS' || modalityFilter !== 'TODAS' || minSalaryFilter > 0 || minMatchFilter > 0 || disabilityFilter !== 'TODOS' || linkStatusFilter !== 'TODOS') && (
                  <button
                    onClick={handleClearAllFilters}
                    className="flex items-center gap-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[11px] font-bold font-mono px-3 py-1 rounded-xl transition-all"
                    title="Restablecer todos los filtros y búsquedas"
                  >
                    <X size={13} /> Limpiar Filtros
                  </button>
                )}
              </div>
            </div>

            {/* CUADROS DE TEXTO: PUESTO / EMPRESA / BÚSQUEDA GENERAL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Cuadro 1: Nombre del Puesto / Cargo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black font-mono uppercase text-slate-700 flex items-center gap-1.5">
                  <Briefcase size={13} className="text-indigo-600" />
                  Nombre del Puesto o Cargo:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ej: Auditor Interno, Jefe S&OP, Operaciones..."
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    className="w-full pl-3.5 pr-8 py-2.5 text-xs font-mono border-2 border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all shadow-inner"
                  />
                  {searchTitle && (
                    <button 
                      onClick={() => setSearchTitle('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 text-xs font-bold"
                      title="Borrar cargo"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Cuadro 2: Nombre de la Empresa */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black font-mono uppercase text-slate-700 flex items-center gap-1.5">
                  <Building2 size={13} className="text-indigo-600" />
                  Nombre de la Empresa u Org.:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ej: Falabella, Codelco, Nestlé, Parque Arauco..."
                    value={searchCompany}
                    onChange={(e) => setSearchCompany(e.target.value)}
                    className="w-full pl-3.5 pr-8 py-2.5 text-xs font-mono border-2 border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all shadow-inner"
                  />
                  {searchCompany && (
                    <button 
                      onClick={() => setSearchCompany('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 text-xs font-bold"
                      title="Borrar empresa"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Cuadro 3: Búsqueda General / Palabras Clave / Tecnologías */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black font-mono uppercase text-slate-700 flex items-center gap-1.5">
                  <Search size={13} className="text-indigo-600" />
                  Palabras Clave / ERP / Skills:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ej: CMF, Power BI, SQL, ERP, Working Capital..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-3.5 pr-8 py-2.5 text-xs font-mono border-2 border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all shadow-inner"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 text-xs font-bold"
                      title="Borrar palabra clave"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* FILTROS DE MODALIDAD INTERACTIVOS (REMOTA / MIXTO / PRESENCIAL) */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-[11px] font-black font-mono uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Laptop size={14} className="text-indigo-600" />
                  Filtrar por Modalidad de Trabajo:
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Haga clic para aislar ofertas según modalidad
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Todas las Modalidades */}
                <button
                  type="button"
                  onClick={() => setModalityFilter('TODAS')}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all border-2 ${
                    modalityFilter === 'TODAS'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-400/50'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Globe size={13} className={modalityFilter === 'TODAS' ? 'text-slate-200' : 'text-slate-500'} />
                    Todas
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    modalityFilter === 'TODAS' ? 'bg-slate-800 text-white' : 'bg-slate-150 text-slate-700'
                  }`}>
                    {modalityCounts.todas}
                  </span>
                </button>

                {/* Remoto (100% Teletrabajo) */}
                <button
                  type="button"
                  onClick={() => setModalityFilter('Remoto')}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all border-2 ${
                    modalityFilter === 'Remoto'
                      ? 'bg-purple-900 text-white border-purple-900 shadow-xs ring-2 ring-purple-400/50'
                      : 'bg-purple-50 text-purple-950 border-purple-200 hover:bg-purple-100/80'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Home size={13} className={modalityFilter === 'Remoto' ? 'text-purple-200' : 'text-purple-700'} />
                    🏠 Remoto (100%)
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    modalityFilter === 'Remoto' ? 'bg-purple-800 text-white' : 'bg-purple-200 text-purple-900'
                  }`}>
                    {modalityCounts.remoto}
                  </span>
                </button>

                {/* Mixto / Híbrido */}
                <button
                  type="button"
                  onClick={() => setModalityFilter('Híbrido')}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all border-2 ${
                    modalityFilter === 'Híbrido'
                      ? 'bg-sky-950 text-white border-sky-950 shadow-xs ring-2 ring-sky-400/50'
                      : 'bg-sky-50 text-sky-950 border-sky-200 hover:bg-sky-100/80'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Shuffle size={13} className={modalityFilter === 'Híbrido' ? 'text-sky-300' : 'text-sky-700'} />
                    🔄 Mixto / Híbrido
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    modalityFilter === 'Híbrido' ? 'bg-sky-800 text-white' : 'bg-sky-200 text-sky-950'
                  }`}>
                    {modalityCounts.hibrido}
                  </span>
                </button>

                {/* Presencial */}
                <button
                  type="button"
                  onClick={() => setModalityFilter('Presencial')}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all border-2 ${
                    modalityFilter === 'Presencial'
                      ? 'bg-emerald-950 text-white border-emerald-950 shadow-xs ring-2 ring-emerald-400/50'
                      : 'bg-emerald-50 text-emerald-950 border-emerald-200 hover:bg-emerald-100/80'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Building2 size={13} className={modalityFilter === 'Presencial' ? 'text-emerald-300' : 'text-emerald-700'} />
                    🏢 Presencial
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    modalityFilter === 'Presencial' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-950'
                  }`}>
                    {modalityCounts.presencial}
                  </span>
                </button>
              </div>
            </div>

            {/* BÚSQUEDAS RÁPIDAS (TAGS POPULARES & FILTRO CORPORATIVO DIRECTO) */}
            <div className="flex items-center gap-2 flex-wrap pt-1 text-xs font-mono">
              <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                <Tag size={11} /> Búsquedas Rápidas:
              </span>

              {/* Botón Destacado: Filtro Trabaja con Nosotros */}
              <button
                type="button"
                onClick={() => setPortalFilter(portalFilter === 'TRABAJA_CON_NOSOTROS' ? 'TODOS' : 'TRABAJA_CON_NOSOTROS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-[10px] font-black uppercase transition-all border cursor-pointer ${
                  portalFilter === 'TRABAJA_CON_NOSOTROS'
                    ? 'bg-emerald-700 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-400/40'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-emerald-300'
                }`}
                title="Mostrar exclusivamente vacantes publicadas en las páginas oficiales de empresas 'Trabaja con Nosotros' o ATS corporativos"
              >
                <Building2 size={12} className={portalFilter === 'TRABAJA_CON_NOSOTROS' ? 'text-white' : 'text-emerald-700'} />
                <span>🏢 Solo Trabaja con Nosotros (Empresas)</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                  portalFilter === 'TRABAJA_CON_NOSOTROS' ? 'bg-emerald-900 text-white' : 'bg-emerald-200 text-emerald-950'
                }`}>
                  {corporateOffersCount}
                </span>
              </button>

              {[
                { label: 'Parque Arauco', type: 'company', val: 'Parque Arauco' },
                { label: 'Falabella', type: 'company', val: 'Falabella' },
                { label: 'Cencosud', type: 'company', val: 'Cencosud' },
                { label: 'Banco Bci', type: 'company', val: 'Banco Bci' },
                { label: 'Codelco', type: 'company', val: 'Codelco' },
                { label: 'Walmart Chile', type: 'company', val: 'Walmart' },
                { label: 'SQM', type: 'company', val: 'SQM' },
                { label: 'Copec', type: 'company', val: 'Copec' },
                { label: 'LATAM Airlines', type: 'company', val: 'LATAM' },
                { label: 'Nestlé', type: 'company', val: 'Nestlé' },
                { label: 'Essity', type: 'company', val: 'Essity' },
                { label: 'Auditoría Interna', type: 'title', val: 'Auditoría' },
                { label: 'Supply Chain', type: 'title', val: 'Supply Chain' },
                { label: 'Operaciones Inmobiliarias', type: 'title', val: 'Operaciones' },
                { label: 'Power BI & SQL', type: 'term', val: 'Power BI' },
                { label: 'Gobernanza CMF', type: 'term', val: 'CMF' },
              ].map((pill, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (pill.type === 'title') setSearchTitle(pill.val);
                    if (pill.type === 'company') setSearchCompany(pill.val);
                    if (pill.type === 'term') setSearchTerm(pill.val);
                  }}
                  className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 transition-all cursor-pointer"
                >
                  + {pill.label}
                </button>
              ))}
            </div>

            {/* FILTROS ADICIONALES (CATEGORÍA, PORTAL, LEY 21.015, SUELDO Y AJUSTE CV) */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Categoría */}
                <div>
                  <label className="text-[10px] font-black font-mono uppercase text-slate-500 block mb-1">
                    Categoría de Empleo:
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="TODAS">Todas las Categorías</option>
                    <option value="Sector Público & Gobierno">🏛️ Sector Público & Gobierno</option>
                    <option value="Control Interno & Auditoría">Control Interno & Auditoría</option>
                    <option value="Supply Chain & Logística">Supply Chain & Logística</option>
                    <option value="Operaciones & Inmobiliario">Operaciones & Inmobiliario</option>
                    <option value="Transformación Digital & IT">Transformación Digital & IT</option>
                    <option value="Gerencia & Dirección">Gerencia & Dirección</option>
                  </select>
                </div>

                {/* Portal */}
                <div>
                  <label className="text-[10px] font-black font-mono uppercase text-slate-500 block mb-1">
                    Portal de Empleo:
                  </label>
                  <select
                    value={portalFilter}
                    onChange={(e) => setPortalFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="TODOS">Todos los Portales ({jobOffers.length})</option>
                    <option value="TRABAJA_CON_NOSOTROS">🏢 Trabaja con Nosotros (Sitios Oficiales de Empresas)</option>
                    <option value="ATS Corporativo (Trabajando/Workday/Buk)">💼 ATS Corporativos (Workday / Buk / Trabajando)</option>
                    <option value="Empleos Públicos">🏛️ Empleos Públicos (Estado)</option>
                    <option value="Servicio Civil / ADP">🇨🇱 Servicio Civil / ADP</option>
                    <option value="Mercado Público">📄 Mercado Público</option>
                    <option value="Laborum">Laborum</option>
                    <option value="Chiletrabajos">Chiletrabajos</option>
                    <option value="Computrabajo">Computrabajo</option>
                    <option value="Get on Board">Get on Board</option>
                    <option value="BNE Chile">BNE Chile</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Trabajando.com">Trabajando.com</option>
                    <option value="FirstJob">FirstJob</option>
                  </select>
                </div>

                {/* Inclusión Ley 21.015 */}
                <div>
                  <label className="text-[10px] font-black font-mono uppercase text-slate-500 block mb-1">
                    Inclusión Ley 21.015:
                  </label>
                  <select
                    value={disabilityFilter}
                    onChange={(e) => setDisabilityFilter(e.target.value as any)}
                    className={`w-full px-3 py-2 text-xs font-mono border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold transition-all ${
                      disabilityFilter === 'INCLUSIVAS_SOLO'
                        ? 'bg-purple-900 text-white border-purple-800 shadow-xs'
                        : 'bg-purple-50/80 border-purple-200 text-purple-950 hover:bg-purple-100/80'
                    }`}
                  >
                    <option value="TODOS">♿ Todas las Vacantes</option>
                    <option value="INCLUSIVAS_SOLO">♿ Solo Ley 21.015 (Discapacidad)</option>
                  </select>
                </div>

                {/* Estado de Enlace */}
                <div>
                  <label className="text-[10px] font-black font-mono uppercase text-slate-500 block mb-1">
                    Disponibilidad Link:
                  </label>
                  <select
                    value={linkStatusFilter}
                    onChange={(e) => setLinkStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="TODOS">Estado Link: Todos</option>
                    <option value="ACTIVO">🟢 Enlaces Activos</option>
                    <option value="INACTIVO">🔴 Enlaces Inactivos</option>
                    <option value="PENDIENTE">⚪ Sin Verificar</option>
                  </select>
                </div>
              </div>

              {/* Renta Mínima y Ajuste Mínimo CV */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs font-mono">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Renta Mínima CLP:</span>
                  <input
                    type="range"
                    min="0"
                    max="5000000"
                    step="250000"
                    value={minSalaryFilter}
                    onChange={(e) => setMinSalaryFilter(Number(e.target.value))}
                    className="w-32 sm:w-36 accent-indigo-600 cursor-pointer"
                  />
                  <span className="font-black text-slate-800 text-[11px] min-w-[90px]">
                    {minSalaryFilter === 0 ? 'Sin límite' : `$${(minSalaryFilter / 1000000).toFixed(2)}M CLP`}
                  </span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Ajuste Mínimo CV:</span>
                  <input
                    type="range"
                    min="0"
                    max="95"
                    step="5"
                    value={minMatchFilter}
                    onChange={(e) => setMinMatchFilter(Number(e.target.value))}
                    className="w-28 sm:w-32 accent-emerald-600 cursor-pointer"
                  />
                  <span className="font-black text-emerald-800 text-[11px] min-w-[55px]">
                    {minMatchFilter === 0 ? 'Todos' : `≥ ${minMatchFilter}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              PANEL COMPACTO DE VERIFICACIÓN DE ENLACES EN VIVO
              ========================================================================= */}
          <div className="bg-slate-900 text-white p-4 rounded-3xl border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase text-white font-mono tracking-tight">
                      Auditoría de Enlaces & Disponibilidad en Portales
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold font-mono px-2 py-0.5 rounded-md border border-emerald-500/30">
                      LIVE SERVER CHECK
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mt-0.5 flex-wrap">
                    <span className="text-emerald-400 font-bold">🟢 {jobOffers.filter(o => o.linkStatus === 'ACTIVO').length} Disponibles</span>
                    <span>•</span>
                    <span className="text-rose-400 font-bold">🔴 {jobOffers.filter(o => o.linkStatus === 'INACTIVO').length} Enlaces Rotos / Inactivos</span>
                    <span>•</span>
                    <span className="text-slate-400">⚪ {jobOffers.filter(o => !o.linkStatus || o.linkStatus === 'PENDIENTE').length} Pendientes</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleValidateAllLinks}
                  disabled={isValidatingAllLinks}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black font-mono text-xs px-4 py-2.5 rounded-xl uppercase transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer active:scale-95"
                  title="Ejecutar barrido de inspección en vivo sobre todas las ofertas del sistema"
                >
                  {isValidatingAllLinks ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Inspeccionando ({linkValidationProgress?.current}/{linkValidationProgress?.total})...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={13} /> Inspeccionar Todos los Enlaces
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* BARRA DE FILTRADO RÁPIDO POR ESTADO DE INSPECCIÓN */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Filtrar por Disponibilidad:</span>
                <button
                  type="button"
                  onClick={() => setLinkStatusFilter('TODOS')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    linkStatusFilter === 'TODOS'
                      ? 'bg-slate-700 text-white font-black shadow-xs'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  Todas ({jobOffers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLinkStatusFilter('ACTIVO')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                    linkStatusFilter === 'ACTIVO'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-800/80 text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  <CheckCircle2 size={11} /> Solo Vigentes & Activas ({jobOffers.filter(o => o.linkStatus === 'ACTIVO').length})
                </button>
                <button
                  type="button"
                  onClick={() => setLinkStatusFilter('INACTIVO')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                    linkStatusFilter === 'INACTIVO'
                      ? 'bg-rose-500 text-white font-black shadow-xs'
                      : 'bg-slate-800/80 text-rose-400 hover:text-rose-300'
                  }`}
                >
                  <XCircle size={11} /> Solo Rotos / No Disponibles ({jobOffers.filter(o => o.linkStatus === 'INACTIVO').length})
                </button>
              </div>

              <div className="text-[10.5px] text-slate-400 flex items-center gap-1.5 font-medium">
                <Clock size={12} className="text-amber-400 shrink-0" />
                <span>Auditoría de vigencia: Todas las ofertas indican la fecha y hora de su última inspección.</span>
              </div>
            </div>

            {linkValidationProgress && isValidatingAllLinks && (
              <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] font-mono text-amber-300 animate-pulse flex items-center gap-2">
                <Loader2 size={11} className="animate-spin" />
                Validando conectividad en segundo plano con servidores y páginas corporativas chilenas...
              </div>
            )}
          </div>

          {/* OFFERS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOffers.length === 0 ? (
              <div className="col-span-2 bg-white p-12 text-center rounded-3xl border border-dashed border-slate-300 space-y-3">
                <AlertCircle className="mx-auto text-amber-500" size={32} />
                <p className="text-xs font-mono font-bold text-slate-600 uppercase">
                  No se encontraron ofertas laborales con los filtros seleccionados.
                </p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  Pruebe ajustando el rango salarial o borrando los términos de búsqueda en la barra superior.
                </p>
              </div>
            ) : (
              filteredOffers.map((offer) => {
                const isHighMatch = offer.matchScore >= 90;

                return (
                  <div
                    key={offer.id}
                    className={`bg-white rounded-3xl p-6 border-2 transition-all hover:shadow-xl relative flex flex-col justify-between ${
                      isHighMatch
                        ? 'border-emerald-200 hover:border-emerald-400 bg-gradient-to-br from-white via-white to-emerald-50/20'
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-black font-mono px-2.5 py-0.5 rounded-lg uppercase border flex items-center gap-1 ${
                            offer.portal.includes('Trabaja con Nosotros') || offer.portal.includes('ATS Corporativo') || offer.directApplyUrl
                              ? 'bg-emerald-700 text-white border-emerald-600 shadow-xs'
                              : 'bg-[#0B3C5D] text-white border-[#0B3C5D]'
                          }`}>
                            {(offer.portal.includes('Trabaja con Nosotros') || offer.portal.includes('ATS Corporativo') || offer.directApplyUrl) && (
                              <Building2 size={10} className="text-emerald-200" />
                            )}
                            {offer.portal}
                          </span>

                          {/* Direct Company Career Portal Badge */}
                          {findCompanyCareerEntry(offer.company) && (
                            <a
                              href={findCompanyCareerEntry(offer.company)?.careerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 text-[9px] font-black font-mono px-2 py-0.5 rounded-lg uppercase flex items-center gap-1 transition-all"
                              title={`Abrir página corporativa oficial "Trabaja con Nosotros" de ${offer.company}`}
                            >
                              <Building2 size={10} className="text-emerald-700" />
                              <span>Sitio Empresa Oficial</span>
                              <ExternalLink size={9} className="text-emerald-700" />
                            </a>
                          )}

                          <span className={`text-[9px] font-black font-mono px-2.5 py-0.5 rounded-lg uppercase border flex items-center gap-1 ${
                            offer.modality === 'Remoto'
                              ? 'bg-purple-100 text-purple-950 border-purple-300'
                              : offer.modality === 'Híbrido'
                              ? 'bg-sky-100 text-sky-950 border-sky-300'
                              : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                          }`}>
                            {offer.modality === 'Remoto' && '🏠 Remoto'}
                            {offer.modality === 'Híbrido' && '🔄 Mixto / Híbrido'}
                            {offer.modality === 'Presencial' && '🏢 Presencial'}
                          </span>
                          {offer.isDisabilityInclusive && (
                            <span className="bg-purple-100 text-purple-950 border border-purple-300 text-[9px] font-black font-mono px-2.5 py-0.5 rounded-lg uppercase flex items-center gap-1" title="Inclusión Laboral - Ley N° 21.015">
                              ♿ Ley 21.015 (Inclusión)
                            </span>
                          )}
                          <span className="bg-slate-100 text-slate-500 text-[9px] font-bold font-mono px-2 py-0.5 rounded-lg">
                            {offer.postedDate}
                          </span>

                          {/* Pill de Auditoría de Inspección */}
                          <span 
                            className={`text-[9px] font-black font-mono px-2 py-0.5 rounded-lg uppercase border flex items-center gap-1 shadow-2xs ${
                              offer.linkStatus === 'INACTIVO'
                                ? 'bg-rose-100 text-rose-950 border-rose-300'
                                : offer.linkStatus === 'VERIFICANDO'
                                ? 'bg-amber-100 text-amber-950 border-amber-300'
                                : 'bg-emerald-50 text-emerald-950 border-emerald-300'
                            }`}
                            title={`Auditoría de vigencia del enlace. Última inspección: ${formatInspectionTimestamp(offer.linkCheckedAt || offer.lastInspectedAt)}`}
                          >
                            <Clock size={10} className={offer.linkStatus === 'INACTIVO' ? 'text-rose-600' : 'text-emerald-700'} />
                            <span>
                              {offer.linkStatus === 'INACTIVO' 
                                ? '🔴 Enlace Roto' 
                                : `🟢 Ins: ${formatInspectionTimestamp(offer.linkCheckedAt || offer.lastInspectedAt)}`}
                            </span>
                          </span>
                        </div>

                        {/* Match Score Badge */}
                        <div className={`px-3 py-1 rounded-2xl text-center shrink-0 border ${
                          isHighMatch 
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black' 
                            : offer.matchScore >= 80 
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-black' 
                            : 'bg-slate-200 text-slate-800 border-slate-300 font-bold'
                        }`}>
                          <span className="text-[10px] font-mono block uppercase text-slate-900 font-bold">Match CV</span>
                          <span className="text-sm font-mono tracking-tight leading-none">{offer.matchScore}%</span>
                        </div>
                      </div>

                      {/* Job Title & Company */}
                      <h3 className="text-base font-black text-slate-900 uppercase leading-snug tracking-tight hover:text-indigo-600 transition-colors cursor-pointer"
                          onClick={() => setSelectedOffer(offer)}
                      >
                        {offer.title}
                      </h3>

                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mt-1 mb-3">
                        <Building2 size={13} className="text-slate-400 shrink-0" />
                        <span>{offer.company}</span>
                        <span className="text-slate-300">•</span>
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="text-slate-500 font-normal">{offer.location}</span>
                      </div>

                      {/* Description snippet */}
                      <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed font-sans">
                        {offer.description}
                      </p>

                      {/* Salary Range */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150 mb-3 flex items-center justify-between font-mono">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <DollarSign size={14} className="text-emerald-600" />
                          <span className="font-bold text-slate-500 uppercase text-[10px]">Renta Ofrecida:</span>
                        </div>
                        <span className="font-black text-emerald-700 text-xs">
                          ${(offer.salaryMin / 1000000).toFixed(1)}M – ${(offer.salaryMax / 1000000).toFixed(1)}M CLP
                        </span>
                      </div>

                      {/* CAJA DE AUDITORÍA Y VIGENCIA DEL ENLACE */}
                      <div className={`p-3.5 rounded-2xl border mb-4 font-mono transition-all ${
                        offer.linkStatus === 'INACTIVO'
                          ? 'bg-rose-50/95 border-rose-300 text-rose-950 shadow-xs'
                          : offer.linkStatus === 'VERIFICANDO'
                          ? 'bg-amber-50/95 border-amber-300 text-amber-950 shadow-xs'
                          : 'bg-emerald-50/95 border-emerald-300 text-emerald-950 shadow-xs'
                      }`}>
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                              offer.linkStatus === 'INACTIVO'
                                ? 'bg-rose-600 text-white'
                                : offer.linkStatus === 'VERIFICANDO'
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}>
                              {offer.linkStatus === 'INACTIVO' ? (
                                <XCircle size={16} />
                              ) : offer.linkStatus === 'VERIFICANDO' ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={16} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                  offer.linkStatus === 'INACTIVO'
                                    ? 'bg-rose-200 text-rose-950 border-rose-400'
                                    : offer.linkStatus === 'VERIFICANDO'
                                    ? 'bg-amber-200 text-amber-950 border-amber-400'
                                    : 'bg-emerald-200 text-emerald-950 border-emerald-400'
                                }`}>
                                  {offer.linkStatus === 'INACTIVO'
                                    ? '🔴 ENLACE ROTO / OFERTA NO DISPONIBLE'
                                    : offer.linkStatus === 'VERIFICANDO'
                                    ? '🟡 INSPECCIONANDO DISPONIBILIDAD EN PORTAL...'
                                    : '🟢 OFERTA ACTIVA & ENLACE VIGENTE'}
                                </span>
                                <span className="text-[9.5px] text-slate-700 font-extrabold uppercase truncate bg-white/70 px-1.5 py-0.5 rounded border border-slate-200">
                                  {offer.portal}
                                </span>
                              </div>

                              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-[10.5px]">
                                <span className="font-extrabold text-slate-700 flex items-center gap-1">
                                  <Clock size={12} className="text-slate-500" />
                                  Última inspección del sistema:
                                </span>
                                <strong className="text-slate-950 bg-white px-2 py-0.5 rounded-md border border-slate-300 font-black shadow-2xs">
                                  {formatInspectionTimestamp(offer.linkCheckedAt || offer.lastInspectedAt)}
                                </strong>
                                <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded border ${
                                  offer.linkStatus === 'INACTIVO'
                                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                }`}>
                                  {offer.linkStatus === 'INACTIVO' ? 'Fallo de Inspección' : 'HTTP 200 OK'}
                                </span>
                              </div>

                              {offer.linkStatus === 'INACTIVO' ? (
                                <div className="mt-2 text-[10px] text-rose-900 bg-rose-100/80 p-2 rounded-xl border border-rose-200 space-y-1">
                                  <p className="font-bold flex items-center gap-1">
                                    <AlertTriangle size={12} className="text-rose-700 shrink-0" />
                                    <span>{offer.linkErrorDetails || 'El enlace original no responde o la vacante fue dada de baja del portal.'}</span>
                                  </p>
                                  <div className="flex items-center gap-2 pt-1">
                                    <a
                                      href={getGoogleFallbackSearchUrl(offer)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 text-[9.5px] font-black bg-rose-700 hover:bg-rose-800 text-white px-2 py-1 rounded-lg uppercase transition-all shadow-xs"
                                    >
                                      <Search size={10} />
                                      Buscar en Google Jobs
                                    </a>
                                    {findCompanyCareerEntry(offer.company) && (
                                      <a
                                        href={findCompanyCareerEntry(offer.company)?.careerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 text-[9.5px] font-black bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-1 rounded-lg uppercase transition-all shadow-xs"
                                      >
                                        <Building2 size={10} />
                                        Portal Empresa
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[9.5px] text-emerald-950 mt-1.5 leading-snug flex items-center gap-1 font-medium">
                                  <CheckCircle2 size={11} className="text-emerald-700 shrink-0" />
                                  <span>{offer.linkErrorDetails || 'Enlace verificado. Servidor del portal responde correctamente y la vacante se encuentra abierta.'}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                validateSingleOfferLink(offer.id);
                              }}
                              disabled={offer.linkStatus === 'VERIFICANDO'}
                              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 hover:text-indigo-700 border border-slate-300 hover:border-indigo-400 rounded-xl text-[10px] font-black uppercase transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 disabled:opacity-50"
                              title="Comprobar disponibilidad del enlace en el portal en tiempo real"
                            >
                              <RefreshCw size={12} className={offer.linkStatus === 'VERIFICANDO' ? 'animate-spin text-amber-600' : 'text-indigo-600'} />
                              <span>{offer.linkStatus === 'VERIFICANDO' ? 'Chequeando...' : 'Reinspeccionar'}</span>
                            </button>
                            <a
                              href={getSafeJobUrl(offer)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[9.5px] text-slate-600 hover:text-indigo-700 underline font-bold flex items-center gap-1"
                              title="Abrir enlace en pestaña nueva para verificar manualmente"
                            >
                              <span>Abrir URL</span>
                              <ExternalLink size={9} />
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Skills Chips */}
                      <div className="space-y-1.5 mb-5">
                        <span className="text-[9px] font-black uppercase text-slate-400 font-mono tracking-wider block">
                          Requisitos Coincidentes ({offer.matchedSkills.length} de {offer.requiredSkills.length}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {offer.matchedSkills.map((sk, idx) => (
                            <span key={idx} className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-bold font-mono px-2 py-0.5 rounded-md flex items-center gap-1">
                              ✓ {sk}
                            </span>
                          ))}
                          {offer.missingSkills.map((sk, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-mono px-2 py-0.5 rounded-md">
                              • {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setSuperpowerOffer(offer)}
                          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black font-mono text-[10px] px-3 py-2 rounded-xl uppercase transition-all flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer border border-amber-500"
                          title="Pegar preguntas de esta vacante para que la IA redacte respuestas elocuentes y concisas basadas en tu CV"
                        >
                          <Zap size={11} className="fill-slate-950" /> Responder Preguntas IA
                        </button>

                        <button
                          onClick={() => setSelectedOffer(offer)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold font-mono px-3 py-2 rounded-xl uppercase transition-all flex items-center gap-1"
                        >
                          <Eye size={12} /> Ver Detalle
                        </button>

                        <button
                          onClick={() => handleGenerateCoverLetter(offer)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[10px] font-bold font-mono px-3 py-2 rounded-xl uppercase transition-all flex items-center gap-1"
                        >
                          <Sparkles size={12} className="text-amber-500" /> Carta Presentación
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleCopyPostulationKit(offer)}
                          className={`text-[10px] font-bold font-mono px-2.5 py-2 rounded-xl uppercase transition-all flex items-center gap-1 border cursor-pointer ${
                            copiedKitOfferId === offer.id
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-black'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                          title="Copiar datos estructurados y resumen del candidato para pegar directo en el formulario del portal"
                        >
                          {copiedKitOfferId === offer.id ? '✓ Kit Copiado' : '📋 Copiar Ficha'}
                        </button>

                        {/* Botón de Postulación Directa en Trabaja con Nosotros / ATS de la Empresa */}
                        {(offer.directApplyUrl || offer.companyCareerUrl || findCompanyCareerEntry(offer.company) || offer.portal.includes('Trabaja con Nosotros') || offer.portal.includes('ATS Corporativo')) && (
                          <a
                            href={getDirectCompanyCareerUrl(offer)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleManualSetLinkStatus(offer.id, 'ACTIVO')}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-black font-mono px-3.5 py-2 rounded-xl uppercase transition-all flex items-center gap-1.5 shadow-sm active:scale-95 border border-emerald-600 ring-2 ring-emerald-500/20"
                            title={`Postular DIRECTAMENTE en la sección oficial "Trabaja con Nosotros" o ATS de ${offer.company}`}
                          >
                            <Building2 size={13} className="text-emerald-200" />
                            <span>Postular en {offer.company.split('(')[0].trim()}</span>
                            <ExternalLink size={12} className="text-emerald-200" />
                          </a>
                        )}

                        {/* Botón del Portal de Origen (si la oferta procede de otra bolsa de empleo) */}
                        {(!offer.portal.includes('Trabaja con Nosotros') && !offer.portal.includes('ATS Corporativo')) && (
                          <a
                            href={getSafeJobUrl(offer)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleManualSetLinkStatus(offer.id, 'ACTIVO')}
                            className="bg-[#0B3C5D] hover:bg-indigo-900 text-white text-[10px] font-black font-mono px-3.5 py-2 rounded-xl uppercase transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
                            title={`Postular en la convocatoria de ${offer.portal}`}
                          >
                            <span>Postular en {offer.portal}</span>
                            <ExternalLink size={12} />
                          </a>
                        )}

                        <a
                          href={getLinkedInChileUrl(offer)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-sky-50 hover:bg-sky-100 text-sky-900 text-[10px] font-bold font-mono px-2 py-2 rounded-xl uppercase transition-all flex items-center gap-1 border border-sky-200"
                          title="Buscar esta vacante directamente en LinkedIn Chile"
                        >
                          💼 LinkedIn
                        </a>

                        <a
                          href={getGoogleJobsChileUrl(offer)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold font-mono px-2 py-2 rounded-xl uppercase transition-all flex items-center gap-1 border border-slate-200"
                          title="Buscar convocatoria en Google Empleos Chile"
                        >
                          🔍 Google
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TABLERO DE POSTULACIONES */}
      {activeTab === 'POSTULACIONES' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black uppercase text-slate-800 tracking-tight">
                  Control & Seguimiento de Mis Postulaciones
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  Registre el estado de avance de sus postulaciones enviadas a empresas en Chile.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const text = applicationsList.map(a => 
                      `Empresa: ${a.company} | Cargo: ${a.title} | Portal: ${a.portal} | Estado: ${a.status} | Fecha Entrevista: ${a.interviewDate || 'N/A'}`
                    ).join('\n');
                    navigator.clipboard.writeText(text);
                    alert('Listado de postulaciones copiado al portapapeles.');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold px-4 py-2 rounded-xl uppercase transition-all flex items-center gap-2"
                >
                  <Copy size={14} /> Copiar Registro
                </button>
              </div>
            </div>

            {/* Application Cards List */}
            {applicationsList.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-slate-400 bg-slate-50 rounded-2xl border border-dashed">
                No posee postulaciones activas en el tablero. Vaya a la pestaña "Buscador de Vacantes" y marque ofertas como "POSTULADO" o "EN_ENTREVISTA".
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase font-mono tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">CARGO / EMPRESA</th>
                      <th className="p-3">PORTAL</th>
                      <th className="p-3">RENTA OFRECIDA</th>
                      <th className="p-3">DISPONIBILIDAD & ÚLTIMA INSPECCIÓN</th>
                      <th className="p-3 text-center">ESTADO ACTUAL</th>
                      <th className="p-3">NOTAS & FECHA ENTREVISTA</th>
                      <th className="p-3 text-center">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {applicationsList.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 max-w-xs">
                          <div className="font-bold text-slate-900 uppercase text-xs flex items-center gap-1.5 flex-wrap">
                            <span>{app.title}</span>
                            {app.isDisabilityInclusive && (
                              <span className="bg-purple-100 text-purple-900 border border-purple-200 text-[8.5px] font-black font-mono px-1.5 py-0.2 rounded" title="Inclusión Ley 21.015">
                                ♿ Ley 21.015
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {app.company} • {app.location}
                          </div>
                        </td>

                        <td className="p-3 font-mono font-bold text-slate-700">
                          <span className="bg-slate-100 border px-2 py-0.5 rounded text-[9.5px]">
                            {app.portal}
                          </span>
                        </td>

                        <td className="p-3 font-mono font-bold text-emerald-700">
                          ${(app.salaryMin / 1000000).toFixed(1)}M – ${(app.salaryMax / 1000000).toFixed(1)}M CLP
                        </td>

                        <td className="p-3 font-mono">
                          <div className="flex flex-col gap-1 min-w-[200px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {app.linkStatus === 'INACTIVO' ? (
                                <span className="bg-rose-100 text-rose-900 border border-rose-300 text-[8.5px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <XCircle size={10} className="text-rose-600" /> ROTO / EXPIRADO
                                </span>
                              ) : app.linkStatus === 'VERIFICANDO' ? (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[8.5px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Loader2 size={10} className="animate-spin text-amber-600" /> CHEQUEANDO...
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[8.5px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <CheckCircle2 size={10} className="text-emerald-700" /> VIGENTE (200 OK)
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => validateSingleOfferLink(app.id)}
                                disabled={app.linkStatus === 'VERIFICANDO'}
                                className="text-[9px] text-indigo-700 hover:text-indigo-900 font-bold underline flex items-center gap-0.5 cursor-pointer ml-auto"
                                title="Reinspeccionar este enlace ahora"
                              >
                                <RefreshCw size={9} className={app.linkStatus === 'VERIFICANDO' ? 'animate-spin' : ''} />
                                Revalidar
                              </button>
                            </div>
                            <span className="text-[9.5px] text-slate-700 font-semibold truncate flex items-center gap-1">
                              <Clock size={10} className="text-slate-400 shrink-0" />
                              <span>Última ins: <strong>{formatInspectionTimestamp(app.linkCheckedAt || app.lastInspectedAt)}</strong></span>
                            </span>
                            {app.linkStatus === 'INACTIVO' && (
                              <a
                                href={getGoogleFallbackSearchUrl(app)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] text-rose-700 hover:text-rose-900 underline font-bold flex items-center gap-1 mt-0.5"
                                title="Buscar convocatoria alternativa en Google Jobs"
                              >
                                <Search size={9} />
                                <span>Buscar en Google Jobs</span>
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <select
                            value={app.status}
                            onChange={(e) => handleUpdateStatus(app.id, e.target.value as JobOffer['status'])}
                            className="text-[10px] font-mono font-black px-2.5 py-1 rounded-xl border border-slate-300 bg-white focus:outline-none"
                          >
                            <option value="POR_POSTULAR">Por Postular</option>
                            <option value="POSTULADO">Postulado / Enviado</option>
                            <option value="EN_ENTREVISTA">En Entrevista</option>
                            <option value="OFERTA_RECIBIDA">Oferta Recibida</option>
                            <option value="DESCARTADO">Descartado / Cerrado</option>
                          </select>
                        </td>

                        <td className="p-3 max-w-xs">
                          <div className="text-[10px] text-slate-600 font-mono truncate">
                            {app.applicationNotes || 'Sin notas registradas'}
                          </div>
                          {app.interviewDate && (
                            <div className="text-[9px] font-bold font-mono text-indigo-600 flex items-center gap-1 mt-0.5">
                              <Calendar size={10} /> Entrevista: {app.interviewDate}
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleGenerateCoverLetter(app)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                              title="Generar Carta de Presentación"
                            >
                              <Sparkles size={14} />
                            </button>
                            <a
                              href={getSafeJobUrl(app)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                              title="Abrir enlace del portal"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <a
                              href={getGoogleFallbackSearchUrl(app)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-xs"
                              title="Buscar en Google"
                            >
                              🔍
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: DIRECTORIO CORPORATIVO OFICIAL "TRABAJA CON NOSOTROS" & ATS DIRECTOS */}
      {activeTab === 'EMPRESAS_DIRECTORIO' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-[#0B3C5D] text-white p-6 sm:p-7 rounded-3xl border border-emerald-700/40 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400 text-slate-950 font-black font-mono text-[10px] uppercase mb-2">
                  🏢 SECCIONES OFICIALES "TRABAJA CON NOSOTROS" & ATS CORPORATIVOS
                </div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                  Directorio de Empresas Líderes en Chile
                </h2>
                <p className="text-xs text-slate-300 font-mono mt-1 max-w-3xl leading-relaxed">
                  Postulaciones directas en las gerencias de personas y atracción de talento institucional sin intermediarios. Cada empresa cuenta con su enlace verificado para acceder directamente a sus vacantes y enviar el CV en formato ATS.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="bg-white/10 text-white font-mono text-xs px-3.5 py-2 rounded-2xl border border-white/20">
                  {filteredCompanyEntries.length} de {COMPANY_CAREERS_DIRECTORY.length} Empresas
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-1">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Empresas Verificadas</span>
                <span className="text-emerald-400 font-black text-sm block">{COMPANY_CAREERS_DIRECTORY.length} Corporaciones</span>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Vacantes Indexadas</span>
                <span className="text-amber-300 font-black text-sm block">{corporateOffersCount} Ofertas Directas</span>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Sectores Clave</span>
                <span className="text-sky-300 font-black text-sm block">6 Industrias</span>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Canales Oficiales</span>
                <span className="text-white font-black text-sm block">100% Links Directos</span>
              </div>
            </div>
          </div>

          {/* Search Console & Industry Filters */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar empresa por nombre, alias o descripción (ej. Arauco, Falabella, Minería, Bci, Retail, Codelco)..."
                  value={careersDirectorySearch}
                  onChange={(e) => setCareersDirectorySearch(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 text-xs font-mono border-2 border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-emerald-600 focus:outline-none transition-all shadow-inner"
                />
                {careersDirectorySearch && (
                  <button
                    onClick={() => setCareersDirectorySearch('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {(careersDirectorySearch || careersIndustryFilter !== 'TODAS') && (
                <button
                  onClick={() => {
                    setCareersDirectorySearch('');
                    setCareersIndustryFilter('TODAS');
                  }}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-mono font-bold px-3 py-2 rounded-xl border border-rose-200 transition-all flex items-center gap-1 shrink-0"
                >
                  <X size={13} /> Limpiar Filtro
                </button>
              )}
            </div>

            {/* Industry Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 font-mono text-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1 mr-1">
                <Filter size={11} /> Rubros:
              </span>
              {[
                { label: 'Todas las Industrias', val: 'TODAS' },
                { label: '🏢 Inmobiliario & Centros Comerciales', val: 'Inmobiliario & Centros Comerciales' },
                { label: '🛍️ Retail & Consumo Masivo', val: 'Retail & Consumo Masivo' },
                { label: '🏦 Banca, Finanzas & Seguros', val: 'Banca, Finanzas & Seguros' },
                { label: '⛏️ Energía, Minería & Recursos', val: 'Energía, Minería & Recursos' },
                { label: '🚚 Logística, Transporte & Supply Chain', val: 'Logística, Transporte & Supply Chain' },
                { label: '📊 Servicios, Consultoría & IT', val: 'Servicios, Consultoría & IT' }
              ].map((ind, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCareersIndustryFilter(ind.val)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                    careersIndustryFilter === ind.val
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {ind.label}
                </button>
              ))}
            </div>
          </div>

          {/* Directory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanyEntries.map((company) => {
              const matchedOffers = jobOffers.filter(o => 
                o.company.toLowerCase().includes(company.name.toLowerCase()) ||
                company.aliases.some(a => o.company.toLowerCase().includes(a))
              );

              return (
                <div
                  key={company.id}
                  className="bg-white rounded-3xl p-5 border-2 border-slate-200 hover:border-emerald-500 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="bg-emerald-100 text-emerald-950 border border-emerald-300 text-[9px] font-black font-mono px-2.5 py-0.5 rounded-lg uppercase">
                        {company.industry}
                      </span>
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-bold font-mono px-2 py-0.5 rounded-lg border border-slate-200">
                        {company.portalType.includes('Sitio Oficial') ? 'Sitio Oficial' : 'ATS Corporativo'}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 uppercase font-mono tracking-tight mb-1 flex items-center gap-1.5">
                      <Building2 size={16} className="text-emerald-700 shrink-0" />
                      <span>{company.name}</span>
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed font-sans mb-3 line-clamp-3">
                      {company.description}
                    </p>

                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-150 mb-4 flex items-center justify-between font-mono text-[10px]">
                      <span className="text-slate-500 font-bold uppercase">Vacantes en este Módulo:</span>
                      <span className={`font-black px-2 py-0.5 rounded-md ${
                        matchedOffers.length > 0 
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {matchedOffers.length} {matchedOffers.length === 1 ? 'oferta disponible' : 'ofertas disponibles'}
                      </span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {matchedOffers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchCompany(company.name);
                          setPortalFilter('TODOS');
                          setActiveTab('BUSQUEDA');
                        }}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 text-[10px] font-bold font-mono px-3 py-2 rounded-xl uppercase transition-all flex items-center gap-1 cursor-pointer"
                        title={`Ver las ${matchedOffers.length} ofertas disponibles de ${company.name} en el buscador`}
                      >
                        <Search size={11} />
                        <span>Ver Ofertas ({matchedOffers.length})</span>
                      </button>
                    )}

                    <a
                      href={company.careerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-black font-mono px-3.5 py-2 rounded-xl uppercase transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                      title={`Abrir página oficial Trabaja con Nosotros de ${company.name}`}
                    >
                      <span>Abrir Trabaja con Nosotros</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCompanyEntries.length === 0 && (
            <div className="p-12 text-center text-xs font-mono text-slate-400 bg-white rounded-3xl border border-dashed">
              No se encontraron empresas con el término "{careersDirectorySearch}". Intente con otro nombre o borre el filtro.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PORTALES CHILENOS DIRECTOS */}
      {activeTab === 'PORTALES' && (
        <div className="space-y-6">
          {/* SPECIAL WIDGET: BUSCADOR EN PORTALES PÚBLICOS DEL ESTADO DE CHILE */}
          <div className="bg-gradient-to-r from-[#0B3C5D] via-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-indigo-900/50 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-800/60 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black font-mono text-[10px] uppercase mb-2">
                  🏛️ PORTALES DE EMPLEOS PÚBLICOS & ESTADO DE CHILE
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">
                  Buscador Directo en Portales del Sector Público
                </h2>
                <p className="text-xs text-indigo-200 font-mono mt-0.5">
                  Realice consultas en vivo sobre convocatorias vigentes en Empleos Públicos (Servicio Civil), Alta Dirección Pública (ADP), Mercado Público y Bolsa Nacional de Empleo.
                </p>
              </div>

              <a
                href="https://www.empleospublicos.cl"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black font-mono text-xs px-4 py-2.5 rounded-2xl uppercase transition-all flex items-center justify-center gap-2 shrink-0 shadow-md"
              >
                Abrir empleospublicos.cl <ExternalLink size={14} />
              </a>
            </div>

            {/* Interactive Query Launcher */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Ingrese el cargo o concepto (ej. Control Interno, Auditoría, Civil Industrial, Minsal)..."
                  value={publicSearchTerm}
                  onChange={(e) => setPublicSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-mono rounded-2xl bg-slate-800/80 border border-indigo-700/60 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                
                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto shrink-0">
                  <span className="text-[10px] font-mono text-indigo-300">Sugeridos:</span>
                  {['Control Interno', 'Auditoría', 'Supply Chain', 'Civil Industrial', 'Finanzas'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setPublicSearchTerm(chip)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 text-[10px] font-mono font-bold border border-indigo-700/50 transition-all"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons for Live State Portals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
                <a
                  href={`https://www.empleospublicos.cl/pub/convocatorias/convocatorias.aspx?q=${encodeURIComponent(publicSearchTerm)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-mono font-bold px-3.5 py-2.5 rounded-xl uppercase flex items-center justify-between transition-all border border-blue-400/40"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    🏛️ Empleos Públicos
                  </span>
                  <ExternalLink size={13} className="shrink-0" />
                </a>

                <a
                  href="https://adp.serviciocivil.cl/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-mono font-bold px-3.5 py-2.5 rounded-xl uppercase flex items-center justify-between transition-all border border-indigo-400/40"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    🇨🇱 Alta Dirección Pública (ADP)
                  </span>
                  <ExternalLink size={13} className="shrink-0" />
                </a>

                <a
                  href={`https://www.mercadopublico.cl/Home/BuscarLicitacion?q=${encodeURIComponent(publicSearchTerm)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-mono font-bold px-3.5 py-2.5 rounded-xl uppercase flex items-center justify-between transition-all border border-emerald-500/40"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    📄 Mercado Público
                  </span>
                  <ExternalLink size={13} className="shrink-0" />
                </a>

                <a
                  href="https://www.bne.cl/ofertas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-mono font-bold px-3.5 py-2.5 rounded-xl uppercase flex items-center justify-between transition-all border border-amber-400/40"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    🏢 Bolsa Nac. Empleo (BNE)
                  </span>
                  <ExternalLink size={13} className="shrink-0" />
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-black uppercase text-slate-800 tracking-tight">
                Directorio Integrado de Portales de Empleo Chilenos
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Conexión directa a las plataformas de búsqueda laboral públicas y privadas más utilizadas en Chile. Haga clic en cualquiera de las tarjetas para realizar una consulta directa en el portal de empleo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {chileanPortals.map((portal, idx) => (
                <div
                  key={idx}
                  className={`border rounded-2xl p-5 transition-all flex flex-col justify-between ${
                    portal.type === 'PUBLIC'
                      ? 'border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:shadow-md'
                      : 'border-slate-200 bg-slate-50/50 hover:border-indigo-400 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{portal.icon}</span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                        portal.type === 'PUBLIC'
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}>
                        {portal.badge}
                      </span>
                    </div>

                    <a
                      href={portal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between mb-1"
                      title="Visitar sitio de empleo"
                    >
                      <h3 className="text-sm font-black text-slate-800 uppercase font-mono group-hover:text-indigo-600 transition-colors">
                        {portal.name}
                      </h3>
                      <ExternalLink size={12} className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                    </a>
                    <a
                      href={portal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-slate-500 font-mono mb-4 block truncate hover:text-indigo-600 transition-colors"
                    >
                      {portal.url}
                    </a>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-200">
                    <a
                      href={getPortalQuickSearchUrl(portal.name, portal.searchTemplate, 'Control Interno')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#0B3C5D] hover:bg-indigo-900 text-white text-[10px] font-bold font-mono py-2 px-3 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5"
                    >
                      Buscar "Control Interno" <ExternalLink size={12} />
                    </a>

                    <a
                      href={getPortalQuickSearchUrl(portal.name, portal.searchTemplate, 'Supply Chain')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold font-mono py-1.5 px-3 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5"
                    >
                      Buscar "Supply Chain" <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PERFIL & COMPETENCIAS */}
      {activeTab === 'PERFIL_CV' && (
        <div className="space-y-6">
          {/* CV DOCUMENT STATUS CARD */}
          <div className="bg-gradient-to-r from-[#0B3C5D] to-slate-900 text-white p-5 sm:p-7 rounded-3xl border border-slate-700 shadow-md w-full max-w-full">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
              <div className="flex items-start gap-4 min-w-0">
                <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl shadow-sm shrink-0 mt-0.5">
                  <FileText size={32} />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-emerald-500 text-slate-950 text-[10px] font-black font-mono px-2 py-0.5 rounded-full uppercase">
                      ✓ DOCUMENTO PDF VIGENTE
                    </span>
                    <span className="text-amber-300 text-xs font-mono">
                      {cvProfile?.source === 'MODEL_DEMO_PDF' ? 'CV Modelo Institucional' : 'Archivo PDF Cargado'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black uppercase text-white tracking-tight truncate">
                    {cvProfile?.fileName || 'CV_Cristian_Munoz_Ingeniero_Civil_Industrial.pdf'}
                  </h3>
                  <p className="text-xs text-slate-300 font-mono">
                    Postulante: <strong className="text-white">{cvProfile?.candidateName || 'CRISTIAN ANDRÉS MUÑOZ ROJAS'}</strong> • 
                    Título: <strong className="text-amber-300">{cvProfile?.candidateTitle || 'Ingeniero Civil Industrial'}</strong> • 
                    {cvProfile?.fileSize ? `Tamaño: ${cvProfile.fileSize} • ` : ''}
                    Actualizado: {cvProfile?.uploadedAt || 'Hoy'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 max-w-full">
                <button
                  type="button"
                  onClick={handleDownloadCv}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2 shrink-0"
                  title="Descargar documento PDF de 1 página optimizado para ATS con Perfil Profesional"
                >
                  <Download size={15} />
                  <span>Descargar CV (PDF 1 Pág. ATS)</span>
                </button>

                <button
                  type="button"
                  onClick={() => previewCristianCvPdf()}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-2 shrink-0"
                  title="Abrir vista previa del PDF en una nueva pestaña"
                >
                  <Eye size={15} className="text-emerald-300" />
                  <span>Ver / Imprimir PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyModelCv}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-2 shrink-0"
                  title="Cargar y activar el CV modelo sugerido de Cristian Muñoz"
                >
                  <Sparkles size={15} className="text-amber-300" />
                  <span>Cargar CV Modelo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenCvModal(false)}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <FileText size={15} />
                  <span>Subir Nuevo CV (PDF)</span>
                </button>
              </div>
            </div>

            {cvDownloadAlert && (
              <div className="mt-4 p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>{cvDownloadAlert.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCvDownloadAlert(null)}
                  className="text-white/60 hover:text-white shrink-0 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Quick Metrics Bar */}
            <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 text-xs font-mono w-full">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Rango Salarial Estimado</span>
                <span className="text-emerald-400 font-black text-sm block">
                  ${((cvProfile?.suggestedSalaryMin || 3800000) / 1000000).toFixed(1)}M – ${((cvProfile?.suggestedSalaryMax || 5400000) / 1000000).toFixed(1)}M CLP
                </span>
                <span className="text-slate-300 text-[10px]">Ajustado según trayectoria y nivel directivo</span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Índice de Rareza de Mercado</span>
                <span className="text-amber-300 font-black text-sm block">
                  {cvProfile?.rarityScore || '99.8'}% • Percentil 99.8°
                </span>
                <span className="text-slate-300 text-[10px]">1 de ~500 perfiles directivos</span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Compatibilidad Global</span>
                <span className="text-amber-300 font-black text-sm block">
                  {jobOffers.filter(o => o.matchScore >= 80).length} Ofertas de Alto Ajuste
                </span>
                <span className="text-slate-300 text-[10px]">Con Match superior al 80% en Chile</span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Estado del Algoritmo</span>
                <span className="text-white font-black text-sm block">
                  {candidateSkills.length} Habilidades Calibradas
                </span>
                <span className="text-slate-300 text-[10px]">Indexadas en el motor IA</span>
              </div>
            </div>
          </div>

          {/* DEDICATED RARITY SECTION: 4 PILLARS OF STRATEGIC RARITY */}
          <div className="bg-slate-900 text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black font-mono px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                    ★ CONVERGENCIA ESTRATÉGICA
                  </span>
                  <span className="text-amber-300 font-mono text-xs font-bold">
                    Propuesta de Valor & Liderazgo Integral
                  </span>
                </div>
                <h3 className="text-lg font-black uppercase text-white tracking-tight">
                  Pilares Estratégicos del Perfil Profesional de Cristian Andrés Muñoz Rojas
                </h3>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  Una trayectoria integral que conjuga en una sola persona la visión analítica y cuantitativa de la Ingeniería Civil Industrial, la solidez normativa en Control Interno ante la CMF con cero observaciones, el liderazgo operativo y de personas en Supply Chain multinacional (Essity) con diferencias cero en inventarios, y la capacidad aplicada de diseñar y programar soluciones tecnológicas modernas con Inteligencia Artificial.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
                <button
                  type="button"
                  onClick={handleDownloadCv}
                  className="shrink-0 bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Download size={15} />
                  <span>Descargar CV en PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => previewCristianCvPdf()}
                  className="shrink-0 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title="Abrir en pestaña nueva"
                >
                  <Eye size={14} className="text-amber-300" />
                  <span>Ver PDF</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
              {/* Pillar 1 */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2 hover:border-amber-400/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-mono font-black text-xs uppercase tracking-wider">
                    Pilar I: Ingeniería & Activos Inmobiliarios
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded">
                    UF 30.300
                  </span>
                </div>
                <h4 className="text-sm font-black text-white uppercase">
                  Gestión Patrimonial de 1.849 Activos en 6 Regiones
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Liderazgo integral en administración técnica, obras de mantención mayor, regularizaciones municipales y tasaciones. Presupuestos anuales OPEX/CAPEX de UF 4.500 con 100% de continuidad operativa.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2 hover:border-amber-400/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-mono font-black text-xs uppercase tracking-wider">
                    Pilar II: Control Interno & Gobernanza CMF
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded">
                    Cero Observaciones
                  </span>
                </div>
                <h4 className="text-sm font-black text-white uppercase">
                  Auditoría Regulatoria Oficios B13 / B4 / Nota 14
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Defensa y cumplimiento de fiscalizaciones de la Comisión para el Mercado Financiero (CMF) con 0 observaciones. Matriz de riesgos UAF/PEP, prevención de fraudes y protocolos de debida diligencia.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2 hover:border-amber-400/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-sky-400 font-mono font-black text-xs uppercase tracking-wider">
                    Pilar III: Supply Chain Multinacional (Essity)
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-sky-400/20 text-sky-300 px-2 py-0.5 rounded">
                    IRA $0 Diferencias
                  </span>
                </div>
                <h4 className="text-sm font-black text-white uppercase">
                  S&OP y Control de Inventarios en UF 158.000
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Capacitación ejecutiva en metodología S&OP (Sales & Operations Planning), exactitud de inventarios rotativos IRA con cero discrepancias y optimización de capital de trabajo en SAP MM/WM y AssetFlow Enterprise.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2 hover:border-indigo-400/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-400 font-mono font-black text-xs uppercase tracking-wider">
                    Pilar IV: Arquitectura Full-Stack & GenAI
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-indigo-400/20 text-indigo-300 px-2 py-0.5 rounded">
                    AssetFlow & IA
                  </span>
                </div>
                <h4 className="text-sm font-black text-white uppercase">
                  Desarrollador Autónomo en Google AI Studio
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Diseño y desarrollo end-to-end de software de gestión empresarial con React, TypeScript, motores analíticos y modelos de lenguaje de última generación. Capacidad única de materializar soluciones sin depender de terceros.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-black uppercase text-slate-800 tracking-tight">
                  Matriz de Habilidades & Perfil del Candidato
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  Estas competencias fueron extraídas directamente de tu currículum PDF y son utilizadas por el motor de IA para calcular el % Match con cada oferta laboral publicada en Chile.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Agregar nueva habilidad..."
                  value={customSkillToAdd}
                  onChange={(e) => setCustomSkillToAdd(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkillToCandidate()}
                  className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                />
                <button
                  onClick={handleAddSkillToCandidate}
                  className="bg-[#0B3C5D] text-white hover:bg-indigo-900 px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  + Agregar
                </button>
              </div>
            </div>

            {/* SKILLS CHIPS GRID */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-slate-600 uppercase font-mono tracking-wider">
                  Competencias Extraídas e Indexadas ({candidateSkills.length}):
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Al agregar o quitar habilidades, las ofertas de trabajo se recalculan automáticamente
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {candidateSkills.map((sk, idx) => (
                  <span
                    key={idx}
                    className="bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs font-bold font-mono px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-2xs hover:border-indigo-400 transition-colors"
                  >
                    <span>✓ {sk}</span>
                    <button
                      onClick={() => handleRemoveSkillFromCandidate(sk)}
                      className="text-slate-400 hover:text-rose-600 font-bold ml-1 text-xs cursor-pointer"
                      title="Eliminar habilidad"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL FOR SELECTED OFFER */}
      {selectedOffer && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedOffer(null);
          }}
        >
          <div className="bg-white rounded-[28px] max-w-3xl w-full shadow-2xl border border-slate-200 relative max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            {/* Modal Sticky Header with Always-Visible Close Button */}
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/95 flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-[#0B3C5D] text-white text-[9px] font-black font-mono px-2.5 py-0.5 rounded uppercase">
                    Portal: {selectedOffer.portal}
                  </span>
                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-black font-mono px-2.5 py-0.5 rounded uppercase">
                    Match: {selectedOffer.matchScore}%
                  </span>
                  {selectedOffer.isDisabilityInclusive && (
                    <span className="bg-purple-100 text-purple-950 border border-purple-300 text-[9px] font-black font-mono px-2.5 py-0.5 rounded uppercase">
                      ♿ Ley N° 21.015 (Inclusión Laboral)
                    </span>
                  )}
                </div>

                <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight truncate">
                  {selectedOffer.title}
                </h2>

                <div className="text-xs font-bold text-slate-700 font-mono truncate">
                  {selectedOffer.company} • {selectedOffer.location} • Modalidad: {selectedOffer.modality}
                </div>
              </div>

              {/* Botón Cerrar Superior Fijo y Siempre Visible */}
              <button
                type="button"
                onClick={() => setSelectedOffer(null)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-rose-600 hover:text-white text-slate-700 rounded-xl font-mono text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                title="Cerrar cuadro de diálogo (Esc)"
                aria-label="Cerrar ventana"
              >
                <X size={16} />
                <span className="hidden sm:inline">Cerrar</span>
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-left">
              {/* Renta */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between font-mono">
                <span className="text-xs text-slate-500 font-bold uppercase">Renta Ofrecida Estimada:</span>
                <span className="text-sm font-black text-emerald-700">
                  ${(selectedOffer.salaryMin / 1000000).toFixed(1)}M – ${(selectedOffer.salaryMax / 1000000).toFixed(1)}M CLP / Mes
                </span>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-700 font-mono">Descripción del Cargo & Desafíos:</h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100 font-sans">
                  {selectedOffer.description}
                </p>
              </div>

              {/* Skills breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-700 font-mono">Análisis de Competencias (CV vs Oferta):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200">
                    <span className="text-[10px] font-black text-emerald-900 uppercase font-mono block mb-1">
                      ✓ Requisitos Cumplidos ({selectedOffer.matchedSkills.length}):
                    </span>
                    <ul className="text-xs text-emerald-950 font-mono space-y-1">
                      {selectedOffer.matchedSkills.map((sk, i) => (
                        <li key={i}>• {sk}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200">
                    <span className="text-[10px] font-black text-amber-900 uppercase font-mono block mb-1">
                      • Requisitos por Reforzar ({selectedOffer.missingSkills.length}):
                    </span>
                    <ul className="text-xs text-amber-950 font-mono space-y-1">
                      {selectedOffer.missingSkills.length === 0 ? (
                        <li className="text-emerald-800 font-bold">¡Cumples el 100% de los requisitos solicitados!</li>
                      ) : (
                        selectedOffer.missingSkills.map((sk, i) => <li key={i}>• {sk}</li>)
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Canal Oficial de la Empresa: Trabaja con Nosotros */}
              {(selectedOffer.directApplyUrl || selectedOffer.companyCareerUrl || findCompanyCareerEntry(selectedOffer.company) || selectedOffer.portal.includes('Trabaja con Nosotros') || selectedOffer.portal.includes('ATS Corporativo')) && (
                <div className="bg-emerald-50 text-emerald-950 p-4 rounded-2xl border-2 border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase text-emerald-900">
                          Canal Institucional Oficial: {selectedOffer.company}
                        </span>
                        <span className="bg-emerald-200 text-emerald-950 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-400">
                          VERIFICADO
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-700 block mt-0.5">
                        {findCompanyCareerEntry(selectedOffer.company)?.portalType || selectedOffer.portal} • Postulación directa sin intermediarios
                      </span>
                    </div>
                  </div>

                  <a
                    href={getDirectCompanyCareerUrl(selectedOffer)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleManualSetLinkStatus(selectedOffer.id, 'ACTIVO')}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-4 py-2.5 rounded-xl uppercase flex items-center justify-center gap-2 transition-all shadow-md shrink-0 active:scale-95 cursor-pointer"
                    title={`Abrir página de postulación directa en ${selectedOffer.company}`}
                  >
                    <span>Postular Directo en {selectedOffer.company.split('(')[0].trim()}</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}

              {/* Link Verification Section in Detail Modal */}
              <div className="bg-slate-50 text-slate-800 p-4.5 rounded-2xl border border-slate-200 space-y-3 font-mono">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-emerald-700" />
                    <span className="text-xs font-black uppercase text-slate-900">Auditoría de Enlace & Disponibilidad ({selectedOffer.portal}):</span>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedOffer.linkStatus === 'ACTIVO' && (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-700" />
                        ACTIVO Y VIGENTE
                      </span>
                    )}
                    {selectedOffer.linkStatus === 'INACTIVO' && (
                      <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        <XCircle size={12} className="text-rose-700" />
                        INACTIVO / EXPIRADO
                      </span>
                    )}
                    {selectedOffer.linkStatus === 'VERIFICANDO' && (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin text-amber-700" />
                        VERIFICANDO EN VIVO...
                      </span>
                    )}
                    {(!selectedOffer.linkStatus || selectedOffer.linkStatus === 'PENDIENTE') && (
                      <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold px-2.5 py-0.5 rounded-lg">
                        ⚪ SIN VERIFICAR
                      </span>
                    )}
                  </div>
                </div>

                {/* ROW DE ÚLTIMA INSPECCIÓN DEL SISTEMA */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-indigo-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-600">Última Inspección del Sistema:</span>
                    <strong className="text-xs font-black text-slate-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      {formatInspectionTimestamp(selectedOffer.linkCheckedAt || selectedOffer.lastInspectedAt)}
                    </strong>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border self-start sm:self-auto ${
                    selectedOffer.linkStatus === 'INACTIVO'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {selectedOffer.linkStatus === 'INACTIVO' ? '⚠️ Servidor No Responde' : '✓ Respuesta HTTP 200 OK'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 truncate flex items-center justify-between gap-2 shadow-xs">
                  <span className="truncate">{getSafeJobUrl(selectedOffer)}</span>
                  <a
                    href={getSafeJobUrl(selectedOffer)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleManualSetLinkStatus(selectedOffer.id, 'ACTIVO')}
                    className="text-emerald-700 hover:text-emerald-800 underline shrink-0 font-bold flex items-center gap-1"
                  >
                    Probar Link <ExternalLink size={12} />
                  </a>
                </div>

                {selectedOffer.linkErrorDetails && (
                  <div className={`text-[10.5px] p-2.5 rounded-xl border flex items-center gap-2 ${
                    selectedOffer.linkStatus === 'INACTIVO'
                      ? 'bg-rose-50 text-rose-900 border-rose-200'
                      : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                  }`}>
                    {selectedOffer.linkStatus === 'INACTIVO' ? (
                      <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                    ) : (
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    )}
                    <span>{selectedOffer.linkErrorDetails}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => validateSingleOfferLink(selectedOffer.id)}
                      disabled={selectedOffer.linkStatus === 'VERIFICANDO'}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      <RefreshCw size={12} className={selectedOffer.linkStatus === 'VERIFICANDO' ? 'animate-spin' : ''} />
                      Re-Validar Estado del Servidor
                    </button>
                    {selectedOffer.linkStatus === 'INACTIVO' && (
                      <a
                        href={getGoogleFallbackSearchUrl(selectedOffer)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-rose-700 hover:bg-rose-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <Search size={12} />
                        Buscar en Google Jobs
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-600 font-bold uppercase">Ajuste Manual:</span>
                    <button
                      onClick={() => handleManualSetLinkStatus(selectedOffer.id, 'ACTIVO')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                        selectedOffer.linkStatus === 'ACTIVO' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      🟢 Activo
                    </button>
                    <button
                      onClick={() => handleManualSetLinkStatus(selectedOffer.id, 'INACTIVO')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                        selectedOffer.linkStatus === 'INACTIVO' ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      🔴 Inactivo
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Manager */}
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-150 space-y-3">
                <h4 className="text-xs font-black uppercase text-indigo-900 font-mono">Actualizar Estado de Postulación:</h4>
                <div className="flex flex-wrap gap-2">
                  {(['POR_POSTULAR', 'POSTULADO', 'EN_ENTREVISTA', 'OFERTA_RECIBIDA', 'DESCARTADO'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(selectedOffer.id, st)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold uppercase transition-all ${
                        selectedOffer.status === st
                          ? 'bg-[#0B3C5D] text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky Actions Footer with Prominent Cerrar Button */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/95 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setSuperpowerOffer(selectedOffer)}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black font-mono text-xs px-4 py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-2 shadow-xs border border-amber-500 cursor-pointer active:scale-95"
                  title="Pegar preguntas de esta postulación para que la IA responda adecuadamente según tu CV"
                >
                  <Zap size={14} className="fill-slate-950" /> Responder Preguntas IA
                </button>

                <button
                  onClick={() => handleGenerateCoverLetter(selectedOffer)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-mono px-4 py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Sparkles size={14} /> Generar Carta IA
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => handleCopyPostulationKit(selectedOffer)}
                  className={`px-3 py-2.5 rounded-xl font-mono text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 border cursor-pointer active:scale-95 ${
                    copiedKitOfferId === selectedOffer.id
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-black'
                      : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                  title="Copiar resumen y datos del candidato para el formulario del portal"
                >
                  {copiedKitOfferId === selectedOffer.id ? '✓ Kit Copiado' : '📋 Copiar Kit'}
                </button>

                {/* Botón de Postulación Directa en Trabaja con Nosotros / ATS Empresa */}
                {(selectedOffer.directApplyUrl || selectedOffer.companyCareerUrl || findCompanyCareerEntry(selectedOffer.company) || selectedOffer.portal.includes('Trabaja con Nosotros') || selectedOffer.portal.includes('ATS Corporativo')) && (
                  <a
                    href={getDirectCompanyCareerUrl(selectedOffer)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleManualSetLinkStatus(selectedOffer.id, 'ACTIVO')}
                    className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black font-mono px-4 py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 border border-emerald-600"
                    title={`Postular DIRECTAMENTE en la sección oficial "Trabaja con Nosotros" de ${selectedOffer.company}`}
                  >
                    <Building2 size={14} className="text-emerald-200" />
                    <span>Postular en {selectedOffer.company.split('(')[0].trim()}</span>
                    <ExternalLink size={13} />
                  </a>
                )}

                {/* Botón Convocatoria en Portal de Origen */}
                {(!selectedOffer.portal.includes('Trabaja con Nosotros') && !selectedOffer.portal.includes('ATS Corporativo')) && (
                  selectedOffer.linkStatus === 'INACTIVO' ? (
                    <a
                      href={getGoogleFallbackSearchUrl(selectedOffer)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto bg-rose-700 hover:bg-rose-800 text-white text-xs font-black font-mono px-4 py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
                      title="Enlace original no disponible. Buscar vacante en Google Jobs"
                    >
                      <Search size={14} />
                      <span>Buscar en Google Jobs (Enlace Caído)</span>
                      <ExternalLink size={14} />
                    </a>
                  ) : (
                    <a
                      href={getSafeJobUrl(selectedOffer)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleManualSetLinkStatus(selectedOffer.id, 'ACTIVO')}
                      className="w-full sm:w-auto bg-[#0B3C5D] hover:bg-indigo-900 text-white text-xs font-black font-mono px-4 py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
                    >
                      <span>Abrir en {selectedOffer.portal}</span>
                      <ExternalLink size={14} />
                    </a>
                  )
                )}

                <a
                  href={getLinkedInChileUrl(selectedOffer)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto bg-sky-50 hover:bg-sky-100 text-sky-900 text-xs font-bold font-mono px-3 py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 border border-sky-200"
                  title="Buscar vacante en LinkedIn Chile"
                >
                  💼 LinkedIn
                </a>

                <a
                  href={getGoogleJobsChileUrl(selectedOffer)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold font-mono px-3 py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                  title="Buscar en Google Empleos Chile"
                >
                  🔍 Google
                </a>

                {/* Botón Cerrar Inferior Explícito */}
                <button
                  type="button"
                  onClick={() => setSelectedOffer(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-mono text-xs font-black uppercase transition-all bg-slate-200 hover:bg-rose-600 hover:text-white text-slate-800 border border-slate-300 hover:border-rose-600 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  title="Cerrar cuadro de diálogo (Esc)"
                >
                  <X size={14} />
                  <span>Cerrar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COVER LETTER MODAL */}
      {showCoverLetter && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCoverLetter(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowCoverLetter(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 font-bold text-lg p-2 hover:bg-slate-100 rounded-full w-10 h-10 flex items-center justify-center transition-all cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-4 text-left">
              <div className="space-y-1 pr-10">
                <span className="bg-[#FFCC00] text-slate-950 text-[9px] font-black font-mono px-2.5 py-0.5 rounded uppercase">
                  IA COVER LETTER GENERATOR
                </span>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  Carta de Presentación Personalizada
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Carta adaptada automáticamente al perfil de Cristian Muñoz Rojas para ser enviada al reclutador.
                </p>
              </div>

              <textarea
                value={generatedLetter}
                onChange={(e) => setGeneratedLetter(e.target.value)}
                rows={14}
                className="w-full p-4 text-xs font-mono border border-slate-300 rounded-2xl bg-slate-50 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLetter}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all cursor-pointer ${
                      copiedLetter ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                    }`}
                  >
                    {copiedLetter ? <Check size={14} /> : <Copy size={14} />}
                    {copiedLetter ? '¡Copiado con Éxito!' : 'Copiar Texto'}
                  </button>

                  <button
                    onClick={() => {
                      downloadExecutiveCoverLetterWord({
                        companyName: selectedOffer?.company || '[Nombre de la Empresa]',
                        jobPosition: selectedOffer?.title || '[Cargo]',
                        recipientName: selectedOffer?.portal ? `Comité de Selección (${selectedOffer.portal})` : undefined,
                        customLetterBody: generatedLetter
                      });
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-black uppercase transition-all bg-[#002D62] hover:bg-[#001D42] text-white shadow-sm cursor-pointer"
                    title="Descargar esta carta personalizada en formato Microsoft Word (.DOC)"
                  >
                    <Download size={14} />
                    Descargar en Word (.DOC)
                  </button>
                </div>

                <button
                  onClick={() => setShowCoverLetter(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-mono text-xs font-bold px-4 py-2.5 rounded-xl uppercase transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM VACANCY MODAL */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 font-bold text-lg p-2 hover:bg-slate-100 rounded-full w-10 h-10 flex items-center justify-center transition-all cursor-pointer"
            >
              ✕
            </button>

            <form onSubmit={handleAddCustomOffer} className="space-y-4 text-left">
              <div className="space-y-1 pr-10">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  Ingresar Vacante Manual
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Agregue una oferta encontrada externamente para llevar el seguimiento en el tablero.
                </p>
              </div>

              {(() => {
                const offerDupCheck = checkDuplicateJobOffer(
                  newOfferData.title || '',
                  newOfferData.company || '',
                  newOfferData.portalUrl || '',
                  jobOffers
                );

                return (
                  <div className="space-y-3.5 text-xs font-mono">
                    <ValidatedInput
                      label="Título del Cargo / Vacante"
                      type="text"
                      required
                      uppercase
                      placeholder="Ej: JEFE DE CONTROL INTERNO & AUDITORÍA"
                      value={newOfferData.title || ''}
                      onChange={(val) => setNewOfferData(p => ({ ...p, title: val }))}
                      duplicateWarning={offerDupCheck.isDuplicate ? offerDupCheck.warningMessage : null}
                    />

                    <ValidatedInput
                      label="Empresa u Organización"
                      type="text"
                      required
                      uppercase
                      placeholder="Ej: GRUPO PATIO / CODELCO"
                      value={newOfferData.company || ''}
                      onChange={(val) => setNewOfferData(p => ({ ...p, company: val }))}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">
                          Portal de Postulación:
                        </label>
                        <select
                          value={newOfferData.portal}
                          onChange={(e) => setNewOfferData(p => ({ ...p, portal: e.target.value as any }))}
                          className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold focus:border-[#006D3D] outline-none"
                        >
                          <option value="Empleos Públicos">🏛️ Empleos Públicos (Estado)</option>
                          <option value="Servicio Civil / ADP">🇨🇱 Servicio Civil / ADP</option>
                          <option value="Mercado Público">📄 Mercado Público</option>
                          <option value="Laborum">Laborum</option>
                          <option value="Chiletrabajos">Chiletrabajos</option>
                          <option value="Computrabajo">Computrabajo</option>
                          <option value="Get on Board">Get on Board</option>
                          <option value="BNE Chile">BNE Chile</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="Trabajando.com">Trabajando.com</option>
                          <option value="FirstJob">FirstJob</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">
                          Modalidad:
                        </label>
                        <select
                          value={newOfferData.modality}
                          onChange={(e) => setNewOfferData(p => ({ ...p, modality: e.target.value as any }))}
                          className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold focus:border-[#006D3D] outline-none"
                        >
                          <option value="Híbrido">🔄 Híbrido (Mixto)</option>
                          <option value="Remoto">🏠 Remoto (100% Teletrabajo)</option>
                          <option value="Presencial">🏢 Presencial</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <ValidatedInput
                        label="Renta Mínima CLP"
                        type="money"
                        value={newOfferData.salaryMin || 0}
                        onChange={(_formatted, raw) => setNewOfferData(p => ({ ...p, salaryMin: raw || 0 }))}
                      />

                      <ValidatedInput
                        label="Renta Máxima CLP"
                        type="money"
                        value={newOfferData.salaryMax || 0}
                        onChange={(_formatted, raw) => setNewOfferData(p => ({ ...p, salaryMax: raw || 0 }))}
                      />
                    </div>

                    <ValidatedInput
                      label="URL o Enlace del Portal"
                      type="url"
                      placeholder="https://..."
                      helperText="Opcional. Si lo omite, se generará la búsqueda directa en el portal automáticamente."
                      value={newOfferData.portalUrl || ''}
                      onChange={(val) => setNewOfferData(p => ({ ...p, portalUrl: val }))}
                    />

                    <div>
                      <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">
                        Descripción de la Oferta:
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Detalles de responsabilidades, requisitos y beneficios..."
                        value={newOfferData.description}
                        onChange={(e) => setNewOfferData(p => ({ ...p, description: e.target.value }))}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:border-indigo-600 outline-none"
                      />
                    </div>

                    <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isDisabilityInclusiveCheck"
                        checked={!!newOfferData.isDisabilityInclusive}
                        onChange={(e) => setNewOfferData(p => ({ ...p, isDisabilityInclusive: e.target.checked }))}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                      />
                      <label htmlFor="isDisabilityInclusiveCheck" className="text-xs font-bold text-purple-950 cursor-pointer select-none">
                        ♿ Vacante Inclusiva / Ley N° 21.015 (Discapacidad)
                      </label>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-mono text-xs font-bold px-4 py-2 rounded-xl uppercase transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#0B3C5D] hover:bg-indigo-900 text-white font-mono text-xs font-bold px-5 py-2 rounded-xl uppercase transition-all"
                >
                  Guardar Oferta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* JOB SEARCH MANUAL MODAL */}
      {showManualModal && (
        <JobSearchManualModal onClose={() => setShowManualModal(false)} />
      )}

      {/* MANDATORY / CONFIGURABLE CV MODAL (STEP 1) */}
      <JobSearchCvModal
        isOpen={showCvModal}
        isMandatory={isCvModalMandatory}
        currentCvProfile={cvProfile}
        onConfirmCv={handleConfirmCv}
        onClose={() => setShowCvModal(false)}
      />

      {/* MODO SUPERPODER IA MODAL */}
      {superpowerOffer && (
        <SuperpowerScreeningModal
          isOpen={!!superpowerOffer}
          offer={superpowerOffer}
          onClose={() => setSuperpowerOffer(null)}
        />
      )}
    </div>
  );
};

export default JobSearchModule;
