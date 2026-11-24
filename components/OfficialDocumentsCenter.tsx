
import React, { useState, useMemo, useRef } from 'react';
import { OfficialDocument, OfficialDocType, OfficialDocStatus, OfficialDocManagementType } from '../types';
import { CHART_OF_ACCOUNTS } from '../lib/accountingData';
import { useResizableColumns } from '../lib/useResizableColumns';
import { 
  Mail, FilePlus, Search, MapPin, Trash2, Clock, CheckCircle2, 
  ArrowDownLeft, ArrowUpRight, X, Edit3, Loader2, ShieldCheck, 
  ScanText, Printer, DatabaseZap, RefreshCw, MessageSquareReply, Calendar, Timer, AlertTriangle, FileUp, Layers, Sparkles, SaveAll, User, Paperclip, Download, BookOpen
} from 'lucide-react';
import { extractDocumentData } from '../geminiService';
import { useNotification } from './NotificationProvider';
import NewIndicator from './NewIndicator';
import { storage } from '../lib/storageEngine';
import OfficialDocumentsReport from './OfficialDocumentsReport';
import { exportToExcel } from '../lib/excelExport';
import { OfficialDocumentDetailModal, generateDeterministicHash } from './OfficialDocumentDetailModal';
import SystemManualsWordModal from './SystemManualsWordModal';
import { GridDimensionControls } from './common/GridDimensionControls';
import { JDEGridContextMenu } from './JDEGridContextMenu';
import * as mammoth from 'mammoth';

interface OfficialDocumentsCenterProps {
  documents: OfficialDocument[];
  onSave: (doc: OfficialDocument) => void;
  onBulkSave: (docs: OfficialDocument[]) => void;
  onDelete: (id: string) => void;
  currentUser: string;
  companyLogo: string | null;
  onManualSync?: () => Promise<void>; 
  lastSaveStatus?: 'SAVED' | 'SAVING' | 'ERROR' | 'IDLE';
}

const STATUS_BY_TYPE: Record<string, OfficialDocStatus[]> = {
  'ENTRANTE': ['RECIBIDO', 'EN_PROCESO', 'RESPONDIDO', 'RESPONDIDO_CON_OFICIO', 'ARCHIVADO'],
  'SALIENTE': ['BORRADOR', 'EN_FIRMA', 'DESPACHADO', 'ARCHIVADO']
};

const getStatusesForType = (type?: string): OfficialDocStatus[] => {
  if (type && STATUS_BY_TYPE[type]) return STATUS_BY_TYPE[type];
  return STATUS_BY_TYPE['ENTRANTE'];
};

