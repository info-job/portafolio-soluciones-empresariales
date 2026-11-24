import React, { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  MarkerType,
  Position,
  Handle,
  Panel,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  ConnectionLineType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  GitFork, Printer, Download, Layers, ShieldCheck, 
  Database, FileText, Check, ChevronRight, Info, 
  HelpCircle, Eye, Sliders, Maximize2, Play, Square,
  Building2, Briefcase, Hammer, Wallet
} from 'lucide-react';

export type FlowchartId = 'OT_RECEPCION' | 'ARRIENDO_GARANTIA' | 'PROVEEDORES_UAF' | 'SEGURIDAD_RBAC' | 'INGESTA_FINANZAS' | 'EMPLEO_MATCH_CV' | 'OFICIOS_GESTION';

interface StepDetail {
  id: string;
  stepNumber: number;
  title: string;
  jdeProgram: string;
  role: string;
  roleColor: string;
  description: string;
  tables: string[];
  controls: string[];
  keyShortcuts?: string;
}

// -------------------------------------------------------------
// CUSTOM BIZAGI & VISIO NODES
// -------------------------------------------------------------

// 1. Bizagi Start Event (Green Circle)
const BizagiStartNode = ({ data }: { data: any }) => (
  <div className="flex flex-col items-center cursor-pointer group">
    <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-emerald-500 border-2 border-white" />
    <div className="w-12 h-12 rounded-full bg-emerald-500 border-2 border-emerald-700 shadow-md flex items-center justify-center text-white group-hover:scale-110 transition-transform">
      <Play size={18} fill="currentColor" />
    </div>
    <div className="mt-1.5 text-center max-w-[130px]">
      <span className="text-[10px] font-black uppercase text-emerald-900 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300 block leading-tight shadow-2xs">
        {data.label}
      </span>
    </div>
  </div>
);

// 2. Bizagi End Event (Red Double-border Circle)
const BizagiEndNode = ({ data }: { data: any }) => (
  <div className="flex flex-col items-center cursor-pointer group">
    <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-rose-600 border-2 border-white" />
    <div className="w-12 h-12 rounded-full bg-rose-600 border-4 border-rose-900 shadow-md flex items-center justify-center text-white group-hover:scale-110 transition-transform">
      <Square size={16} fill="currentColor" />
    </div>
    <div className="mt-1.5 text-center max-w-[130px]">
      <span className="text-[10px] font-black uppercase text-rose-900 bg-rose-100/90 px-1.5 py-0.5 rounded border border-rose-300 block leading-tight shadow-2xs">
        {data.label}
      </span>
    </div>
  </div>
);

// 3. Bizagi / Visio User Task (Rounded Rectangle with Blue Header)
const BizagiTaskNode = ({ data, selected }: { data: any, selected?: boolean }) => (
  <div className={`w-56 bg-white rounded-2xl border-2 shadow-sm transition-all text-left overflow-hidden cursor-pointer ${
    selected 
      ? 'border-[#0B3C5D] ring-4 ring-[#0B3C5D]/20 shadow-xl scale-102' 
      : 'border-slate-300 hover:border-[#0B3C5D] hover:shadow-md'
  }`}>
    <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-[#0B3C5D] border-2 border-white" />
    <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-[#0B3C5D] border-2 border-white" />
    <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 bg-[#0B3C5D] border-2 border-white" />
    <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 bg-[#0B3C5D] border-2 border-white" />

    {/* Task Header */}
    <div className="bg-[#0B3C5D] px-3 py-1.5 flex items-center justify-between text-white">
      <div className="flex items-center gap-1.5">
        <span className="w-4.5 h-4.5 rounded-full bg-[#FFCC00] text-[#0B3C5D] font-mono font-black text-[9px] flex items-center justify-center">
          {data.stepNumber || '•'}
        </span>
        <span className="text-[9px] font-black uppercase tracking-wider truncate max-w-[120px]">
          {data.jdeProgram || 'PROCESO ERP'}
        </span>
      </div>
      <span className="text-[7.5px] font-mono bg-white/20 px-1.5 py-0.2 rounded font-black text-amber-200 uppercase">
        TASK
      </span>
    </div>

    {/* Task Body */}
    <div className="p-3 space-y-1.5 bg-slate-50/50">
      <span className={`text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded border inline-block ${data.roleColor || 'bg-slate-100 text-slate-700'}`}>
        {data.role}
      </span>
      <h4 className="text-xs font-black text-slate-800 uppercase leading-snug">
        {data.title}
      </h4>
      <p className="text-[9.5px] text-slate-500 font-medium leading-tight line-clamp-2">
        {data.description}
      </p>

      {/* Database Tables footer */}
      {data.tables && data.tables.length > 0 && (
        <div className="pt-1.5 border-t border-slate-200 flex items-center gap-1 text-[8.5px] font-mono text-slate-500 truncate">
          <Database size={10} className="text-indigo-600 shrink-0" />
          <span className="truncate">{data.tables.join(' • ')}</span>
        </div>
      )}
    </div>
  </div>
);

// 4. Bizagi Exclusive Gateway (Decision Diamond with inner X)
const BizagiGatewayNode = ({ data, selected }: { data: any, selected?: boolean }) => (
  <div className="flex flex-col items-center cursor-pointer group">
    <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-amber-500 border-2 border-white" />
    <Handle type="source" position={Position.Bottom} id="yes" className="w-2.5 h-2.5 bg-emerald-500 border-2 border-white" />
    <Handle type="source" position={Position.Right} id="no" className="w-2.5 h-2.5 bg-rose-500 border-2 border-white" />

    {/* Diamond Container */}
    <div className={`w-14 h-14 bg-amber-100 border-3 border-amber-500 rotate-45 shadow-md flex items-center justify-center transition-all ${
      selected ? 'ring-4 ring-amber-300 scale-105' : 'group-hover:scale-105'
    }`}>
      <span className="text-amber-800 font-black text-sm -rotate-45">✕</span>
    </div>

    {/* Decision Question Label */}
    <div className="mt-2 text-center max-w-[150px] bg-white px-2 py-1 rounded-xl border border-amber-300 shadow-2xs">
      <span className="text-[9px] font-black uppercase text-amber-950 block leading-tight">
        {data.title || '¿Punto de Control?'}
      </span>
      <span className="text-[7.5px] font-mono text-amber-800 block mt-0.5">
        {data.jdeProgram}
      </span>
    </div>
  </div>
);

// 5. Bizagi Document Data Object
const BizagiDocNode = ({ data, selected }: { data: any, selected?: boolean }) => (
  <div className={`w-52 bg-white rounded-xl border-2 p-3 text-left shadow-sm cursor-pointer transition-all ${
    selected ? 'border-purple-600 ring-4 ring-purple-200 scale-102' : 'border-purple-300 hover:border-purple-600'
  }`}>
    <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-purple-600 border-2 border-white" />
    <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-purple-600 border-2 border-white" />
    
    <div className="flex items-center gap-1.5 text-purple-700 mb-1">
      <FileText size={14} className="shrink-0" />
      <span className="text-[8px] font-black uppercase tracking-wider font-mono">DOCUMENTO FISCAL</span>
    </div>
    <h4 className="text-xs font-black text-slate-800 uppercase leading-snug">
      {data.title}
    </h4>
    <p className="text-[9px] text-slate-500 leading-tight mt-0.5">
      {data.description}
    </p>
    <div className="mt-2 text-[8px] font-mono text-purple-900 bg-purple-50 p-1 rounded border border-purple-200 truncate">
      {data.tables?.join(' • ') || data.jdeProgram}
    </div>
  </div>
);

// -------------------------------------------------------------
// NODE TYPES REGISTRY
// -------------------------------------------------------------
const nodeTypes = {
  bizagiStart: BizagiStartNode,
  bizagiEnd: BizagiEndNode,
  bizagiTask: BizagiTaskNode,
  bizagiGateway: BizagiGatewayNode,
  bizagiDoc: BizagiDocNode
};

// -------------------------------------------------------------
// FLOWCHART DATASETS (100% BIZAGI & VISIO COMPLIANT)
// -------------------------------------------------------------

const FLOWCHARTS_DATA: Record<FlowchartId, { nodes: Node[], edges: Edge[], title: string, code: string, steps: StepDetail[] }> = {
  OT_RECEPCION: {
    title: 'Ciclo Integral ERP de Órdenes de Trabajo & Recepción Técnica F4312',
    code: 'P48201 / P4312',
    steps: [
      {
        id: 'step_1',
        stepNumber: 1,
        title: 'Detección & Solicitud de Mantención',
        jdeProgram: 'P18500 (Portal Residente)',
        role: 'ARRENDATARIO / OPERACIONES',
        roleColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        description: 'Ingreso inicial del requerimiento indicando unidad inmobiliaria, especialidad requerida y fotos de la avería.',
        tables: ['F1850 (Solicitudes)', 'F1501 (Propiedades)'],
        controls: ['Contrato de arriendo vigente verificado', 'Categorización obligatoria (Gasfitería, Techumbres, etc.)']
      },
      {
        id: 'step_2',
        stepNumber: 2,
        title: 'Confección de Orden de Trabajo (OT)',
        jdeProgram: 'P48201 (Work Order Entry)',
        role: 'EJECUTIVO DE OPERACIONES',
        roleColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        description: 'Generación formal de la OT en estado BORRADOR (100). Asignación del contratista homologado y desglose de ítems cotizados.',
        tables: ['F4801 (Cabecera OT)', 'F4311 (Detalle de Pedido)', 'F04012 (Maestro Proveedores)'],
        controls: ['Preservación estricta de category, specialty y associatedInvoice', 'Validación de RUT proveedor activo']
      },
      {
        id: 'step_3',
        stepNumber: 3,
        title: 'Punto de Control: ¿Monto > $1.000.000?',
        jdeProgram: 'P43008 (Approval Matrix)',
        role: 'CONTROL INTERNO / JEFATURA',
        roleColor: 'bg-amber-100 text-amber-800 border-amber-300',
        description: 'Evaluación jerárquica obligatoria. Si supera el umbral, se detiene en PENDIENTE_VB (230) requiriendo firma de Jefatura.',
        tables: ['F43008 (Jerarquías)', 'F950000 (Bitácora de Auditoría)'],
        controls: ['Firma digital con timestamp inmutable', 'Check de disponibilidad presupuestaria']
      },
      {
        id: 'step_4',
        stepNumber: 4,
        title: 'Emisión de Orden a Compras (R43500)',
        jdeProgram: 'R43500 (Purchase Order Print)',
        role: 'DEPARTAMENTO DE COMPRAS',
        roleColor: 'bg-sky-100 text-sky-800 border-sky-300',
        description: 'Generación del documento formal de compra y cambio de estado a EMITIDA (280). Despacho digital al contratista.',
        tables: ['F4311 (Líneas Estado = 280)', 'F4310 (Órdenes de Compra)'],
        controls: ['Generación de voucher oficial en PDF', 'SLA estimado de entrega fijado']
      },
      {
        id: 'step_5',
        stepNumber: 5,
        title: 'Recepción Técnica en Terreno (F4312)',
        jdeProgram: 'P4312 / W4312A',
        role: 'INSPECTOR TÉCNICO / JEFATURA',
        roleColor: 'bg-purple-100 text-purple-800 border-purple-300',
        description: 'Cotejo físico en terreno, carga de acta de conformidad, fotos de término y avance automático a RECEPCIONADA (400).',
        tables: ['F4312 (Histórico Recepciones)', 'F43121 (Matriz para Cuentas por Pagar)'],
        controls: ['Bloqueo de recepción sin respaldo fotográfico', 'Menú contextual ERP F4 / Shift+F10 habilitado']
      },
      {
        id: 'step_6',
        stepNumber: 6,
        title: '3-Way Match & Pago (Cuentas por Pagar)',
        jdeProgram: 'P0411 (Voucher Match)',
        role: 'FINANZAS / CONTABILIDAD',
        roleColor: 'bg-teal-100 text-teal-800 border-teal-300',
        description: 'Cruce automático de Orden de Compra (F4311) vs Recepción Conforme (F4312) vs Factura Electrónica DTE 33 para pago.',
        tables: ['F0411 (Cuentas por Pagar)', 'F0911 (Mayor General Contable)'],
        controls: ['Tolerancia de precio/monto 0%', 'Validación de factura en SII']
      }
    ],
    nodes: [
      { id: '1', type: 'bizagiStart', position: { x: 280, y: 30 }, data: { label: 'Inicio Requerimiento' } },
      { id: '2', type: 'bizagiTask', position: { x: 200, y: 130 }, data: { stepNumber: 1, title: 'Detección & Solicitud', jdeProgram: 'P18500', role: 'ARRENDATARIO', roleColor: 'bg-indigo-100 text-indigo-800', description: 'Registro de la avería técnica en portal residente', tables: ['F1850', 'F1501'] } },
      { id: '3', type: 'bizagiTask', position: { x: 200, y: 280 }, data: { stepNumber: 2, title: 'Confección de OT', jdeProgram: 'P48201', role: 'OPERACIONES', roleColor: 'bg-emerald-100 text-emerald-800', description: 'Emisión con Especialidad, Categoría y Contratista', tables: ['F4801', 'F4311', 'F04012'] } },
      { id: '4', type: 'bizagiGateway', position: { x: 270, y: 440 }, data: { title: '¿Monto > $1M?', jdeProgram: 'P43008' } },
      { id: '5', type: 'bizagiTask', position: { x: 50, y: 550 }, data: { stepNumber: 3, title: 'VoBo Jefatura (230)', jdeProgram: 'P0001', role: 'JEFATURA TÉCNICA', roleColor: 'bg-amber-100 text-amber-800', description: 'Revisión y autorización digital de gasto alto', tables: ['F43008', 'F950000'] } },
      { id: '6', type: 'bizagiTask', position: { x: 380, y: 550 }, data: { stepNumber: 4, title: 'Emisión Compras (280)', jdeProgram: 'R43500', role: 'COMPRAS', roleColor: 'bg-sky-100 text-sky-800', description: 'Publicación formal y despacho al contratista', tables: ['F4311', 'F4310'] } },
      { id: '7', type: 'bizagiDoc', position: { x: 220, y: 700 }, data: { stepNumber: 5, title: 'Recepción Técnica F4312', jdeProgram: 'P4312', description: 'Inspección en terreno, fotos y acta conforme (400)', tables: ['F4312', 'F43121'] } },
      { id: '8', type: 'bizagiTask', position: { x: 200, y: 840 }, data: { stepNumber: 6, title: '3-Way Match & Pago', jdeProgram: 'P0411', role: 'FINANZAS', roleColor: 'bg-teal-100 text-teal-800', description: 'Cruce de Factura DTE vs Recepción F4312', tables: ['F0411', 'F0911'] } },
      { id: '9', type: 'bizagiEnd', position: { x: 280, y: 1000 }, data: { label: 'OT Cerrada & Pagada' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e4-5', source: '4', sourceHandle: 'yes', target: '5', type: 'smoothstep', label: 'SÍ (Mayor $1M)', markerEnd: { type: MarkerType.ArrowClosed }, animated: true, style: { stroke: '#d97706' } },
      { id: 'e4-6', source: '4', sourceHandle: 'no', target: '6', type: 'smoothstep', label: 'NO (Gasto Normal)', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#0284c7' } },
      { id: 'e5-6', source: '5', target: '6', type: 'smoothstep', label: 'V°B° Otorgado', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#059669' } },
      { id: 'e6-7', source: '6', target: '7', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e7-8', source: '7', target: '8', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e8-9', source: '8', target: '9', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }
    ]
  },

  ARRIENDO_GARANTIA: {
    title: 'Ciclo de Gestión de Arriendos, Contratos en UF & Liquidación de Garantías',
    code: 'P1501 / P1540',
    steps: [
      {
        id: 'arr_1',
        stepNumber: 1,
        title: 'Catastro de Unidad & Ficha Dominio',
        jdeProgram: 'P1501 / P1505',
        role: 'GESTIÓN INMOBILIARIA',
        roleColor: 'bg-blue-100 text-blue-800',
        description: 'Alta de propiedad, fijación de avalúo fiscal SII y canon mensual en UF.',
        tables: ['F1501 (Propiedades)', 'F1505 (Certificados CBR)'],
        controls: ['Comprobación de no gravamen hipotecario impeditivo']
      },
      {
        id: 'arr_2',
        stepNumber: 2,
        title: 'Scoring & Evaluación de Postulante',
        jdeProgram: 'P15013 (Scoring)',
        role: 'EJECUTIVO COMERCIAL',
        roleColor: 'bg-emerald-100 text-emerald-800',
        description: 'Ratio de renta mínima 3x canon, verificación DICOM y garante solidario.',
        tables: ['F15013 (Postulantes)', 'F1501HA (Historial de Pagos)'],
        controls: ['Riesgo comercial clasificado']
      },
      {
        id: 'arr_3',
        stepNumber: 3,
        title: 'Firma Contrato & Custodia Garantía',
        jdeProgram: 'P15012 / P1540',
        role: 'LEGAL & NOTARÍA',
        roleColor: 'bg-amber-100 text-amber-800',
        description: 'Contrato notariado en UF y depósito de garantía en cuenta de custodia.',
        tables: ['F15012 (Contratos)', 'F1540 (Garantías)'],
        controls: ['Depósito bancario verificado', 'Acta de entrega inicial P1501RV']
      },
      {
        id: 'arr_4',
        stepNumber: 4,
        title: 'Recaudación & DTE DL 825 Art. 8g',
        jdeProgram: 'P4210DTE / P03B11',
        role: 'FACTURACIÓN',
        roleColor: 'bg-purple-100 text-purple-800',
        description: 'Facturación exenta de IVA mensual y conciliación de cartola bancaria.',
        tables: ['F03B11 (Cuentas por Cobrar)', 'F09131 (Conciliación)'],
        controls: ['Cálculo de UF al día de vencimiento']
      },
      {
        id: 'arr_5',
        stepNumber: 5,
        title: 'Finiquito & Liquidación de Garantía',
        jdeProgram: 'P1501RV / P1540',
        role: 'JEFATURA & LEGAL',
        roleColor: 'bg-teal-100 text-teal-800',
        description: 'Deducciones por OTs de pintura/daños y restitución del saldo remanente.',
        tables: ['F1540 (Liquidación Fianza)', 'F0411 (Devolución)'],
        controls: ['Plazo máximo legal de restitución: 45 días corridos']
      }
    ],
    nodes: [
      { id: '1', type: 'bizagiStart', position: { x: 260, y: 30 }, data: { label: 'Inmueble Disponible' } },
      { id: '2', type: 'bizagiTask', position: { x: 180, y: 130 }, data: { stepNumber: 1, title: 'Catastro & Dominio', jdeProgram: 'P1501 / P1505', role: 'INMOBILIARIA', roleColor: 'bg-blue-100 text-blue-800', description: 'Registro catastral y canon en UF', tables: ['F1501', 'F1505'] } },
      { id: '3', type: 'bizagiTask', position: { x: 180, y: 280 }, data: { stepNumber: 2, title: 'Scoring Postulante', jdeProgram: 'P15013', role: 'COMERCIAL', roleColor: 'bg-emerald-100 text-emerald-800', description: 'Evaluación crediticia y DICOM', tables: ['F15013'] } },
      { id: '4', type: 'bizagiDoc', position: { x: 200, y: 430 }, data: { stepNumber: 3, title: 'Contrato en UF & Fianza', jdeProgram: 'P15012 / P1540', description: 'Custodia bancaria de garantía de arriendo', tables: ['F15012', 'F1540'] } },
      { id: '5', type: 'bizagiTask', position: { x: 180, y: 580 }, data: { stepNumber: 4, title: 'Facturación DTE DL 825', jdeProgram: 'P4210DTE', role: 'FACTURACIÓN', roleColor: 'bg-purple-100 text-purple-800', description: 'Cobranza mensual y exención tributaria', tables: ['F03B11', 'F09131'] } },
      { id: '6', type: 'bizagiTask', position: { x: 180, y: 730 }, data: { stepNumber: 5, title: 'Finiquito & Devolución', jdeProgram: 'P1540', role: 'LEGAL / JEFATURA', roleColor: 'bg-teal-100 text-teal-800', description: 'Deducciones por OTs y entrega de saldo', tables: ['F1540', 'F0411'] } },
      { id: '7', type: 'bizagiEnd', position: { x: 260, y: 880 }, data: { label: 'Ciclo Finiquitado' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e4-5', source: '4', target: '5', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e5-6', source: '5', target: '6', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e6-7', source: '6', target: '7', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }
    ]
  },

  PROVEEDORES_UAF: {
    title: 'Debida Diligencia, Prevención UAF Ley 19.913 & Aprobación de Proveedores',
    code: 'P04012 / P0115U',
    steps: [
      {
        id: 'prv_1',
        stepNumber: 1,
        title: 'Solicitud Alta DI-01',
        jdeProgram: 'P04012',
        role: 'PROCURING',
        roleColor: 'bg-indigo-100 text-indigo-800',
        description: 'Ingreso de datos de la empresa prestadora y datos bancarios.',
        tables: ['F04012 (Proveedores)', 'F0101 (Address Book)'],
        controls: ['RUT verificado en padrón nacional']
      },
      {
        id: 'prv_2',
        stepNumber: 2,
        title: 'Scoring KYC & Listas Negras',
        jdeProgram: 'P01012A / B',
        role: 'COMPLIANCE',
        roleColor: 'bg-amber-100 text-amber-800',
        description: 'Cotejo contra listas restrictivas CMF, quiebras y deudores SII.',
        tables: ['F01012A (Compliance)', 'F01012B (Restricciones)'],
        controls: ['Semáforo de riesgo automático']
      },
      {
        id: 'prv_3',
        stepNumber: 3,
        title: 'Declaración UAF Ley 19.913 (PEP)',
        jdeProgram: 'P0115U',
        role: 'LEGAL',
        roleColor: 'bg-rose-100 text-rose-800',
        description: 'Declaración jurada de Personas Expuestas Políticamente y Beneficiarios.',
        tables: ['F0115U (UAF)'],
        controls: ['Comprobación de no parentesco con directores']
      },
      {
        id: 'prv_4',
        stepNumber: 4,
        title: 'V°B° Jefatura & Estado ACTIVE',
        jdeProgram: 'P0001 (Centro Tareas)',
        role: 'JEFATURA OPERACIONES',
        roleColor: 'bg-emerald-100 text-emerald-800',
        description: 'Habilitación definitiva para recibir adjudicación de OTs.',
        tables: ['F04012 (Status = ACTIVE)', 'F950000 (Auditoría)'],
        controls: ['Firma digital con registro IP y timestamp']
      }
    ],
    nodes: [
      { id: '1', type: 'bizagiStart', position: { x: 260, y: 30 }, data: { label: 'Postulación Contratista' } },
      { id: '2', type: 'bizagiTask', position: { x: 180, y: 130 }, data: { stepNumber: 1, title: 'Alta Proveedor DI-01', jdeProgram: 'P04012', role: 'PROCURING', roleColor: 'bg-indigo-100 text-indigo-800', description: 'Registro de datos comerciales y bancarios', tables: ['F04012', 'F0101'] } },
      { id: '3', type: 'bizagiTask', position: { x: 180, y: 280 }, data: { stepNumber: 2, title: 'Debida Diligencia KYC', jdeProgram: 'P01012A', role: 'COMPLIANCE', roleColor: 'bg-amber-100 text-amber-800', description: 'Barrido contra listas CMF y quiebras', tables: ['F01012A', 'F01012B'] } },
      { id: '4', type: 'bizagiDoc', position: { x: 200, y: 430 }, data: { stepNumber: 3, title: 'Declaración UAF PEP', jdeProgram: 'P0115U', description: 'Declaración jurada Ley 19.913 y beneficiarios', tables: ['F0115U'] } },
      { id: '5', type: 'bizagiTask', position: { x: 180, y: 580 }, data: { stepNumber: 4, title: 'VoBo & Estado ACTIVE', jdeProgram: 'P0001', role: 'JEFATURA', roleColor: 'bg-emerald-100 text-emerald-800', description: 'Autorización final en Centro de Tareas', tables: ['F04012', 'F950000'] } },
      { id: '6', type: 'bizagiEnd', position: { x: 260, y: 730 }, data: { label: 'Proveedor Homologado' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e4-5', source: '4', target: '5', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e5-6', source: '5', target: '6', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }
    ]
  },

  SEGURIDAD_RBAC: {
    title: 'Arquitectura de Seguridad RBAC Zero-Trust & Aislamiento Laboral',
    code: 'P98OWSEC / P09OWJOB',
    steps: [
      {
        id: 'sec_1',
        stepNumber: 1,
        title: 'Autenticación & Identificación (IAM)',
        jdeProgram: 'P98OWSEC',
        role: 'USUARIOS',
        roleColor: 'bg-slate-100 text-slate-800',
        description: 'Acceso por credenciales cifradas con validación forense ISO 27001.',
        tables: ['F98OWSEC', 'F950000'],
        controls: ['Registro de IP y navegador en bitácora inmutable']
      },
      {
        id: 'sec_2',
        stepNumber: 2,
        title: 'Enrutamiento por Matriz de 5 Roles',
        jdeProgram: 'P980011',
        role: 'MOTOR RBAC',
        roleColor: 'bg-indigo-100 text-indigo-800',
        description: 'Validación de privilegios: Admin, Jefe, Ejecutivo, Empleo, Arrendatario.',
        tables: ['F980011 (Permisos)'],
        controls: ['Denegación por defecto (Zero-Trust)']
      },
      {
        id: 'sec_3',
        stepNumber: 3,
        title: 'Aislamiento Estricto: SOLO_EMPLEO',
        jdeProgram: 'P09OWJOB',
        role: 'CANDIDATO',
        roleColor: 'bg-amber-100 text-amber-800',
        description: 'Confinamiento al buscador de empleo, match de CV y cartas de presentación.',
        tables: ['Sin acceso a BD Corporativa'],
        controls: ['Bloqueo perimetral de finanzas, propiedades y contratos']
      },
      {
        id: 'sec_4',
        stepNumber: 4,
        title: 'Auditoría CISO & Ley 21.459',
        jdeProgram: 'R09OWSEC',
        role: 'CISO / AUDITOR',
        roleColor: 'bg-emerald-100 text-emerald-800',
        description: 'Monitoreo de trazabilidad y generación de informe ejecutivo CISO.',
        tables: ['F950000 (Auditoría Forense)'],
        controls: ['Detección de accesos no autorizados']
      }
    ],
    nodes: [
      { id: '1', type: 'bizagiStart', position: { x: 260, y: 30 }, data: { label: 'Intento de Acceso' } },
      { id: '2', type: 'bizagiTask', position: { x: 180, y: 130 }, data: { stepNumber: 1, title: 'Autenticación IAM', jdeProgram: 'P98OWSEC', role: 'USUARIOS', roleColor: 'bg-slate-100 text-slate-800', description: 'Validación de credencial y marca forense', tables: ['F98OWSEC'] } },
      { id: '3', type: 'bizagiGateway', position: { x: 250, y: 280 }, data: { title: '¿Rol = SOLO_EMPLEO?', jdeProgram: 'P980011' } },
      { id: '4', type: 'bizagiTask', position: { x: 40, y: 400 }, data: { stepNumber: 3, title: 'Aislamiento P09OWJOB', jdeProgram: 'P09OWJOB', role: 'CANDIDATO', roleColor: 'bg-amber-100 text-amber-800', description: 'Sandbox exclusivo de empleo sin datos ERP', tables: ['Aislado'] } },
      { id: '5', type: 'bizagiTask', position: { x: 340, y: 400 }, data: { stepNumber: 2, title: 'Acceso AssetFlow Enterprise', jdeProgram: 'P0000 / P0001', role: 'ADMIN / JEFE / OPERACIONES', roleColor: 'bg-indigo-100 text-indigo-800', description: 'Módulos autorizados según matriz RBAC', tables: ['F980011'] } },
      { id: '6', type: 'bizagiTask', position: { x: 180, y: 550 }, data: { stepNumber: 4, title: 'Auditoría Forense CISO', jdeProgram: 'R09OWSEC', role: 'CONTROL INTERNO', roleColor: 'bg-emerald-100 text-emerald-800', description: 'Registro inmutable según ISO 27001', tables: ['F950000'] } },
      { id: '7', type: 'bizagiEnd', position: { x: 260, y: 700 }, data: { label: 'Sesión Segura Activa' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3-4', source: '3', sourceHandle: 'yes', target: '4', type: 'smoothstep', label: 'SÍ (Postulante)', markerEnd: { type: MarkerType.ArrowClosed }, animated: true, style: { stroke: '#d97706' } },
      { id: 'e3-5', source: '3', sourceHandle: 'no', target: '5', type: 'smoothstep', label: 'NO (Personal)', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#0284c7' } },
      { id: 'e4-6', source: '4', target: '6', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e5-6', source: '5', target: '6', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e6-7', source: '6', target: '7', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }
    ]
  },

  INGESTA_FINANZAS: {
    title: 'Ingesta Masiva de Activos & Cierre Contable Financiero',
    code: 'R15011Z1I / F0911',
    steps: [
      {
        id: 'fin_1',
        stepNumber: 1,
        title: 'Ingesta de Planillas Excel Masivas',
        jdeProgram: 'R15011Z1I',
        role: 'FINANZAS',
        roleColor: 'bg-emerald-100 text-emerald-800',
        description: 'Carga masiva con homologación automática de columnas hacia tablas Z.',
        tables: ['F15011Z1 (Interface Ingesta)'],
        controls: ['Validación RUT algoritmo Módulo 11']
      },
      {
        id: 'fin_2',
        stepNumber: 2,
        title: 'Asientos de Diario & Mayor General',
        jdeProgram: 'P0911',
        role: 'CONTABILIDAD',
        roleColor: 'bg-blue-100 text-blue-800',
        description: 'Contabilización de cánones, gastos y provisiones en catálogo P0901.',
        tables: ['F0911 (Asientos)', 'F0902 (Saldos)'],
        controls: ['Cuadre estricto Débitos = Créditos']
      },
      {
        id: 'fin_3',
        stepNumber: 3,
        title: 'Declaraciones Tributarias F29 / F22',
        jdeProgram: 'P029F22',
        role: 'TRIBUTARIO',
        roleColor: 'bg-purple-100 text-purple-800',
        description: 'Cálculo de PPM, retenciones, IVA y balance para Operación Renta.',
        tables: ['F0912AUX (Libros Auxiliares)'],
        controls: ['Cotejo con libro electrónico del SII']
      },
      {
        id: 'fin_4',
        stepNumber: 4,
        title: 'Auditoría Forense Matemática Benford',
        jdeProgram: 'P09BEN',
        role: 'AUDITOR LEY 21.459',
        roleColor: 'bg-rose-100 text-rose-800',
        description: 'Detección temprana de fraudes o fraccionamiento de pagos.',
        tables: ['F09BEN (Métricas Estadísticas)'],
        controls: ['Alerta en rojo si Chi-Cuadrado excede 5%']
      }
    ],
    nodes: [
      { id: '1', type: 'bizagiStart', position: { x: 260, y: 30 }, data: { label: 'Planilla Excel Recibida' } },
      { id: '2', type: 'bizagiTask', position: { x: 180, y: 130 }, data: { stepNumber: 1, title: 'Ingesta R15011Z1I', jdeProgram: 'R15011Z1I', role: 'FINANZAS', roleColor: 'bg-emerald-100 text-emerald-800', description: 'Carga y homologación automática', tables: ['F15011Z1'] } },
      { id: '3', type: 'bizagiTask', position: { x: 180, y: 280 }, data: { stepNumber: 2, title: 'Mayor General F0911', jdeProgram: 'P0911', role: 'CONTABILIDAD', roleColor: 'bg-blue-100 text-blue-800', description: 'Asientos contables y balance cuadrado', tables: ['F0911', 'F0902'] } },
      { id: '4', type: 'bizagiDoc', position: { x: 200, y: 430 }, data: { stepNumber: 3, title: 'Declaración F29 / F22', jdeProgram: 'P029F22', description: 'Cumplimiento tributario mensual y anual', tables: ['F0912AUX'] } },
      { id: '5', type: 'bizagiTask', position: { x: 180, y: 580 }, data: { stepNumber: 4, title: 'Auditoría Benford', jdeProgram: 'P09BEN', role: 'AUDITORÍA', roleColor: 'bg-rose-100 text-rose-800', description: 'Análisis matemático forense de egresos', tables: ['F09BEN'] } },
      { id: '6', type: 'bizagiEnd', position: { x: 260, y: 730 }, data: { label: 'Cierre Financiero Certificado' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e4-5', source: '4', target: '5', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e5-6', source: '5', target: '6', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }
    ]
  },
  EMPLEO_MATCH_CV: {
    title: 'Flujo Integral de Búsqueda de Empleo, Match CV con IA & Postulación Directa',
    code: 'P09OWJOB / P09CV',
    steps: [
      {
        id: 'step_1',
        stepNumber: 1,
        title: 'Carga & Parseo de CV en PDF',
        jdeProgram: 'P09CV (CV Document Parser)',
        role: 'CANDIDATO / POSTULANTE',
        roleColor: 'bg-amber-100 text-amber-800 border-amber-300',
        description: 'Ingesta del currículum vitae en formato PDF. Extracción automática de competencias, pretensión salarial y perfil profesional.',
        tables: ['F09CVDOC (Documento CV)', 'F09SKILLS (Habilidades Extraídas)'],
        controls: ['Formato 1 página ejecutivo ATS verificado', 'Indexación de competencias duras y blandas']
      },
      {
        id: 'step_2',
        stepNumber: 2,
        title: 'Búsqueda & Rastreo de Ofertas Diarias',
        jdeProgram: 'P09OWJOB (Google Search Grounding)',
        role: 'MOTOR IA / RASTREADOR',
        roleColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        description: 'Búsqueda activa y automatizada en portales de empleo de Chile (Get on Board, LinkedIn, Trabajando, ChileTrabajos, Laborum) y páginas corporativas oficiales "Trabaja con Nosotros".',
        tables: ['F09JOBD (Vacantes Indexadas)', 'F09COMP (Directorio Empresas)'],
        controls: ['Verificación de enlaces activos (Status 200 OK)', 'Filtro inclusivo y modalidad (Remoto/Híbrido)']
      },
      {
        id: 'step_3',
        stepNumber: 3,
        title: 'Punto de Decisión: ¿Match de Competencias ≥ 75%?',
        jdeProgram: 'P09SCORE (Algoritmo de Compatibilidad)',
        role: 'SISTEMA COGNITIVO',
        roleColor: 'bg-blue-100 text-blue-800 border-blue-300',
        description: 'Cálculo de coincidencia porcentual entre el perfil profesional y los requisitos de cada convocatoria.',
        tables: ['F09MATCH (Puntaje de Afinidad)'],
        controls: ['Ponderación de cargo, seniority, herramientas y pretensión salarial']
      },
      {
        id: 'step_4',
        stepNumber: 4,
        title: 'Generación de Carta Ejecutiva & Kit de Postulación',
        jdeProgram: 'P09LETTER (Document Generator)',
        role: 'ASISTENTE DE POSTULACIÓN',
        roleColor: 'bg-purple-100 text-purple-800 border-purple-300',
        description: 'Creación de carta de presentación en Word/PDF adaptada específicamente al perfil de la vacante, junto a ficha de postulación en portapapeles.',
        tables: ['F09DOCS (Archivos Generados)'],
        controls: ['Estructura formal según norma ejecutiva', 'Datos de contacto y match incluidos']
      },
      {
        id: 'step_5',
        stepNumber: 5,
        title: 'Postulación en Canal Oficial & Bitácora de Seguimiento',
        jdeProgram: 'P09TRACK (Pipeline de Entrevistas)',
        role: 'CANDIDATO',
        roleColor: 'bg-teal-100 text-teal-800 border-teal-300',
        description: 'Envío de antecedentes en el portal o ATS de la empresa y registro de estado (Postulado, En Revisión, Entrevista).',
        tables: ['F09STATUS (Seguimiento de Postulaciones)'],
        controls: ['Trazabilidad de fecha de postulación y notas de entrevista']
      }
    ],
    nodes: [
      { id: '1', type: 'bizagiStart', position: { x: 260, y: 30 }, data: { label: 'Inicio Búsqueda Laboral' } },
      { id: '2', type: 'bizagiTask', position: { x: 180, y: 130 }, data: { stepNumber: 1, title: 'Parseo de CV PDF', jdeProgram: 'P09CV', role: 'CANDIDATO', roleColor: 'bg-amber-100 text-amber-800', description: 'Extracción de competencias y perfil', tables: ['F09CVDOC', 'F09SKILLS'] } },
      { id: '3', type: 'bizagiTask', position: { x: 180, y: 280 }, data: { stepNumber: 2, title: 'Rastreo de Vacantes', jdeProgram: 'P09OWJOB', role: 'MOTOR IA', roleColor: 'bg-emerald-100 text-emerald-800', description: 'Búsqueda en portales y canales oficiales', tables: ['F09JOBD', 'F09COMP'] } },
      { id: '4', type: 'bizagiGateway', position: { x: 250, y: 430 }, data: { title: '¿Match ≥ 75%?', jdeProgram: 'P09SCORE' } },
      { id: '5', type: 'bizagiDoc', position: { x: 40, y: 560 }, data: { stepNumber: 3, title: 'Carta & Kit Postulación', jdeProgram: 'P09LETTER', description: 'Generación de carta Word y ficha de postulación', tables: ['F09DOCS'] } },
      { id: '6', type: 'bizagiTask', position: { x: 340, y: 560 }, data: { stepNumber: 4, title: 'Oferta Guardada', jdeProgram: 'P09BOOKMARK', role: 'SEGUIMIENTO', roleColor: 'bg-slate-100 text-slate-700', description: 'Registro para postulación secundaria', tables: ['F09BOOK'] } },
      { id: '7', type: 'bizagiTask', position: { x: 180, y: 720 }, data: { stepNumber: 5, title: 'Postulación & Pipeline', jdeProgram: 'P09TRACK', role: 'CANDIDATO', roleColor: 'bg-teal-100 text-teal-800', description: 'Seguimiento de entrevistas y avances', tables: ['F09STATUS'] } },
      { id: '8', type: 'bizagiEnd', position: { x: 260, y: 870 }, data: { label: 'Postulación Registrada' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e4-5', source: '4', target: '5', sourceHandle: 'yes', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e4-6', source: '4', target: '6', sourceHandle: 'no', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e5-7', source: '5', target: '7', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e6-7', source: '6', target: '7', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e7-8', source: '7', target: '8', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }
    ]
  },
  OFICIOS_GESTION: {
    title: 'Gestión Integral de Oficios Normados, Providencias & Trazabilidad Notarial',
    code: 'P00DOC / F00DOC',
    steps: [
      {
        id: 'step_1',
        stepNumber: 1,
        title: 'Recepción / Emisión de Oficio Normado',
        jdeProgram: 'P00DOC (Oficios Center)',
        role: 'SECRETARÍA / JEFATURA',
        roleColor: 'bg-blue-100 text-blue-800 border-blue-300',
        description: 'Ingreso documental con número de oficio, fecha de recepción/despacho, entidad emisora o receptora (CMF, Notarías, Conservador, Tribunales, PDI).',
        tables: ['F00DOC (Cabecera Oficios)', 'F0101 (Directorio Entidades)'],
        controls: ['Validación de número correlativo inmutable', 'Categorización obligatoria por materia']
      },
      {
        id: 'step_2',
        stepNumber: 2,
        title: 'Digitalización & Resguardo en Bóveda F980011D',
        jdeProgram: 'F980011D (Digital Vault)',
        role: 'CONTROL DOCUMENTAL',
        roleColor: 'bg-purple-100 text-purple-800 border-purple-300',
        description: 'Carga de copia íntegra escaneada o archivo PDF con firma electrónica y generación de hash de integridad.',
        tables: ['F980011D (Bóveda Digital)', 'F00DOCATTACH (Anexos)'],
        controls: ['Hash SHA-256 de integridad documental', 'Almacenamiento en repositorio seguro']
      },
      {
        id: 'step_3',
        stepNumber: 3,
        title: 'Punto de Control: ¿Requiere Respuesta Formal?',
        jdeProgram: 'P00PLAZOS (Control de Plazos)',
        role: 'ASESORÍA JURÍDICA',
        roleColor: 'bg-amber-100 text-amber-800 border-amber-300',
        description: 'Determinación de obligatoriedad de descargo o plazo legal de contestación perentorio (ej: 5 días hábiles).',
        tables: ['F00ALERT (Alarmas de Plazos Legales)'],
        controls: ['Alerta en color ámbar/rojo en Centro de Tareas si restan < 48 horas']
      },
      {
        id: 'step_4',
        stepNumber: 4,
        title: 'Elaboración de Respuesta & Visación',
        jdeProgram: 'P00RESP (Oficio Saliente)',
        role: 'JEFATURA / ADMINISTRACIÓN',
        roleColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        description: 'Redacción del oficio de respuesta, incorporación de antecedentes de respaldo y firma autorizada.',
        tables: ['F00DOC (Actualización Estado RESPONDIDO)'],
        controls: ['Asociación bidireccional entre oficio de ingreso y oficio de salida']
      },
      {
        id: 'step_5',
        stepNumber: 5,
        title: 'Cierre de Expediente & Auditoría Histórica',
        jdeProgram: 'R00DOCAUD (Cierre Documental)',
        role: 'CONTROL INTERNO',
        roleColor: 'bg-teal-100 text-teal-800 border-teal-300',
        description: 'Verificación del cumplimiento de plazos y archivo inmutable con trazabilidad total para fiscalizaciones.',
        tables: ['F950000 (Bitácora de Auditoría)'],
        controls: ['Certificación de expediente cerrado sin observaciones pendientes']
      }
    ],
    nodes: [
      { id: '1', type: 'bizagiStart', position: { x: 260, y: 30 }, data: { label: 'Recepción / Emisión Oficio' } },
      { id: '2', type: 'bizagiTask', position: { x: 180, y: 130 }, data: { stepNumber: 1, title: 'Registro de Oficio', jdeProgram: 'P00DOC', role: 'SECRETARÍA', roleColor: 'bg-blue-100 text-blue-800', description: 'Ingreso correlativo y datos de emisor', tables: ['F00DOC', 'F0101'] } },
      { id: '3', type: 'bizagiDoc', position: { x: 200, y: 280 }, data: { stepNumber: 2, title: 'Digitalización en Bóveda', jdeProgram: 'F980011D', description: 'Resguardo de archivo digital con hash', tables: ['F980011D'] } },
      { id: '4', type: 'bizagiGateway', position: { x: 250, y: 430 }, data: { title: '¿Requiere Respuesta?', jdeProgram: 'P00PLAZOS' } },
      { id: '5', type: 'bizagiTask', position: { x: 40, y: 560 }, data: { stepNumber: 3, title: 'Oficio de Respuesta', jdeProgram: 'P00RESP', role: 'JEFATURA', roleColor: 'bg-emerald-100 text-emerald-800', description: 'Redacción y visación de oficio saliente', tables: ['F00DOC'] } },
      { id: '6', type: 'bizagiTask', position: { x: 340, y: 560 }, data: { stepNumber: 3, title: 'Toma de Conocimiento', jdeProgram: 'P00INFO', role: 'CONTROL', roleColor: 'bg-slate-100 text-slate-700', description: 'Archivo para conocimiento sin trámite', tables: ['F00DOC'] } },
      { id: '7', type: 'bizagiTask', position: { x: 180, y: 720 }, data: { stepNumber: 4, title: 'Cierre de Expediente', jdeProgram: 'R00DOCAUD', role: 'CONTROL INTERNO', roleColor: 'bg-teal-100 text-teal-800', description: 'Auditoría y trazabilidad histórica', tables: ['F950000'] } },
      { id: '8', type: 'bizagiEnd', position: { x: 260, y: 870 }, data: { label: 'Expediente Normativo Cerrado' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e4-5', source: '4', target: '5', sourceHandle: 'yes', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e4-6', source: '4', target: '6', sourceHandle: 'no', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e5-7', source: '5', target: '7', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e6-7', source: '6', target: '7', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e7-8', source: '7', target: '8', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }
    ]
  }
};

export const VisioFlowchartsModule: React.FC = () => {
  const [activeFlowchart, setActiveFlowchart] = useState<FlowchartId>('OT_RECEPCION');
  const [selectedStep, setSelectedStep] = useState<StepDetail | null>(null);

  const currentDataset = useMemo(() => FLOWCHARTS_DATA[activeFlowchart], [activeFlowchart]);

  const [nodes, setNodes, onNodesChange] = useNodesState(currentDataset.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(currentDataset.edges);

  // Sync state when switching flowchart tab
  React.useEffect(() => {
    setNodes(currentDataset.nodes);
    setEdges(currentDataset.edges);
    setSelectedStep(null);
  }, [activeFlowchart, currentDataset, setNodes, setEdges]);

  // Click on a node opens technical inspector
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const foundStep = currentDataset.steps.find(s => s.jdeProgram.includes(node.data.jdeProgram as string) || s.stepNumber === node.data.stepNumber);
    if (foundStep) {
      setSelectedStep(foundStep);
    } else {
      setSelectedStep({
        id: node.id,
        stepNumber: (node.data.stepNumber as number) || 0,
        title: (node.data.title as string) || (node.data.label as string) || 'Evento BPMN',
        jdeProgram: (node.data.jdeProgram as string) || 'AssetFlow Enterprise',
        role: (node.data.role as string) || 'OPERATIVO',
        roleColor: (node.data.roleColor as string) || 'bg-slate-100 text-slate-700',
        description: (node.data.description as string) || 'Paso documentado bajo estándar Bizagi / Visio BPMN 2.0.',
        tables: (node.data.tables as string[]) || [],
        controls: ['Control normativo ERP validado']
      });
    }
  }, [currentDataset]);

  // Download standard BPMN 2.0 XML file compatible with Bizagi Modeler
  const handleDownloadBPMN = () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_AssetFlow" targetNamespace="http://bpmn.io/schema/bpmn" exporter="AssetFlow Bizagi Studio" exporterVersion="9.11">
  <bpmn:process id="Process_${activeFlowchart}" name="${currentDataset.title}" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Inicio" />
    ${currentDataset.steps.map(s => `
    <bpmn:task id="Task_${s.id}" name="${s.title} (${s.jdeProgram})" />`).join('')}
    <bpmn:endEvent id="EndEvent_1" name="Fin" />
  </bpmn:process>
</bpmn:definitions>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Flujo_Bizagi_${activeFlowchart}_AssetFlow.bpmn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-full animate-in fade-in duration-300">
      
      {/* HEADER VISIO / BIZAGI STUDIO */}
      <div className="bg-[#0B3C5D] text-white p-4 sm:p-5 border-b-4 border-[#FFCC00] flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-inner">
            <GitFork size={22} className="text-[#FFCC00]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight uppercase">
                Bizagi Process Modeler & Visio Studio (BPMN 2.0)
              </h2>
              <span className="bg-[#FFCC00] text-[#0B3C5D] text-[8.5px] font-black px-2 py-0.5 rounded uppercase font-mono">
                Lienzo React Flow
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              Lienzo infinito interactivo con minimapa, cableado inteligente y compatibilidad directa con Bizagi Modeler.
            </p>
          </div>
        </div>

        {/* BOTONES DE EXPORTACIÓN */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            onClick={handleDownloadBPMN}
            className="px-3 py-1.5 bg-[#FFCC00] hover:bg-[#ffe066] text-[#0B3C5D] rounded-xl font-black text-[10.5px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Descargar archivo .bpmn estándar para abrir en Bizagi Process Modeler"
          >
            <Download size={14} />
            <span>Descargar para Bizagi (.bpmn)</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#0B3C5D] rounded-xl font-black text-[10.5px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* TABS DE PROCESOS (SELECTORES) */}
      <div className="bg-slate-100 px-4 sm:px-6 py-2 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
        {[
          { id: 'OT_RECEPCION', label: '1. Órdenes de Trabajo & Recepción F4312', code: 'P48201 / P4312' },
          { id: 'ARRIENDO_GARANTIA', label: '2. Arriendos & Fianza en UF', code: 'P1501 / P1540' },
          { id: 'PROVEEDORES_UAF', label: '3. Proveedores & Prevención UAF', code: 'P04012 / P0115U' },
          { id: 'SEGURIDAD_RBAC', label: '4. Seguridad Zero-Trust & Empleo', code: 'P98OWSEC / P09OWJOB' },
          { id: 'INGESTA_FINANZAS', label: '5. Ingesta Masiva & Cierre F0911', code: 'R15011Z1I / F0911' },
          { id: 'EMPLEO_MATCH_CV', label: '6. Búsqueda de Empleo & Match CV', code: 'P09OWJOB / P09CV' },
          { id: 'OFICIOS_GESTION', label: '7. Gestión Oficios & Providencias', code: 'P00DOC / F00DOC' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFlowchart(tab.id as FlowchartId)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeFlowchart === tab.id
                ? 'bg-[#0B3C5D] text-white shadow-sm ring-2 ring-[#0B3C5D]/20'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded ${
              activeFlowchart === tab.id ? 'bg-[#FFCC00] text-[#0B3C5D]' : 'bg-slate-100 text-slate-500'
            }`}>
              {tab.code}
            </span>
          </button>
        ))}
      </div>

      {/* ÁREA DEL LIENZO REACT FLOW + INSPECTOR BIZAGI LATERAL */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        
        {/* REACT FLOW INFINITE CANVAS */}
        <div className="flex-1 h-[550px] lg:h-full bg-slate-50 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            connectionLineType={ConnectionLineType.SmoothStep}
            minZoom={0.3}
            maxZoom={1.8}
            attributionPosition="bottom-left"
          >
            {/* Cuadrícula milimétrica estilo Visio / Bizagi */}
            <Background variant={BackgroundVariant.Dots} gap={16} size={1.5} color="#cbd5e1" />
            
            {/* Controles de Zoom y Pantalla Completa */}
            <Controls className="bg-white border border-slate-200 rounded-xl shadow-md p-1" />
            
            {/* Minimapa Bizagi en la esquina inferior */}
            <MiniMap 
              nodeColor={(node) => {
                if (node.type === 'bizagiStart') return '#10b981';
                if (node.type === 'bizagiEnd') return '#e11d48';
                if (node.type === 'bizagiGateway') return '#f59e0b';
                if (node.type === 'bizagiDoc') return '#9333ea';
                return '#0B3C5D';
              }}
              className="bg-white/90 border border-slate-200 rounded-2xl shadow-lg overflow-hidden m-4"
              zoomable
              pannable
            />

            {/* Panel de Ayuda Rápida */}
            <Panel position="top-right" className="bg-white/90 backdrop-blur-xs p-2 rounded-xl border border-slate-200 shadow-sm text-[9.5px] font-bold text-slate-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Lienzo Interactivo: Arrastre los nodos o haga clic para ver su ficha técnica</span>
            </Panel>
          </ReactFlow>
        </div>

        {/* PANEL INSPECTOR LATERAL BIZAGI */}
        <div className="w-full lg:w-96 p-5 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto shrink-0 shadow-lg">
          {selectedStep ? (
            <div className="space-y-4 animate-in fade-in duration-200 text-left">
              
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#0B3C5D] text-white text-xs font-black flex items-center justify-center">
                    {selectedStep.stepNumber || '•'}
                  </span>
                  <span className="text-[10px] font-black uppercase text-slate-400">
                    Ficha Técnica Bizagi BPMN
                  </span>
                </div>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${selectedStep.roleColor}`}>
                  {selectedStep.role}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  {selectedStep.title}
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                  {selectedStep.description}
                </p>
              </div>

              {/* PROGRAMA ERP ASOCIADO */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider block">
                  Aplicación AssetFlow Enterprise:
                </span>
                <span className="text-xs font-mono font-black text-[#0B3C5D] block">
                  {selectedStep.jdeProgram}
                </span>
                {selectedStep.keyShortcuts && (
                  <span className="text-[9.5px] text-slate-500 font-medium block pt-1">
                    Atajo de teclado: <strong className="text-slate-800">{selectedStep.keyShortcuts}</strong>
                  </span>
                )}
              </div>

              {/* TABLAS DE BASE DE DATOS */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Database size={13} className="text-indigo-600" />
                  <span>Tablas de Base de Datos Impactadas</span>
                </span>
                <div className="space-y-1">
                  {selectedStep.tables && selectedStep.tables.length > 0 ? (
                    selectedStep.tables.map((tbl, i) => (
                      <div key={i} className="text-xs font-mono bg-indigo-50/70 border border-indigo-150 text-indigo-950 p-2 rounded-lg font-bold">
                        {tbl}
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-slate-400 italic">No impacta tablas directamente</div>
                  )}
                </div>
              </div>

              {/* PUNTOS DE CONTROL & CUMPLIMIENTO */}
              {selectedStep.controls && selectedStep.controls.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-emerald-600" />
                    <span>Controles Normativos & Compliance</span>
                  </span>
                  <ul className="space-y-1">
                    {selectedStep.controls.map((ctrl, i) => (
                      <li key={i} className="text-[11px] text-slate-700 font-medium flex items-start gap-1.5 leading-snug">
                        <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>{ctrl}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* BOTÓN DE DESCARGA BPMN RÁPIDO */}
              <div className="pt-2">
                <button
                  onClick={handleDownloadBPMN}
                  className="w-full py-2 bg-slate-100 hover:bg-[#0B3C5D] text-slate-700 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download size={13} />
                  <span>Exportar este flujo a Bizagi (.bpmn)</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shadow-inner">
                <GitFork size={24} />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Inspector Bizagi BPMN Activo
              </p>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Haga clic en cualquiera de los nodos del lienzo React Flow para visualizar sus programas ERP, tablas y puntos de control.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default VisioFlowchartsModule;