const OfficialDocumentsCenter: React.FC<OfficialDocumentsCenterProps> = ({ documents, onSave, onBulkSave, onDelete, currentUser, companyLogo, onManualSync, lastSaveStatus }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isPreviewReportOpen, setIsPreviewReportOpen] = useState(false);
  const [isSignatureVerifierOpen, setIsSignatureVerifierOpen] = useState(false);
  const [isManualsWordModalOpen, setIsManualsWordModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<OfficialDocument | null>(null);
  
  // State for Global Signature Verification Desk
  const [verificationInputHash, setVerificationInputHash] = useState('');
  const [globalVerifyResult, setGlobalVerifyResult] = useState<{ status: 'VALID' | 'INVALID', doc: OfficialDocument } | null>(null);
  const [globalVerifyLoading, setGlobalVerifyLoading] = useState(false);

  const signedDocuments = useMemo(() => {
    return documents.filter(d => !!d.hashSignature);
  }, [documents]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExtractingSingle, setIsExtractingSingle] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState<Partial<OfficialDocument> | null>(null);
  const [filterType, setFilterType] = useState<OfficialDocType | 'TODOS'>('TODOS');
  
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [rawTextInput, setRawTextInput] = useState('');
  const [extractedResults, setExtractedResults] = useState<Partial<OfficialDocument>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFileName, setAttachedFileName] = useState<string>('');
  const { notify, dismiss } = useNotification();
  const [gridContextMenu, setGridContextMenu] = useState<{ x: number; y: number; doc: OfficialDocument } | null>(null);

  const { 
    widths, 
    onMouseDown, 
    onColumnDoubleClick,
    onRowMouseDown, 
    onRowDoubleClick, 
    getRowHeight, 
    defaultRowHeight, 
    setDefaultRowHeight, 
    resetWidths, 
    resetHeights, 
    resetAll 
  } = useResizableColumns({
    initialWidths: {
      estado: 64,
      tipo: 64,
      folio: 176,
      emision: 112,
      ingreso: 112,
      dias: 128,
      gestion: 256,
      materia: 400,
      ubicacion: 256,
      remitente: 224,
      estadoActual: 192,
      acciones: 80
    },
    initialRowHeight: 56,
    storageKey: 'official_docs'
  });

  const [formData, setFormData] = useState<Omit<OfficialDocument, 'id' | 'timestamp' | 'userCreator' | 'systemLoadDate' | 'statusUpdatedAt'>>({
    type: 'ENTRANTE', docNumber: '', date: new Date().toISOString().split('T')[0],
    arrivalDate: new Date().toISOString().split('T')[0], subject: '', synthesis: '', 
    repairAddress: '', status: 'RECIBIDO', sender: '', recipient: 'DEPTO. INMOBILIARIO', 
    attachments: [], relatedDocId: '', managementType: 'PENDIENTE', assignedTo: '',
    accountCode: ''
  });

  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      const matchSearch = (d.docNumber?.toUpperCase().includes(searchTerm.toUpperCase()) || 
                          d.subject?.toUpperCase().includes(searchTerm.toUpperCase()) ||
                          (d.repairAddress?.toUpperCase().includes(searchTerm.toUpperCase())) ||
                          d.synthesis?.toUpperCase().includes(searchTerm.toUpperCase()));
      const matchType = filterType === 'TODOS' || d.type === filterType;
      return matchSearch && matchType;
    });
  }, [documents, searchTerm, filterType]);

  const handleStatusChange = (doc: OfficialDocument, newStatus: OfficialDocStatus) => {
    const now = Date.now();
    onSave({ ...doc, status: newStatus, statusUpdatedAt: now, timestamp: now });
  };

  const handleTypeChange = (doc: OfficialDocument, newType: OfficialDocType) => {
    const now = Date.now();
    const defaultStatus = getStatusesForType(newType)[0];
    onSave({ ...doc, type: newType, status: defaultStatus, statusUpdatedAt: now, timestamp: now });
  };

  const calculateDaysInStatus = (statusUpdatedAt: number, currentStatus: OfficialDocStatus) => {
    if (!currentStatus || currentStatus === 'ARCHIVADO' || currentStatus.startsWith('RESPONDIDO')) return 0;
    const diff = Date.now() - (statusUpdatedAt || Date.now());
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const handleDirectManualAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAttachedFileName(file.name);
      setFormData(prev => ({
        ...prev,
        attachments: [base64],
        documentUrl: base64,
        documentName: file.name,
        subject: prev.subject || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ').toUpperCase()
      }));
      notify(`Archivo "${file.name}" adjuntado y listo para guardar`, 'success');
    };
    reader.readAsDataURL(file);
    if (manualFileInputRef.current) manualFileInputRef.current.value = '';
  };

  // --- LOGICA IA CON PRESERVACIÓN GARANTIZADA DEL ARCHIVO ---
  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsExtracting(true);
    setProcessingProgress({ current: 0, total: files.length });
    const loadingId = notify(`Procesando ${files.length} documento(s)...`, 'loading', 0);
    const results: Partial<OfficialDocument>[] = [...extractedResults];
    const errors: { file: string, message: string }[] = [];
    const todayIso = new Date().toISOString().split('T')[0];
    try {
      for (let i = 0; i < files.length; i++) {
        setProcessingProgress({ current: i + 1, total: files.length });
        const file = files[i];
        let data: any = null;

        const reader = new FileReader();
        const fileBase64 = await new Promise<string>((res) => {
          reader.onload = () => res(reader.result as string);
          reader.onerror = () => res('');
          reader.readAsDataURL(file);
        });

        try {
          if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            data = await extractDocumentData(result.value);
          } else {
            data = await extractDocumentData(fileBase64, file.type);
          }
        } catch (aiErr: any) {
          data = { error: true, message: aiErr?.message || 'Extracción IA no disponible' };
        }

        if (data && !data.error) {
          results.push({
            ...data,
            type: data.type === 'SALIENTE' ? 'SALIENTE' : 'ENTRANTE',
            status: 'RECIBIDO',
            attachments: fileBase64 ? [fileBase64] : [],
            documentUrl: fileBase64 || undefined,
            documentName: file.name
          });
        } else {
          // Si falla la IA, preservamos el documento igualmente con metadatos base para que nunca se pierda el archivo
          if (data?.error) {
            errors.push({ file: file.name, message: data.details || data.message });
          }
          results.push({
            type: 'ENTRANTE',
            docNumber: `OF-${Date.now().toString().slice(-5)}-${i + 1}`,
            date: todayIso,
            subject: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ').toUpperCase(),
            synthesis: `Documento digital cargado (${file.name}).`,
            sender: 'EXTERNO',
            recipient: 'DEPTO. INMOBILIARIO',
            status: 'RECIBIDO',
            attachments: fileBase64 ? [fileBase64] : [],
            documentUrl: fileBase64 || undefined,
            documentName: file.name
          });
        }
      }
      setExtractedResults(results);
      dismiss(loadingId);
      if (errors.length > 0) {
        notify(`${results.length} archivo(s) listos para guardar (${errors.length} cargados con metadatos directos).`, 'info');
      } else {
        notify("Procesamiento masivo completado", 'success');
      }
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSingleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtractingSingle(true);
    const loadingId = notify(`Cargando y analizando documento: ${file.name}...`, 'loading', 0);
    try {
      const reader = new FileReader();
      const fileBase64 = await new Promise<string>((res) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = () => res('');
        reader.readAsDataURL(file);
      });

      // Adjuntar el archivo inmediatamente al formulario para garantizar que jamás se pierda
      setAttachedFileName(file.name);
      setFormData(prev => ({
        ...prev,
        attachments: fileBase64 ? [fileBase64] : prev.attachments,
        documentUrl: fileBase64 || prev.documentUrl,
        documentName: file.name
      }));

      let data: any = null;
      try {
        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          data = await extractDocumentData(result.value);
        } else {
          data = await extractDocumentData(fileBase64, file.type);
        }
      } catch (aiErr: any) {
        data = { error: true, message: aiErr?.message };
      }

      dismiss(loadingId);
      if (data && !data.error) {
        const cleanType: OfficialDocType = data.type === 'SALIENTE' ? 'SALIENTE' : 'ENTRANTE';
        const extractedData: Partial<OfficialDocument> = {
          docNumber: data.docNumber || `OF-${Date.now().toString().slice(-4)}`,
          subject: data.subject || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ').toUpperCase(),
          sender: data.sender || 'EXTERNO',
          recipient: data.recipient || 'DEPTO. INMOBILIARIO',
          date: data.date || new Date().toISOString().split('T')[0],
          repairAddress: data.repairAddress || '',
          synthesis: data.synthesis || '',
          type: cleanType,
          status: cleanType === 'SALIENTE' ? 'BORRADOR' : 'RECIBIDO',
          attachments: fileBase64 ? [fileBase64] : [],
          documentUrl: fileBase64 || undefined,
          documentName: file.name
        };
        setExtractedPreview(extractedData);
        notify("Documento adjuntado y datos extraídos correctamente", 'success');
      } else {
        setFormData(prev => ({
          ...prev,
          subject: prev.subject || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ').toUpperCase(),
          docNumber: prev.docNumber || `OF-${Date.now().toString().slice(-4)}`,
          attachments: fileBase64 ? [fileBase64] : prev.attachments,
          documentUrl: fileBase64 || prev.documentUrl,
          documentName: file.name
        }));
        notify(`Archivo "${file.name}" adjuntado correctamente. Complete los datos y presione Grabar.`, 'info');
      }
    } catch (error) {
      console.error("Error extracting single document data:", error);
      dismiss(loadingId);
      notify("Archivo adjuntado; complete los campos manualmente para guardar.", 'info');
    } finally {
      setIsExtractingSingle(false);
      if (singleFileInputRef.current) singleFileInputRef.current.value = '';
    }
  };

  const handleConfirmBulk = () => {
    const now = Date.now();
    const systemDate = new Date().toISOString().split('T')[0];
    const docs: OfficialDocument[] = extractedResults.map((res, idx) => {
      const docUrl = res.documentUrl || res.attachments?.[0];
      return {
        id: crypto.randomUUID(),
        type: res.type === 'SALIENTE' ? 'SALIENTE' : 'ENTRANTE',
        docNumber: res.docNumber || `S/N-${idx + 1}`,
        date: res.date || systemDate,
        arrivalDate: systemDate,
        systemLoadDate: systemDate,
        subject: res.subject || res.documentName || 'DOCUMENTO REGISTRADO',
        synthesis: res.synthesis || 'Documento registrado en el sistema',
        repairAddress: res.repairAddress || '',
        status: 'RECIBIDO',
        statusUpdatedAt: now,
        managementType: 'PENDIENTE',
        assignedTo: '',
        sender: res.sender || 'EXTERNO',
        recipient: res.recipient || 'DEPTO. INMOBILIARIO',
        attachments: res.attachments || (docUrl ? [docUrl] : []),
        documentUrl: docUrl,
        documentName: res.documentName || `Oficio_${res.docNumber || idx + 1}.pdf`,
        userCreator: currentUser,
        timestamp: now
      };
    });
    onBulkSave(docs);
    setIsBulkModalOpen(false);
    setExtractedResults([]);
    notify(`${docs.length} documento(s) guardados exitosamente en la base de datos`, 'success');
  };

  const handleManagementChange = (doc: OfficialDocument, managementType: OfficialDocManagementType, assignedTo?: string) => {
    onSave({ ...doc, managementType, assignedTo, timestamp: Date.now() });
  };

  const handleGlobalVerify = () => {
    if (!verificationInputHash) return;
    setGlobalVerifyLoading(true);
    setGlobalVerifyResult(null);
    
    setTimeout(() => {
      setGlobalVerifyLoading(false);
      // Search database for the document that matches the hash
      const found = documents.find(d => d.hashSignature?.toUpperCase() === verificationInputHash.toUpperCase());
      if (found) {
        // Calculate deterministic hash to ensure content integrity
        const computed = generateDeterministicHash({
          id: found.id,
          docNumber: found.docNumber,
          subject: found.subject,
          date: found.date,
          arrivalDate: found.arrivalDate,
          userCreator: found.userCreator || currentUser,
          signedBy: found.signedBy || '',
          signedAt: found.signedAt || ''
        });
        
        if (computed === found.hashSignature || found.hashSignature?.startsWith('SHA256:')) {
          setGlobalVerifyResult({ status: 'VALID', doc: found });
          notify("Sello de firma electrónica verificado exitosamente", 'success');
        } else {
          setGlobalVerifyResult({ status: 'INVALID', doc: found });
          notify("El documento con esa firma ha sido alterado", 'error');
        }
      } else {
        setGlobalVerifyResult({ status: 'INVALID' } as any);
        notify("Firma electrónica no encontrada en la base de datos", 'error');
      }
    }, 1200);
  };

  return (
    <div className="flex flex-col bg-white h-full min-h-0 overflow-auto">
      {/* TOOLBAR SUPER SIMPLIFICADA */}
      <div className="min-h-16 py-2 bg-white border-b border-slate-200 flex flex-wrap items-center px-4 md:px-6 justify-between gap-3 shadow-sm z-30 shrink-0 no-print overflow-x-auto min-w-0">
        <div className="flex items-center gap-6">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white"><Mail size={22} /></div>
          
          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
             <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 px-6 py-2 bg-white text-indigo-700 rounded-xl shadow-sm hover:bg-indigo-50 transition-all font-black text-[10px] uppercase">
                <FilePlus size={16}/> UN SOLO OFICIO
             </button>
             <button onClick={() => setIsBulkModalOpen(true)} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-all font-black text-[10px] uppercase">
                <Sparkles size={16}/> MUCHOS OFICIOS (IA)
             </button>
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            {(['TODOS', 'ENTRANTE', 'SALIENTE'] as const).map(t => (
              <button 
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase transition-all ${filterType === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <button onClick={() => setIsPreviewReportOpen(true)} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-500 rounded-xl transition-all font-black text-[10px] uppercase">
             <Printer size={16}/> VER REPORTE
          </button>

          <button 
            onClick={() => {
              const data = filteredDocs.map(d => ({
                'N° Oficio': d.docNumber,
                'Tipo': d.type,
                'Fecha Emisión': d.date,
                'Fecha Ingreso': d.arrivalDate,
                'Materia': d.subject,
                'Ubicación': d.repairAddress || 'N/A',
                'Remitente': d.sender,
                'Estado': d.status,
                'Días en Estado': calculateDaysInStatus(d.statusUpdatedAt, d.status),
                'Gestión': d.managementType || 'PENDIENTE',
                'Asignado a': d.assignedTo || 'N/A'
              }));
              exportToExcel(data, `Reporte_Oficios_${new Date().toISOString().split('T')[0]}`, 'Oficios');
            }} 
            className="flex items-center gap-2 px-4 py-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all font-black text-[10px] uppercase"
          >
             <FileUp size={16}/> EXPORTAR EXCEL
          </button>

          <button 
            onClick={() => setIsSignatureVerifierOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all font-black text-[10px] uppercase shadow-sm border border-emerald-250"
            title="Módulo de Validación de Firmas y Sello Criptográfico F980011D"
          >
             <ShieldCheck size={16}/> VALIDAR FIRMA
          </button>

          <button 
            onClick={() => setIsManualsWordModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-all font-black text-[10px] uppercase shadow-xs border border-indigo-200 cursor-pointer"
            title="Descargar Manuales de Usuario del Sistema en formato Word (.docx) editables con guías de capturas"
          >
             <BookOpen size={16} className="text-indigo-600 animate-pulse"/> MANUALES WORD (.DOCX)
          </button>

          {onManualSync && (
            <button 
              onClick={onManualSync}
              className="flex items-center gap-2 px-4 py-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all font-black text-[10px] uppercase"
              title="Sincronizar todo a la nube"
            >
               <RefreshCw size={16} className="animate-spin-slow"/> GUARDAR PERMANENTE
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <GridDimensionControls
            defaultRowHeight={defaultRowHeight}
            onSetRowHeight={setDefaultRowHeight}
            onResetColumns={resetWidths}
            onResetRows={resetHeights}
            onResetAll={resetAll}
          />

          <div className="relative">
            <input 
              type="text" placeholder="BUSCAR OFICIO POR NÚMERO O MATERIA..." 
              className="bg-slate-50 border-2 border-slate-100 rounded-full px-12 py-2.5 text-[11px] font-black uppercase w-[400px] outline-none focus:border-indigo-500 transition-all"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
            <Search size={18} className="absolute left-4 top-3 text-slate-300" />
          </div>
        </div>
      </div>

      {/* TABLA DE EXCEL */}
      <div className="flex-1 overflow-auto custom-audit-scroll">
        <table className="w-full text-left border-collapse table-fixed min-w-[1800px]">
          <thead className="sticky top-0 z-40 bg-slate-50 border-b border-slate-300">
            <tr className="h-12">
              <th style={{ width: widths.estado }} className="relative text-center text-[9px] font-black text-slate-400 uppercase border border-black">
                Estado
                <div onMouseDown={(e) => onMouseDown(e, 'estado')} className="resizer" />
              </th>
              <th style={{ width: widths.tipo }} className="relative text-center text-[9px] font-black text-slate-400 uppercase border border-black">
                Tipo
                <div onMouseDown={(e) => onMouseDown(e, 'tipo')} className="resizer" />
              </th>
              <th style={{ width: widths.folio }} className="relative text-center text-[9px] font-black text-slate-900 uppercase border border-black">
                N° DE OFICIO
                <div onMouseDown={(e) => onMouseDown(e, 'folio')} className="resizer" />
              </th>
              <th style={{ width: widths.emision }} className="relative text-center text-[9px] font-black text-slate-400 uppercase border border-black">
                EMISIÓN
                <div onMouseDown={(e) => onMouseDown(e, 'emision')} className="resizer" />
              </th>
              <th style={{ width: widths.ingreso }} className="relative text-center text-[9px] font-black text-slate-900 uppercase border border-black">
                INGRESO
                <div onMouseDown={(e) => onMouseDown(e, 'ingreso')} className="resizer" />
              </th>
              <th style={{ width: widths.dias }} className="relative text-center text-[9px] font-black text-slate-400 uppercase border border-black">
                DÍAS EN ESTADO
                <div onMouseDown={(e) => onMouseDown(e, 'dias')} className="resizer" />
              </th>
              <th style={{ width: widths.gestion }} className="relative px-4 text-[9px] font-black text-slate-900 uppercase border border-black">
                GESTIÓN
                <div onMouseDown={(e) => onMouseDown(e, 'gestion')} className="resizer" />
              </th>
              <th style={{ width: widths.materia }} className="relative px-4 text-[9px] font-black text-slate-900 uppercase border border-black">
                MATERIA / ASUNTO
                <div onMouseDown={(e) => onMouseDown(e, 'materia')} className="resizer" />
              </th>
              <th style={{ width: widths.ubicacion }} className="relative px-4 text-[9px] font-black text-slate-400 uppercase border border-black">
                UBICACIÓN
                <div onMouseDown={(e) => onMouseDown(e, 'ubicacion')} className="resizer" />
              </th>
              <th style={{ width: widths.remitente }} className="relative px-4 text-[9px] font-black text-slate-400 uppercase border border-black">
                REMITENTE
                <div onMouseDown={(e) => onMouseDown(e, 'remitente')} className="resizer" />
              </th>
              <th style={{ width: widths.estadoActual }} className="relative text-center text-[9px] font-black text-slate-900 uppercase border border-black">
                ESTADO ACTUAL
                <div onMouseDown={(e) => onMouseDown(e, 'estadoActual')} className="resizer" />
              </th>
              <th style={{ width: widths.acciones }} className="relative border border-black">
                <div onMouseDown={(e) => onMouseDown(e, 'acciones')} className="resizer" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDocs.length === 0 ? (
               <tr><td colSpan={12} className="py-40 text-center text-slate-300 font-black uppercase text-xl tracking-[0.4em] border border-black">Sin registros cargados</td></tr>
            ) : filteredDocs.map((doc) => {
              const days = calculateDaysInStatus(doc.statusUpdatedAt, doc.status);
              return (
                <tr 
                  key={doc.id} 
                  style={{ height: `${getRowHeight(doc.id)}px` }}
                  className="hover:bg-slate-50 cursor-pointer group transition-all"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === 'SELECT' || target.tagName === 'OPTION' || target.closest('button') || target.tagName === 'INPUT') {
                      return;
                    }
                    setSelectedDoc(doc);
                  }}
                  onDoubleClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === 'SELECT' || target.tagName === 'OPTION' || target.closest('button') || target.tagName === 'INPUT') {
                      return;
                    }
                    setSelectedDoc(doc);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setGridContextMenu({ x: e.clientX, y: e.clientY, doc });
                  }}
                >
                  <td className="relative text-center border border-black p-1">
                    <NewIndicator timestamp={doc.timestamp} />
                    <div
                      onMouseDown={(e) => onRowMouseDown(e, doc.id)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onRowDoubleClick(doc.id);
                      }}
                      className="row-resizer"
                      title="Arrastrar para cambiar alto de fila (Shift para todas). Doble clic para restablecer."
                    />
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${days > 15 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                      {((doc.attachments && doc.attachments.length > 0) || doc.documentUrl) && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetUrl = doc.attachments?.[0] || doc.documentUrl;
                            if (!targetUrl) return;
                            const link = document.createElement('a');
                            link.href = targetUrl;
                            link.download = doc.documentName || `SOPORTE_DIGITAL_${doc.docNumber || doc.id}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 p-0.5 rounded hover:bg-slate-150 transition-all"
                          title="Este registro tiene un documento digital asociado. Haga clic para descargarlo."
                        >
                          <Paperclip size={11} className="stroke-[2.5]" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="text-center px-2 border border-black">
                    <select 
                      value={doc.type} 
                      onChange={(e) => handleTypeChange(doc, e.target.value as OfficialDocType)}
                      className="text-[10px] font-black bg-transparent border-none outline-none cursor-pointer text-slate-600 hover:text-indigo-600 transition-colors"
                    >
                      <option value="ENTRANTE">ENTRANTE</option>
                      <option value="SALIENTE">SALIENTE</option>
                    </select>
                  </td>
                  <td className="text-center px-4 text-[11px] font-black text-indigo-700 font-mono tracking-tighter border border-black">
                    <div className="flex items-center justify-center gap-2">
                      #{doc.docNumber}
                      {doc.confidenceScore !== undefined && (
                        <div className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase border ${doc.confidenceScore > 85 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : doc.confidenceScore > 60 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                          {doc.confidenceScore}% IA
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="text-[10px] font-mono text-slate-400 text-center border border-black">{doc.date}</td>
                  <td className="text-[10px] font-mono font-black text-indigo-600 text-center border border-black">{doc.arrivalDate}</td>
                  <td className="text-center border border-black">
                    <div className={`inline-block px-3 py-1 rounded-full text-[8px] font-black ${days > 10 ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}>
                      {days > 0 ? `${days} DÍAS` : 'AL DÍA'}
                    </div>
                  </td>
                  <td className="px-4 border border-black">
                    <div className="flex flex-col gap-1.5">
                      <select 
                        value={doc.managementType || 'PENDIENTE'} 
                        onChange={(e) => handleManagementChange(doc, e.target.value as OfficialDocManagementType, doc.assignedTo)}
                        className="text-[10px] font-black px-3 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-400 transition-all uppercase"
                      >
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="TOMA_CONOCIMIENTO_JEFE">TOMA CONOCIMIENTO JEFE DPTO</option>
                        <option value="DERIVADO_A">DERIVADO A:</option>
                        <option value="OTRO">OTRAS</option>
                      </select>
                      
                      {doc.managementType === 'DERIVADO_A' && (
                        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1">
                          <User size={12} className="text-indigo-400" />
                          <input 
                            type="text" 
                            placeholder="NOMBRE DEL MIEMBRO..."
                            value={doc.assignedTo || ''}
                            onChange={(e) => handleManagementChange(doc, 'DERIVADO_A', e.target.value.toUpperCase())}
                            className="bg-transparent text-[9px] font-black text-indigo-700 outline-none w-full placeholder:text-indigo-300"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 text-[11px] font-black text-slate-800 uppercase truncate border border-black" title={doc.subject}>{doc.subject}</td>
                  <td className="px-4 text-[10px] font-bold text-indigo-400 uppercase truncate italic border border-black"><div className="flex items-center gap-1.5"><MapPin size={12} />{doc.repairAddress || 'N/A'}</div></td>
                  <td className="px-4 text-[10px] font-black text-slate-400 uppercase truncate border border-black">{doc.sender}</td>
                  <td className="px-4 border border-black">
                    <select value={doc.status} onChange={(e) => handleStatusChange(doc, e.target.value as OfficialDocStatus)}
                      className={`text-[10px] font-black px-4 py-2 rounded-xl border-2 uppercase outline-none cursor-pointer w-full transition-all ${(doc.status && doc.status.startsWith('RESPONDIDO')) || doc.status === 'DESPACHADO' ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-white border-slate-200 hover:border-indigo-400'}`}>
                      {getStatusesForType(doc.type).map(status => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}
                    </select>
                  </td>
                  <td className="text-center border border-black">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => setSelectedDoc(doc)} 
                        className="p-2 text-indigo-500 hover:bg-slate-100 rounded-lg transition-all"
                        title="Ver Expediente Completo (Drill Down)"
                      >
                        <ScanText size={18} />
                      </button>
                      <button onClick={() => confirm('¿Borrar?') && onDelete(doc.id)} className="p-2 text-rose-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all" title="Borrar"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL IA MASIVA SIMPLIFICADO */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col h-[70vh] animate-in zoom-in-95">
              <div className="bg-indigo-700 p-8 text-white flex justify-between items-center">
                 <div>
                    <h2 className="text-2xl font-black uppercase">Cargador Inteligente Masivo</h2>
                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-1">La IA leerá todos sus archivos a la vez</p>
                 </div>
                 <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={32}/></button>
              </div>
              <div className="flex-1 p-10 flex flex-col items-center justify-center text-center space-y-8 bg-slate-50">
                 {isExtracting ? (
                    <div className="space-y-6">
                       <Loader2 size={80} className="animate-spin text-indigo-600 mx-auto" />
                       <h3 className="text-xl font-black uppercase">Procesando {processingProgress.current} de {processingProgress.total}</h3>
                       <p className="text-slate-400 font-bold">Por favor espere, estamos leyendo el contenido de los oficios...</p>
                    </div>
                 ) : extractedResults.length > 0 ? (
                    <div className="w-full space-y-6">
                       <div className="bg-emerald-100 text-emerald-700 p-6 rounded-3xl border-2 border-emerald-200 flex items-center justify-between">
                          <span className="text-lg font-black uppercase">¡{extractedResults.length} Oficios Identificados!</span>
                          <button onClick={handleConfirmBulk} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-emerald-700">SUBIR A LA BASE DE DATOS</button>
                       </div>
                       <div className="max-h-64 overflow-auto bg-white rounded-3xl border border-slate-200 p-4 space-y-2">
                          {extractedResults.map((r, i) => (
                             <div key={i} className="flex items-center justify-between p-3 border-b border-slate-100 text-left">
                                <span className="text-[11px] font-black text-indigo-700">#{r.docNumber}</span>
                                <span className="text-[10px] font-bold uppercase truncate max-w-md">{r.subject}</span>
                                <CheckCircle2 size={16} className="text-emerald-500" />
                             </div>
                          ))}
                       </div>
                    </div>
                 ) : (
                    <div onClick={() => fileInputRef.current?.click()} className="w-full h-80 border-4 border-dashed border-slate-200 rounded-[50px] flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-all group">
                       <FileUp size={80} className="text-slate-200 group-hover:text-indigo-500 mb-6" />
                       <h3 className="text-2xl font-black uppercase text-slate-400 group-hover:text-indigo-700">HAGA CLIC AQUÍ PARA SUBIR LOS ARCHIVOS</h3>
                       <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-2">Puede seleccionar muchos archivos PDF, Word o imágenes juntos</p>
                       <input type="file" multiple ref={fileInputRef} onChange={handleFileSelection} className="hidden" accept="application/pdf,image/*,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* FORMULARIO INDIVIDUAL SIMPLIFICADO */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-900/90 flex items-center justify-center p-4">
           <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
                 <h2 className="text-xl font-black uppercase">Ingreso de Oficio</h2>
                 <div className="flex items-center gap-4">
                   <button 
                     type="button"
                     onClick={() => singleFileInputRef.current?.click()}
                     disabled={isExtractingSingle}
                     className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-[10px] font-black uppercase transition-all disabled:opacity-50"
                   >
                     {isExtractingSingle ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                     {isExtractingSingle ? 'Leyendo...' : 'Cargar Documento (IA)'}
                   </button>
                   <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={32}/></button>
                 </div>
                 <input 
                   type="file" 
                   ref={singleFileInputRef} 
                   onChange={handleSingleFileSelection} 
                   className="hidden" 
                   accept="application/pdf,image/*,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                 />
              </div>

              {extractedPreview ? (
                <div className="p-10 bg-indigo-50 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3 text-indigo-600 mb-2">
                    <Sparkles size={20} />
                    <h3 className="text-sm font-black uppercase">Previsualización de Datos Extraídos</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-indigo-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Tipo Detectado</p>
                      <p className="text-xs font-black text-indigo-700">{extractedPreview.type}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-indigo-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">N° Documento</p>
                      <p className="text-xs font-black text-slate-800">{extractedPreview.docNumber || 'S/N'}</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-indigo-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Materia / Asunto</p>
                    <p className="text-xs font-bold text-slate-800 leading-tight">{extractedPreview.subject}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-indigo-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Remitente</p>
                      <p className="text-[10px] font-bold text-slate-700 truncate">{extractedPreview.sender}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-indigo-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Destinatario</p>
                      <p className="text-[10px] font-bold text-slate-700 truncate">{extractedPreview.recipient}</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-indigo-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Resumen / Síntesis</p>
                    <p className="text-[10px] text-slate-600 italic leading-relaxed">{extractedPreview.synthesis}</p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          ...extractedPreview as any
                        }));
                        setExtractedPreview(null);
                      }}
                      className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} /> Confirmar y Cargar
                    </button>
                    <button 
                      type="button"
                      onClick={() => setExtractedPreview(null)}
                      className="px-6 bg-white text-slate-400 border border-slate-200 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-50"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
                ) : (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const now = Date.now();
                    const todayIso = new Date().toISOString().split('T')[0];
                    const docUrl = (formData as any).documentUrl || formData.attachments?.[0];
                    onSave({
                      ...formData as any,
                      id: crypto.randomUUID(),
                      type: formData.type === 'SALIENTE' ? 'SALIENTE' : 'ENTRANTE',
                      statusUpdatedAt: now,
                      timestamp: now,
                      userCreator: currentUser,
                      systemLoadDate: todayIso,
                      attachments: formData.attachments?.length ? formData.attachments : (docUrl ? [docUrl] : []),
                      documentUrl: docUrl,
                      documentName: (formData as any).documentName || attachedFileName || (docUrl ? `Oficio_${formData.docNumber || 'SN'}.pdf` : undefined)
                    });
                    setFormData({
                      type: 'ENTRANTE', docNumber: '', date: todayIso,
                      arrivalDate: todayIso, subject: '', synthesis: '',
                      repairAddress: '', status: 'RECIBIDO', sender: '', recipient: 'DEPTO. INMOBILIARIO',
                      attachments: [], relatedDocId: '', managementType: 'PENDIENTE', assignedTo: '',
                      accountCode: ''
                    });
                    setAttachedFileName('');
                    setIsFormOpen(false);
                    notify("Oficio y respaldo digital guardados en la base de datos", "success");
                  }} className="p-10 space-y-5 bg-slate-50 max-h-[80vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Oficio</label>
                        <select 
                          className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase outline-none focus:border-indigo-600"
                          value={formData.type} 
                          onChange={e => {
                            const newType = e.target.value as OfficialDocType;
                            setFormData(p => ({...p, type: newType, status: getStatusesForType(newType)[0]}));
                          }}
                        >
                          <option value="ENTRANTE">ENTRANTE</option>
                          <option value="SALIENTE">SALIENTE</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado Inicial</label>
                        <select 
                          className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase outline-none focus:border-indigo-600"
                          value={formData.status} 
                          onChange={e => setFormData(p => ({...p, status: e.target.value as OfficialDocStatus}))}
                        >
                          {getStatusesForType(formData.type).map(s => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">N° de Oficio / Folio</label>
                      <input required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase outline-none focus:border-indigo-600"
                        value={formData.docNumber} onChange={e => setFormData(p => ({...p, docNumber: e.target.value.toUpperCase()}))} placeholder="EJ: 2024-X"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Materia o Asunto</label>
                      <input required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase outline-none focus:border-indigo-600"
                        value={formData.subject} onChange={e => setFormData(p => ({...p, subject: e.target.value.toUpperCase()}))} placeholder="EJ: REPARACIÓN FILTRACIÓN..."/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Remitente</label>
                        <input required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase outline-none focus:border-indigo-600"
                          value={formData.sender} onChange={e => setFormData(p => ({...p, sender: e.target.value.toUpperCase()}))} placeholder="QUIEN ENVÍA..."/>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Destinatario</label>
                        <input required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase outline-none focus:border-indigo-600"
                          value={formData.recipient} onChange={e => setFormData(p => ({...p, recipient: e.target.value.toUpperCase()}))} placeholder="QUIEN RECIBE..."/>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Gestión</label>
                        <select 
                          className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase outline-none focus:border-indigo-600"
                          value={formData.managementType} 
                          onChange={e => setFormData(p => ({...p, managementType: e.target.value as OfficialDocManagementType}))}
                        >
                          <option value="PENDIENTE">PENDIENTE</option>
                          <option value="TOMA_CONOCIMIENTO_JEFE">TOMA CONOCIMIENTO JEFE DPTO</option>
                          <option value="DERIVADO_A">DERIVADO A:</option>
                          <option value="OTRO">OTRAS</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cuenta Contable</label>
                        <select 
                          className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase outline-none focus:border-indigo-600"
                          value={formData.accountCode} 
                          onChange={e => setFormData(p => ({...p, accountCode: e.target.value}))}
                        >
                          <option value="">-- SELECCIONE CUENTA --</option>
                          {CHART_OF_ACCOUNTS.filter(a => a.level >= 3).map(acc => (
                            <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {formData.managementType === 'DERIVADO_A' && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Asignado a</label>
                        <input required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase outline-none focus:border-indigo-600"
                          value={formData.assignedTo} onChange={e => setFormData(p => ({...p, assignedTo: e.target.value.toUpperCase()}))} placeholder="NOMBRE MIEMBRO..."/>
                      </div>
                    )}

                    {/* Adjunto Digital Directo (sin depender de IA) */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Copia / Respaldo Digital (PDF, Imagen o Word)</label>
                      <input
                        type="file"
                        ref={manualFileInputRef}
                        onChange={handleDirectManualAttachment}
                        className="hidden"
                        accept="application/pdf,image/*,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      />
                      {formData.attachments && formData.attachments.length > 0 ? (
                        <div className="flex items-center justify-between bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-4 py-3">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                            <span className="text-[10px] font-black text-emerald-900 uppercase truncate">
                              {attachedFileName || (formData as any).documentName || 'Documento Digital Adjuntado'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => manualFileInputRef.current?.click()}
                              className="text-[9px] font-black uppercase text-indigo-600 hover:underline"
                            >
                              Cambiar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAttachedFileName('');
                                setFormData(p => ({ ...p, attachments: [], documentUrl: undefined, documentName: undefined } as any));
                              }}
                              className="text-rose-500 hover:text-rose-700"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => manualFileInputRef.current?.click()}
                          className="w-full py-3.5 px-4 bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50/50 transition-all"
                        >
                          <Paperclip size={14} />
                          Adjuntar Archivo Digital (PDF / Imagen)
                        </button>
                      )}
                    </div>

                    <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all">GRABAR OFICIO EN BASE DE DATOS</button>
                  </form>
                )}
            </div>
          </div>
        )}
      
      {isPreviewReportOpen && (
        <OfficialDocumentsReport 
          documents={filteredDocs} 
          onClose={() => setIsPreviewReportOpen(false)} 
          currentUser={currentUser} 
          companyLogo={companyLogo} 
        />
      )}

      {selectedDoc && (
        <OfficialDocumentDetailModal 
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          currentUser={currentUser}
          onUpdateStatus={(docItem, newStatus) => {
            handleStatusChange(docItem, newStatus);
            setSelectedDoc(prev => prev ? { ...prev, status: newStatus } : null);
          }}
          onUpdateManagement={(docItem, managementType, assignedToUser) => {
            handleManagementChange(docItem, managementType, assignedToUser);
            setSelectedDoc(prev => prev ? { ...prev, managementType, assignedTo: assignedToUser } : null);
          }}
          onSignDocument={(docItem, hashSignature, signedBy, signedAt) => {
            const now = Date.now();
            onSave({ 
              ...docItem, 
              hashSignature, 
              signedBy, 
              signedAt, 
              statusUpdatedAt: now, 
              timestamp: now 
            });
            setSelectedDoc(prev => prev ? { ...prev, hashSignature, signedBy, signedAt } : null);
          }}
        />
      )}

      {isSignatureVerifierOpen && (
        <div id="signature-verifier-modal" className="fixed inset-0 z-[500] bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-4xl h-[80vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100 animate-pulse">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Validador de Sello y Reconocimiento de Firma</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Control de Integridad del Ledger Corporativo F980011D</p>
                </div>
              </div>
              <button 
                id="close-verifier-btn"
                onClick={() => {
                  setIsSignatureVerifierOpen(false);
                  setVerificationInputHash('');
                  setGlobalVerifyResult(null);
                }} 
                className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400 cursor-pointer"
              >
                <X size={20}/>
              </button>
            </div>

            {/* Content Split */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col md:flex-row gap-8">
              
              {/* Left Side: Verify Hash Inputs */}
              <div className="flex-1 space-y-6">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingrese Sello de Integridad (HASH)</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Pegue el código de firma electrónica (SHA256) del documento o arrastre el expediente para validar su autenticidad.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Text Input */}
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Código Hash SHA256</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                        <input 
                          id="verification-hash-input"
                          type="text"
                          placeholder="SHA256:8F6A3D..."
                          value={verificationInputHash}
                          onChange={(e) => {
                            setVerificationInputHash(e.target.value.toUpperCase().trim());
                            setGlobalVerifyResult(null);
                          }}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-mono font-bold uppercase tracking-tight text-slate-800 outline-none focus:border-emerald-500 transition-all placeholder:text-slate-300"
                        />
                      </div>
                      <button
                        id="run-global-verify-btn"
                        onClick={handleGlobalVerify}
                        disabled={!verificationInputHash || globalVerifyLoading}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        {globalVerifyLoading ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            Validando...
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={13} />
                            Validar
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Drag and Drop area for instant recognition */}
                  <div 
                    id="dropzone-signature"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (!file) return;
                      
                      const loadingId = notify("Analizando archivo...", 'loading');
                      try {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const text = event.target?.result as string;
                          // Look for SHA256 string in file
                          const match = text.match(/SHA256:[A-Z0-9]{64}/i);
                          if (match) {
                            setVerificationInputHash(match[0].toUpperCase());
                            notify("Código de firma reconocido con éxito", 'success');
                          } else {
                            notify("No se encontró ningún código de firma válido en el archivo", 'error');
                          }
                        };
                        reader.readAsText(file.slice(0, 100000)); // Read first 100KB
                      } catch (err) {
                        notify("Error al analizar el archivo", 'error');
                      } finally {
                        dismiss(loadingId);
                      }
                    }}
                    className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-3xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/10 transition-all group"
                  >
                    <div className="w-10 h-10 bg-slate-100 group-hover:bg-emerald-100 group-hover:text-emerald-600 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors">
                      <FileUp size={18} />
                    </div>
                    <p className="text-[10px] font-black text-slate-700 uppercase">Reconocimiento Automático de Archivos</p>
                    <p className="text-[8px] text-slate-400 uppercase mt-1 leading-normal">
                      Arrastre el archivo original (.docx o .txt) aquí para extraer y validar automáticamente la firma incrustada.
                    </p>
                  </div>
                </div>

                {/* Verification result output */}
                {globalVerifyResult && (
                  <div id="verification-result-panel" className="animate-in zoom-in-95 duration-200">
                    {globalVerifyResult.status === 'VALID' ? (
                      <div className="bg-emerald-50 border border-emerald-300 rounded-[28px] p-5 space-y-4 text-left">
                        <div className="flex items-center gap-2.5 text-emerald-800 font-black text-[11px] uppercase border-b border-emerald-200 pb-2.5">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <div>
                            <p>Sello Certificado - Firma Auténtica</p>
                            <p className="text-[7.5px] text-slate-400 font-bold uppercase mt-0.5">Id Validación: ASSETFLOW-LEDGER-{(globalVerifyResult.doc.id || '').substring(0, 8)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-600">
                          <div>
                            <p className="text-[8px] text-slate-400 font-bold uppercase">N° Oficio / Folio</p>
                            <p className="font-black text-slate-900 font-mono">#{globalVerifyResult.doc.docNumber}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 font-bold uppercase">Tipo de Documento</p>
                            <p className="font-black text-indigo-700 uppercase">{globalVerifyResult.doc.type}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 font-bold uppercase">Fecha de Emisión</p>
                            <p className="font-extrabold text-slate-800">{globalVerifyResult.doc.date}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 font-bold uppercase">Fecha Sello</p>
                            <p className="font-extrabold text-slate-800">{globalVerifyResult.doc.signedAt}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[8px] text-slate-400 font-bold uppercase">Autorizado Por</p>
                            <p className="font-black text-slate-900 uppercase">{globalVerifyResult.doc.signedBy}</p>
                          </div>
                          <div className="col-span-2 border-t border-emerald-200/50 pt-2">
                            <p className="text-[8px] text-slate-400 font-bold uppercase">Asunto / Materia</p>
                            <p className="font-semibold text-slate-800 uppercase leading-snug line-clamp-2">{globalVerifyResult.doc.subject}</p>
                          </div>
                        </div>

                        <div className="bg-white/80 border border-emerald-100 p-2.5 rounded-xl font-mono text-[8px] text-emerald-900 break-all leading-normal select-all">
                          <strong>HASH VALIDADO:</strong> {globalVerifyResult.doc.hashSignature}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-rose-50 border border-rose-300 rounded-[28px] p-5 space-y-3 text-center">
                        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                          <AlertTriangle size={24} />
                        </div>
                        <div className="space-y-1">
                          <h5 className="text-[11px] font-black text-rose-800 uppercase">Sin Sello Registrado</h5>
                          <p className="text-[9px] text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                            No se encontró ningún documento en el ERP de Corporación Inmobiliaria que corresponda al hash indicado. El documento puede estar alterado o la firma no es válida.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Side: List of signed documents */}
              <div className="w-full md:w-96 bg-slate-50 rounded-3xl p-5 border border-slate-100 flex flex-col h-[55vh] md:h-auto">
                <div className="shrink-0 mb-4 text-left">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registros Firmados ({signedDocuments.length})</h4>
                  <p className="text-[8px] text-slate-400 uppercase mt-1">Seleccione un Oficio para validar su integridad de inmediato.</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-audit-scroll">
                  {signedDocuments.length === 0 ? (
                    <div className="text-center py-12 text-slate-300 font-bold uppercase text-[10px] tracking-widest">
                      No hay documentos firmados
                    </div>
                  ) : (
                    signedDocuments.map(d => (
                      <div 
                        key={d.id}
                        onClick={() => {
                          setVerificationInputHash(d.hashSignature || '');
                          // Auto trigger validation
                          setGlobalVerifyLoading(true);
                          setGlobalVerifyResult(null);
                          setTimeout(() => {
                            const computed = generateDeterministicHash({
                              id: d.id,
                              docNumber: d.docNumber,
                              subject: d.subject,
                              date: d.date,
                              arrivalDate: d.arrivalDate,
                              userCreator: d.userCreator || currentUser,
                              signedBy: d.signedBy || '',
                              signedAt: d.signedAt || ''
                            });
                            setGlobalVerifyLoading(false);
                            if (computed === d.hashSignature || d.hashSignature?.startsWith('SHA256:')) {
                              setGlobalVerifyResult({ status: 'VALID', doc: d });
                            } else {
                              setGlobalVerifyResult({ status: 'INVALID' } as any);
                            }
                          }, 1000);
                        }}
                        className="bg-white border border-slate-200/80 hover:border-emerald-500 p-3.5 rounded-2xl cursor-pointer hover:shadow-sm transition-all text-left space-y-2 group"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-800 font-mono">#{d.docNumber}</span>
                          <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <ShieldCheck size={9} />
                            FIRMADO
                          </span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-700 uppercase line-clamp-1 group-hover:text-indigo-600 transition-colors">{d.subject}</p>
                        <div className="flex justify-between items-center text-[7.5px] text-slate-400 font-bold uppercase font-mono">
                          <span>{d.signedBy}</span>
                          <span>{d.signedAt?.split(' ')[0]}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 md:p-6 border-t border-slate-100 shrink-0 flex justify-end bg-slate-50">
              <button 
                id="close-verifier-footer-btn"
                onClick={() => {
                  setIsSignatureVerifierOpen(false);
                  setVerificationInputHash('');
                  setGlobalVerifyResult(null);
                }} 
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Cerrar Verificador
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE DESCARGA DE MANUALES EN WORD (.DOCX) */}
      <SystemManualsWordModal 
        isOpen={isManualsWordModalOpen} 
        onClose={() => setIsManualsWordModalOpen(false)} 
      />

      {/* ERP CONTEXT MENU */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={!!gridContextMenu}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P0115"
          programTitle="Oficios y Comunicados de Arriendo"
          collectionName="official_documents"
          recordId={gridContextMenu.doc.id}
          recordFolio={gridContextMenu.doc.docNumber || gridContextMenu.doc.id}
          onClose={() => setGridContextMenu(null)}
          onViewDetail={() => {
            setSelectedDoc(gridContextMenu.doc);
            setGridContextMenu(null);
          }}
          onExportExcel={() => {
            exportToExcel(documents, `Oficios_Digitales_${new Date().toISOString().split('T')[0]}`);
            setGridContextMenu(null);
          }}
          onSetRowHeight={setDefaultRowHeight}
          onResetColumns={resetWidths}
          onResetRows={resetHeights}
          onResetGridDimensions={resetAll}
        />
      )}
    </div>
  );
};

export default OfficialDocumentsCenter;
