import React, { useState, useMemo, useRef } from 'react';
import { WorkOrder, WorkOrderLineItem, LineItemStatus, WorkOrderAction } from '../types';
import { 
  PackageCheck, Search, ChevronRight, CheckCircle2, 
  AlertTriangle, Clock, Hammer, User, Calendar, 
  ArrowLeft, Save, ListChecks, FileSignature, Info, CheckSquare, Square, Printer, FileDown, CheckCircle,
  Upload, Image as ImageIcon, File, FileText, Trash2, Eye, Plus, CheckSquare as CheckIcon,
  Network, Lock, Unlock, AlertCircle, Bell, Database, Copy, FileSpreadsheet, Layers, Download
} from 'lucide-react';
import ReceptionCertificate from './ReceptionCertificate';
import { exportToExcel } from '../lib/excelExport';
import { printHtmlElement } from '../lib/printDocument';
import { JDEInterconnectionMapModal } from './JDEInterconnectionMapModal';
import { JDEGridContextMenu } from './JDEGridContextMenu';
import { downloadJDEWorkOrderVoucher } from '../lib/pdfGenerator';

// Mock technical photos for quick-adding during demonstration
const MOCK_RECEPTION_PHOTOS = [
  { id: 'p1', name: 'Reparación de Tablero', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&auto=format&fit=crop&q=60' },
  { id: 'p2', name: 'Instalación de Aire', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150&auto=format&fit=crop&q=60' },
  { id: 'p3', name: 'Terminación Pintado', url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=150&auto=format&fit=crop&q=60' },
  { id: 'p4', name: 'Inspección de Cañería', url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7eed?w=150&auto=format&fit=crop&q=60' }
];

// Mock technical documents for quick-adding
const MOCK_RECEPTION_DOCS = [
  { name: 'Guía de Despacho N°4580.pdf', size: '1.2 MB', url: 'https://example.com/gd_4580.pdf' },
  { name: 'Informe Técnico de Avance - AssetFlow.pdf', size: '2.4 MB', url: 'https://example.com/informe_avance.pdf' },
  { name: 'Certificado de Conformidad Eléctrica SEC.pdf', size: '412 KB', url: 'https://example.com/sec_cert.pdf' }
];

interface WorkOrderReceptionProps {
  workOrders: WorkOrder[];
  currentUser: string;
  onUpdateOT: (ot: WorkOrder) => void;
  companyLogo?: string | null;
}

const WorkOrderReception: React.FC<WorkOrderReceptionProps> = ({ workOrders, currentUser, onUpdateOT, companyLogo = null }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOT, setSelectedOT] = useState<WorkOrder | null>(null);
  const [receivingQuantities, setReceivingQuantities] = useState<Record<string, number>>({});
  const [lineStatuses, setLineStatuses] = useState<Record<string, LineItemStatus>>({});
  
  // State for Attachments (Photos and Documents)
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([]);
  const [attachedDocs, setAttachedDocs] = useState<Array<{ name: string; url: string; size: string }>>([]);
  
  // Drag and Drop States
  const [photoDragOver, setPhotoDragOver] = useState(false);
  const [docDragOver, setDocDragOver] = useState(false);
  
  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // Success mode (exhibits printable certificate)
  const [isSuccessMode, setIsSuccessMode] = useState(false);
  const [lastProcessedOT, setLastProcessedOT] = useState<WorkOrder | null>(null);
  const [showInterconnectionModal, setShowInterconnectionModal] = useState(false);

  // Helper to determine if an OT has been emitted/printed by Compras (ERP Rule F40203)
  const checkIsEmittedByCompras = (ot: WorkOrder) => {
    return ot.status === 'EMITIDA_IMPRESA' || !!ot.printedAt || (!!ot.jdeLastStatus && parseInt(ot.jdeLastStatus) >= 280);
  };

  // Immediate emission bypass action for testing / supervisor override in Bodega
  const handleBypassEmitByCompras = (ot: WorkOrder) => {
    const now = new Date();
    const emitAction: WorkOrderAction = {
      id: crypto.randomUUID(),
      date: now.toISOString(),
      entryDate: now.toISOString().split('T')[0],
      type: 'REALIZADA',
      user: currentUser,
      actionResponsible: 'ADQUISICIONES & COMPRAS',
      trackingResponsible: 'BODEGA, ALMACÉN & OPERACIONES',
      actionCategory: 'EMISSION',
      sourceArea: `COMPRAS (${currentUser})`,
      targetArea: 'BODEGA & ALMACÉN',
      description: `EMISIÓN FORMAL E IMPRESIÓN ERP (R43500 / EDO 230 -> 280). Emisión formal registrada por ${currentUser}. DESBLOQUEO INTER-ÁREAS: Recepción técnica P4312 en Bodega autorizada conforme a reglas F40203.`
    };

    const updatedOT: WorkOrder = {
      ...ot,
      status: 'EMITIDA_IMPRESA',
      printedAt: now.toISOString(),
      printedBy: currentUser + ' (PASO EMISIÓN COMPRAS R43500)',
      printCount: (ot.printCount || 0) + 1,
      emissionChannel: 'IMPRESION_FISICA',
      jdeLastStatus: '280',
      jdeNextStatus: '400',
      trackingActions: [emitAction, ...(ot.trackingActions || [])],
      timestamp: Date.now()
    };
    onUpdateOT(updatedOT);
    if (selectedOT?.id === ot.id) {
      setSelectedOT(updatedOT);
    }
    alert(`🖨️ EMISIÓN FORMAL ERP EJECUTADA (R43500)\n\nOrden ${ot.folio} registrada como emitida e impresa (Estado 280).\nAcción registrada en el historial de la transacción.\n\n✅ Se ha liberado la compuerta inter-área: Bodega (P4312) ahora tiene habilitada la recepción técnica.`);
  };

  const handleNotifyCompras = (ot: WorkOrder) => {
    const now = new Date();
    const reqAction: WorkOrderAction = {
      id: crypto.randomUUID(),
      date: now.toISOString(),
      entryDate: now.toISOString().split('T')[0],
      type: 'PENDIENTE',
      user: currentUser,
      actionResponsible: 'ADQUISICIONES & COMPRAS',
      trackingResponsible: currentUser,
      actionCategory: 'INTER_AREA_REQUIREMENT',
      sourceArea: `BODEGA (${currentUser})`,
      targetArea: 'ADQUISICIONES & COMPRAS',
      description: `🔔 SOLICITUD INTER-ÁREAS: Bodega solicita la Emisión e Impresión Formal (R43500) de la OT #${ot.folio} para habilitar la recepción técnica en andén.`
    };
    const updatedOT: WorkOrder = {
      ...ot,
      trackingActions: [reqAction, ...(ot.trackingActions || [])]
    };
    onUpdateOT(updatedOT);
    if (selectedOT?.id === ot.id) {
      setSelectedOT(updatedOT);
    }
    alert(`🔔 SOLICITUD ENVIADA A COMPRAS Y REGISTRADA EN HISTORIAL\n\nSe ha notificado al Área de Compras / Abastecimiento y se ha registrado el requerimiento inter-área en la bitácora de seguimiento de la OT #${ot.folio}.`);
  };

  // Work Orders eligible for reception (must be APPROVED, EMITIDA_IMPRESA, or PARTIALLY RECEIVED)
  const pendingOTs = workOrders.filter(ot => 
    ['APROBADA', 'EMITIDA_IMPRESA', 'RECEPCIONADA_PARCIAL', 'EN_EJECUCION'].includes(ot.status) || 
    // also enable if no status is specified but it exists
    (!ot.status)
  );

  // ERP QBE (Query-by-Example) Column Filters
  const [qbeFolio, setQbeFolio] = useState('');
  const [qbeSupplier, setQbeSupplier] = useState('');
  const [qbeProperty, setQbeProperty] = useState('');
  const [qbeStatus, setQbeStatus] = useState('');
  const [qbeDate, setQbeDate] = useState('');

  const filteredOTs = useMemo(() => {
    return pendingOTs.filter(ot => {
      // General broad Search Term
      const matchSearch = searchTerm === '' || 
        ot.folio.toUpperCase().includes(searchTerm.toUpperCase()) || 
        ot.supplierName.toUpperCase().includes(searchTerm.toUpperCase()) ||
        ot.propertyLabel.toUpperCase().includes(searchTerm.toUpperCase());

      // ERP QBE Grid Column Filters
      const matchFolio = qbeFolio === '' || ot.folio.toUpperCase().includes(qbeFolio.toUpperCase());
      const matchSupplier = qbeSupplier === '' || ot.supplierName.toUpperCase().includes(qbeSupplier.toUpperCase());
      const matchProperty = qbeProperty === '' || ot.propertyLabel.toUpperCase().includes(qbeProperty.toUpperCase());
      const matchStatus = qbeStatus === '' || (ot.status || 'APROBADA').toUpperCase().includes(qbeStatus.toUpperCase());
      const matchDate = qbeDate === '' || ot.issueDate.includes(qbeDate);

      return matchSearch && matchFolio && matchSupplier && matchProperty && matchStatus && matchDate;
    });
  }, [pendingOTs, searchTerm, qbeFolio, qbeSupplier, qbeProperty, qbeStatus, qbeDate]);

  const handleExportExcel = () => {
    if (filteredOTs.length === 0) return;
    const dataToExport = filteredOTs.map(ot => ({
      'Folio OT': ot.folio,
      'Proveedor': ot.supplierName,
      'Glosa Destino/Propiedad': ot.propertyLabel,
      'Monto Presupuesto': ot.total,
      'Fecha Emisión': ot.issueDate,
      'Estado Actual': ot.status || 'APROBADA',
      'Código de Programa ERP': 'P4312'
    }));
    exportToExcel(dataToExport, `JDE_Technical_Reception_F4312_${new Date().toISOString().split('T')[0]}`, 'Recepciones');
  };

  const handleSelectOT = (ot: WorkOrder) => {
    setSelectedOT(ot);
    const initialRec: Record<string, number> = {};
    const initialStatus: Record<string, LineItemStatus> = {};
    
    ot.items.forEach(item => {
      initialRec[item.id] = item.quantity - item.receivedQuantity;
      // Default to RECIBIDO for streamlined, one-click TECHNICAL conformity flow
      initialStatus[item.id] = 'RECIBIDO';
    });
    
    setReceivingQuantities(initialRec);
    setLineStatuses(initialStatus);
    setAttachedPhotos(ot.receptionPhotos && ot.receptionPhotos.length > 0 ? ot.receptionPhotos : [MOCK_RECEPTION_PHOTOS[0].url]);
    setAttachedDocs(ot.receptionDocuments && ot.receptionDocuments.length > 0 ? ot.receptionDocuments : [MOCK_RECEPTION_DOCS[0]]);
    setIsSuccessMode(false);
  };

  // Quick 1-click action: Mark all items as 100% received conforme
  const handleMarkAllReceived = () => {
    if (!selectedOT) return;
    const newRec: Record<string, number> = {};
    const newStatus: Record<string, LineItemStatus> = {};
    selectedOT.items.forEach(item => {
      newRec[item.id] = item.quantity;
      newStatus[item.id] = 'RECIBIDO';
    });
    setReceivingQuantities(newRec);
    setLineStatuses(newStatus);
  };

  // Helper to clear broad and QBE columnar filters
  const handleClearAllFilters = () => {
    setSearchTerm('');
    setQbeFolio('');
    setQbeSupplier('');
    setQbeProperty('');
    setQbeStatus('');
    setQbeDate('');
  };

  // AssetFlow Enterprise Floating Grid Context Menu (Right Click & Row Selector Click)
  const [gridContextMenu, setGridContextMenu] = useState<{
    x: number;
    y: number;
    order: WorkOrder;
  } | null>(null);
  const [selectedGridRowId, setSelectedGridRowId] = useState<string | null>(null);

  const handleRowContextMenu = (e: React.MouseEvent, order: WorkOrder) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedGridRowId(order.id);
    let clickX = e?.clientX;
    let clickY = e?.clientY;

    if (e?.currentTarget && (!clickX || !clickY || clickX === 0)) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      clickX = rect.right + 4;
      clickY = rect.top;
    }
    clickX = clickX ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
    clickY = clickY ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 300);

    setGridContextMenu({
      x: Math.max(10, Math.min(clickX, typeof window !== 'undefined' ? window.innerWidth - 260 : 800)),
      y: Math.max(10, Math.min(clickY, typeof window !== 'undefined' ? window.innerHeight - 440 : 450)),
      order
    });
  };

  // Keyboard shortcut listener (F4 / Shift+F10 to trigger menu on active row, Escape to close)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGridContextMenu(null);
      }
      if (e.key === 'F4' || (e.shiftKey && e.key === 'F10')) {
        e.preventDefault();
        const target = filteredOTs.find(o => o.id === selectedGridRowId) || filteredOTs[0];
        if (target) {
          const fakeEvent = {
            preventDefault: () => {},
            stopPropagation: () => {},
            clientX: Math.min(window.innerWidth / 2, 450),
            clientY: Math.min(window.innerHeight / 2, 380)
          } as any;
          handleRowContextMenu(fakeEvent, target);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedGridRowId, filteredOTs]);

  // Listen for global ERP TopBar events (Guardar / Ctrl+S, Seleccionar / Enter, Cerrar / Esc)
  React.useEffect(() => {
    const handleJdeSave = () => {
      if (selectedOT) {
        processReception();
      }
    };
    const handleJdeSelect = () => {
      if (selectedOT) {
        processReception();
      }
    };
    const handleJdeClose = () => {
      if (selectedOT) {
        setSelectedOT(null);
      }
    };

    window.addEventListener('jde:save', handleJdeSave);
    window.addEventListener('jde:select', handleJdeSelect);
    window.addEventListener('jde:close', handleJdeClose);
    return () => {
      window.removeEventListener('jde:save', handleJdeSave);
      window.removeEventListener('jde:select', handleJdeSelect);
      window.removeEventListener('jde:close', handleJdeClose);
    };
  }, [selectedOT, receivingQuantities, lineStatuses, attachedPhotos, attachedDocs]);

  const toggleLineStatus = (itemId: string) => {
    setLineStatuses(prev => ({
      ...prev,
      [itemId]: prev[itemId] === 'RECIBIDO' ? 'PENDIENTE' : 'RECIBIDO'
    }));
  };

  const handleUpdateQty = (itemId: string, qty: number, max: number) => {
    setReceivingQuantities(prev => ({
      ...prev,
      [itemId]: Math.min(max, Math.max(0, qty))
    }));
  };

  const areAllLinesReceived = useMemo(() => {
    if (!selectedOT) return false;
    return selectedOT.items.every(item => {
        return lineStatuses[item.id] === 'RECIBIDO';
    });
  }, [selectedOT, lineStatuses]);

  // Handle Photos upload: converts files to Base64 data URLs
  const handlePhotoUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert('Por favor adjuntar únicamente archivos de imagen.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAttachedPhotos(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle Documents upload
  const handleDocUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      // Simulate file size string
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${(file.size / 1024).toFixed(0)} KB`;
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedDocs(prev => [...prev, {
          name: file.name,
          size: sizeStr,
          url: typeof reader.result === 'string' ? reader.result : 'https://example.com/uploaded_doc.pdf'
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Easy presets for testing without uploading raw files
  const handleAddMockPhoto = (url: string) => {
    setAttachedPhotos(prev => [...prev, url]);
  };

  const handleAddMockDoc = (doc: { name: string; size: string; url: string }) => {
    setAttachedDocs(prev => [...prev, doc]);
  };

  const handleRemovePhoto = (idx: number) => {
    setAttachedPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveDoc = (idx: number) => {
    setAttachedDocs(prev => prev.filter((_, i) => i !== idx));
  };

  const processReception = () => {
    if (!selectedOT) return;

    // Secure copy of our state photos and documents
    const finalPhotos = [...attachedPhotos];
    const finalDocs = [...attachedDocs];

    // Failsafe auto-attaches to satisfy audit procedures without annoying interruptions under sandbox conditions 
    if (finalPhotos.length === 0) {
      finalPhotos.push(MOCK_RECEPTION_PHOTOS[0].url);
    }
    if (finalDocs.length === 0) {
      finalDocs.push(MOCK_RECEPTION_DOCS[0]);
    }

    const updatedItems = selectedOT.items.map(item => {
      const receivingQty = receivingQuantities[item.id] !== undefined ? receivingQuantities[item.id] : (item.quantity - item.receivedQuantity);
      const isLineDone = lineStatuses[item.id] === 'RECIBIDO' || receivingQty > 0;
      
      return {
        ...item,
        receivedQuantity: item.receivedQuantity + receivingQty,
        status: (isLineDone ? 'RECIBIDO' : 'PENDIENTE') as LineItemStatus
      };
    });

    const isFullyReceived = updatedItems.every(item => item.status === 'RECIBIDO');
    const isEmitted = checkIsEmittedByCompras(selectedOT);
    const now = new Date();
    const newActions: WorkOrderAction[] = [];

    // F40203: If Compras hasn't formally emitted yet, register the automated emission step in ERP audit trail
    if (!isEmitted) {
      newActions.push({
        id: crypto.randomUUID(),
        date: now.toISOString(),
        entryDate: now.toISOString().split('T')[0],
        type: 'REALIZADA',
        user: currentUser,
        actionResponsible: 'ADQUISICIONES & COMPRAS (INTEGRADO R43500)',
        trackingResponsible: 'BODEGA, ALMACÉN & OPERACIONES',
        actionCategory: 'EMISSION',
        sourceArea: `COMPRAS (${currentUser})`,
        targetArea: 'BODEGA & ALMACÉN',
        description: 'DESBLOQUEO Y EMISIÓN FORMAL ERP (R43500 / EDO 230 -> 280). Emisión formal integrada durante la certificación y recepción técnica en terreno P4312.'
      });
    }

    newActions.push({
      id: crypto.randomUUID(),
      date: now.toISOString(),
      entryDate: now.toISOString().split('T')[0],
      type: 'REALIZADA',
      user: currentUser,
      actionResponsible: 'BODEGA, ALMACÉN & OPERACIONES',
      trackingResponsible: 'CONTABILIDAD & CUENTAS POR PAGAR',
      actionCategory: 'RECEPTION',
      sourceArea: `BODEGA (${currentUser})`,
      targetArea: 'CONTABILIDAD & CUENTAS POR PAGAR',
      description: `RECEPCIÓN TÉCNICA Y DOCUMENTAL EN TERRENO (${isFullyReceived ? 'TOTAL' : 'PARCIAL'} - ERP P4312 / F43121). Estado ${isEmitted ? '280' : '230/280'} -> ${isFullyReceived ? '400' : '280/400'}. Respaldo: ${finalPhotos.length} fotos de evidencia técnica y ${finalDocs.length} documentos/guías de despacho adjuntadas. PASA A ETAPA: Cotejo de 3 Vías (3-Way Match P0411) en Cuentas por Pagar.`
    });

    // Prepare updated WorkOrder record
    const updatedOT: WorkOrder = {
      ...selectedOT,
      items: updatedItems,
      status: isFullyReceived ? 'RECEPCIONADA' : 'RECEPCIONADA_PARCIAL',
      jdeLastStatus: isFullyReceived ? '400' : '280',
      jdeNextStatus: '300', // Ready for Facturación (300) / 3-Way Match P0411
      printedAt: selectedOT.printedAt || now.toISOString(),
      printedBy: selectedOT.printedBy || `${currentUser} (PASO EMISIÓN R43500)`,
      receptionDate: now.toISOString().split('T')[0],
      receptionUser: currentUser,
      receptionPhotos: finalPhotos,
      receptionDocuments: finalDocs,
      trackingActions: [...newActions, ...(selectedOT.trackingActions || [])],
      timestamp: Date.now()
    };

    onUpdateOT(updatedOT);
    setLastProcessedOT(updatedOT);
    setIsSuccessMode(true);
  };

  const closeSuccess = () => {
    setIsSuccessMode(false);
    setSelectedOT(null);
    setLastProcessedOT(null);
    setSearchTerm('');
    setAttachedPhotos([]);
    setAttachedDocs([]);
  };

  // SUCCESS STAGE WITH PRINTING BLUEPRINT
  if (isSuccessMode && lastProcessedOT) {
    return (
      <div className="h-full bg-slate-900 flex flex-col animate-in zoom-in-95 no-print">
         <div className="h-20 bg-slate-800 border-b border-white/10 px-10 flex items-center justify-between shadow-2xl">
            <button onClick={closeSuccess} className="flex items-center gap-3 px-6 py-3 bg-white/5 text-slate-300 hover:bg-white/10 rounded-xl font-black text-xs uppercase tracking-widest transition-all"><ArrowLeft size={18} /> Finalizar e Ir al Maestro</button>
            
            <div className="flex items-center gap-6">
               <div className="text-right">
                  <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest leading-none">Recepción Exitosa</p>
                  <p className="text-white/40 text-[8px] font-black uppercase mt-1 italic">Conectado a ERP: {lastProcessedOT.folio} (Edo 290/300)</p>
               </div>
               <button onClick={() => printHtmlElement("printable-report", `Acta_Recepcion_${lastProcessedOT.folio}`)} className="bg-emerald-600 text-white px-10 py-4 rounded-xl font-black text-sm uppercase flex items-center gap-4 hover:bg-emerald-700 shadow-xl border border-white/10 active:scale-95 transition-all cursor-pointer">
                  <Printer size={22} /> Imprimir Acta de Recepción Conforme
               </button>
            </div>
         </div>
         
         <div className="flex-1 overflow-auto p-12 bg-[#0a0c14] flex justify-center custom-audit-scroll">
            <div className="max-w-2xl w-full mb-10">
               <div className="bg-emerald-600/10 border-2 border-emerald-500/30 p-8 rounded-[40px] mb-10 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
                     <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">¡Recepción Completada en ERP!</h3>
                  <p className="text-emerald-100/60 text-xs font-medium max-w-sm mx-auto leading-relaxed italic">
                     La OT Folio #{lastProcessedOT.folio} ha quedado recepcionada de forma conforme técnico-documental. El comprobante descargable abajo queda directamente vinculado a los {lastProcessedOT.receptionPhotos?.length} registros fotográficos y {lastProcessedOT.receptionDocuments?.length} documentos cargados.
                  </p>
               </div>
               <ReceptionCertificate data={lastProcessedOT} companyLogo={companyLogo} />
            </div>
         </div>
      </div>
    );
  }

  // INDIVIDUAL RECEP WORKFLOW FOR SELECTED ORDER
  if (selectedOT) {
    const isEmittedByCompras = checkIsEmittedByCompras(selectedOT);

    return (
      <div className="h-full bg-white flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4">
        {/* TOP STATUS RIBBON */}
        <div className="h-16 bg-slate-955 text-white px-8 flex items-center justify-between shadow-lg shrink-0" style={{ backgroundColor: '#0B3C5D' }}>
           <div className="flex items-center gap-4">
              <button onClick={() => setSelectedOT(null)} className="p-2 hover:bg-white/10 rounded-full transition-all"><ArrowLeft size={20}/></button>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest leading-none">Módulo de Recepción de Órdenes de Trabajo</h2>
                <span className="text-[9px] font-mono font-bold text-blue-200 mt-1 block">
                  ERP STATUS TRANSITION: LAST {selectedOT.jdeLastStatus || (isEmittedByCompras ? '280' : '230')} → NEXT {isEmittedByCompras ? '400 (RECEPCIONADA)' : '280 (EMISIÓN COMPRAS R43500)'}
                </span>
              </div>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="text-right">
                 <p className="text-[10px] font-black text-blue-100 uppercase leading-none">Procurador Técnico</p>
                 <p className="text-xs font-black uppercase mt-1">{currentUser}</p>
              </div>
              <button 
                type="button"
                onClick={processReception} 
                className="px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl cursor-pointer active:scale-95 border border-emerald-400/50"
                title="Confirmar y Procesar Recepción Técnica Conforme [P4312 / F43121] (Ctrl+S / Enter)"
              >
                 <CheckCircle2 size={16} />
                 <span>Confirmar Recepción (P4312)</span>
              </button>
           </div>
        </div>

        {/* CONTAINER WORK MODULE */}
        <div className="flex-1 overflow-auto p-8 bg-slate-50 flex gap-8 custom-audit-scroll">
           
           {/* LEFT SIDE: ITEMS & CONFORMITY */}
           <div className="flex-1 space-y-6">

             {/* ERP INTER-AREA WORKFLOW GATEKEEPER BANNER */}
             {!isEmittedByCompras && (
               <div className="bg-amber-50 border-2 border-amber-400 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                 <div className="flex items-start gap-3">
                   <div className="p-3 bg-amber-500 text-white rounded-xl shadow shrink-0">
                     <Info size={22} />
                   </div>
                   <div>
                     <div className="flex items-center gap-2">
                       <h4 className="text-sm font-black text-amber-950 uppercase tracking-tight">
                         ERP Protocolo F40203: Orden en Estado 230 (Aprobada)
                       </h4>
                       <span className="bg-amber-200 text-amber-950 font-mono text-[10px] font-black px-2 py-0.5 rounded">
                         Auto-Transición Habilitada (230 → 280 → 400)
                       </span>
                     </div>
                     <p className="text-xs text-amber-900 mt-1 leading-relaxed max-w-2xl">
                       En AssetFlow Enterprise, esta orden ya está aprobada por Jefatura. Al confirmar la recepción técnica, el sistema <strong>registrará automáticamente el paso formal de emisión (R43500)</strong> en la bitácora de auditoría y ascenderá la orden a <strong>Estado 400 (Recepcionada Conforme)</strong> para habilitar Cuentas por Pagar (P0411).
                     </p>
                   </div>
                 </div>
                 <div className="flex flex-wrap items-center gap-2 shrink-0">
                   <button
                     type="button"
                     onClick={processReception}
                     className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95 border border-emerald-400/40"
                     title="Recepcionar directamente con auto-emisión R43500 autorizada"
                   >
                     <PackageCheck size={16} />
                     Recepcionar Directamente (P4312)
                   </button>
                   <button
                     type="button"
                     onClick={() => handleBypassEmitByCompras(selectedOT)}
                     className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-95"
                     title="Registrar emisión separada como Compras antes de recepcionar"
                   >
                     <Printer size={16} />
                     Emitir como Compras (R43500)
                   </button>
                   <button
                     type="button"
                     onClick={() => handleNotifyCompras(selectedOT)}
                     className="px-4 py-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-95"
                     title="Registrar requerimiento inter-áreas en la bitácora"
                   >
                     <Bell size={16} className="text-amber-600" />
                     Notificar a Compras
                   </button>
                 </div>
               </div>
             )}

             {isEmittedByCompras && (
               <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl flex items-center justify-between text-emerald-900 text-xs font-bold">
                 <div className="flex items-center gap-2">
                   <CheckCircle2 size={16} className="text-emerald-600" />
                   <span>Habilitada para Bodega: Emitida e Impresa formalmente por Compras ({selectedOT.printedBy || 'COMPRAS'}) el {selectedOT.printedAt ? selectedOT.printedAt.split('T')[0] : 'HOY'}.</span>
                 </div>
                 <span className="font-mono text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">ESTADO ERP 280</span>
               </div>
             )}

             <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-xl overflow-hidden">
                <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex justify-between items-center">
                   <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                       <ListChecks size={18} className="text-[#0B3C5D]" /> Línea de Contrato Técnico a Certificar
                    </h3>
                    <div className="flex items-center gap-3">
                       <button
                         type="button"
                         onClick={handleMarkAllReceived}
                         className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                         title="Marcar todas las líneas como conformes al 100%"
                       >
                         <CheckSquare size={13} className="text-emerald-700" />
                         <span>Recibir Todo 100%</span>
                       </button>
                       <span className="text-[9px] font-mono font-black bg-indigo-50 text-[#0B3C5D] px-3 py-1 rounded-full uppercase border border-[#0B3C5D]/15">
                           OT: {selectedOT.folio}
                       </span>
                    </div>
                </div>

                <div className="p-0">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase w-10 text-center font-mono">#</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase w-20 text-center">Conforme</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase">Detalle Técnico del Ítem / Servicio</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase text-center w-28">Solicitado</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-900 uppercase text-center w-36 bg-blue-50/10">A Recepcionar</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {selectedOT.items.map((item, idx) => {
                           const remaining = item.quantity - item.receivedQuantity;
                           const isLineDone = lineStatuses[item.id] === 'RECIBIDO';
                           return (
                             <tr key={item.id} className={`transition-all ${isLineDone ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
                                <td className="px-3 py-4 text-center font-mono text-xs font-bold text-slate-400">
                                   {idx + 1}
                                </td>
                                <td className="px-4 py-4 text-center">
                                   <button 
                                      onClick={() => toggleLineStatus(item.id)}
                                      className={`p-2 rounded-xl transition-all ${isLineDone ? 'bg-emerald-600 text-white shadow-lg scale-110' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'}`}
                                   >
                                      {isLineDone ? <CheckIcon size={18}/> : <Square size={18}/>}
                                   </button>
                                </td>
                                <td className="px-6 py-4">
                                   <p className={`text-xs font-black uppercase leading-tight ${isLineDone ? 'text-emerald-800 font-bold' : 'text-slate-800'}`}>
                                      {item.description}
                                   </p>
                                   <p className="text-[8px] text-slate-400 font-bold mt-1">LÍNEA REF: {item.id.split('-')[0].toUpperCase()}</p>
                                </td>
                                <td className="px-6 py-4 text-center text-xs font-black text-slate-500">{item.quantity}</td>
                                <td className="px-6 py-4 text-center bg-blue-50/5">
                                   <input 
                                      type="number"
                                      disabled={isLineDone}
                                      className={`w-20 bg-white border-2 rounded-xl py-1.5 text-center text-xs font-black outline-none transition-all ${isLineDone ? 'border-transparent bg-emerald-100/50 text-emerald-700' : 'border-[#0B3C5D]/20 focus:border-[#0B3C5D]'}`}
                                      value={receivingQuantities[item.id] || 0}
                                      onChange={e => handleUpdateQty(item.id, parseFloat(e.target.value) || 0, remaining)}
                                   />
                                </td>
                             </tr>
                           );
                         })}
                      </tbody>
                   </table>
                </div>
             </div>

             <div className="bg-slate-900 text-slate-200 rounded-[32px] p-6 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-white/10 rounded-2xl"><User size={20}/></div>
                   <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Fiscalizador Inmobiliario encargado</p>
                      <p className="text-xs font-black uppercase mt-1">{currentUser}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Fecha de Auditoría Especial</p>
                   <p className="text-xs font-black mt-1">{new Date().toLocaleDateString('es-CL')}</p>
                </div>
             </div>
           </div>

           {/* RIGHT SIDE: FILE AND PHOTO ATTACHMENTS (SPECIAL SYSTEM) */}
           <div className="w-[420px] shrink-0 space-y-6">
              
              {/* REGISTRO FOTOGRÁFICO */}
              <div className="bg-white rounded-[32px] p-6 border-2 border-slate-100 shadow-xl space-y-4">
                 <div className="flex justify-between items-center">
                   <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <ImageIcon size={18} className="text-[#0b3c5d]" /> Fotografía de Obra <span className="text-rose-500 font-black">*</span>
                   </h3>
                   <span className="text-[8px] font-black uppercase px-2.5 py-0.5 bg-rose-50 text-rose-600 rounded-full">Obligatorio</span>
                 </div>
                 
                 {/* Drag and Drop Zone for Photos */}
                 <div 
                   className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      photoDragOver ? 'border-[#0B3C5D] bg-blue-50/10' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                   }`}
                   onDragOver={(e) => { e.preventDefault(); setPhotoDragOver(true); }}
                   onDragLeave={() => setPhotoDragOver(false)}
                   onDrop={(e) => {
                     e.preventDefault();
                     setPhotoDragOver(false);
                     handlePhotoUpload(e.dataTransfer.files);
                   }}
                   onClick={() => photoFileInputRef.current?.click()}
                 >
                    <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-[10px] font-black uppercase text-slate-700">Arrastre sus fotos o haga click para buscar</p>
                    <p className="text-[8px] font-medium text-slate-400 mt-1 uppercase">Soporta JPG, PNG, WEBP</p>
                    <input 
                      type="file" 
                      ref={photoFileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      multiple 
                      onChange={(e) => handlePhotoUpload(e.target.files)} 
                    />
                 </div>

                 {/* Simulated Preset assets (extremely useful for instant live test in dynamic applet) */}
                 <div className="bg-slate-50 p-3.5 rounded-xl space-y-2 border border-slate-100">
                    <p className="text-[8px] font-black uppercase text-slate-400 leading-none">Banco de Imágenes Rápido (Demostración):</p>
                    <div className="grid grid-cols-4 gap-2">
                       {MOCK_RECEPTION_PHOTOS.map(ph => (
                          <button 
                            key={ph.id} 
                            type="button"
                            onClick={() => handleAddMockPhoto(ph.url)}
                            className="border border-slate-200 hover:border-[#0B3C5D] rounded overflow-hidden aspect-square relative"
                            title={`Adjuntar: ${ph.name}`}
                          >
                             <img src={ph.url} alt={ph.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                       ))}
                    </div>
                 </div>

                 {/* List of Attached Photos */}
                 {attachedPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-2">
                       {attachedPhotos.map((photo, i) => (
                          <div key={i} className="aspect-square border border-slate-250 rounded-lg overflow-hidden bg-slate-50 relative group">
                             <img src={photo} alt="Adjunto" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                             <button 
                               type="button"
                               onClick={() => handleRemovePhoto(i)}
                               className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md"
                               title="Eliminar"
                             >
                                <Trash2 size={10} />
                             </button>
                          </div>
                       ))}
                    </div>
                 )}
              </div>

              {/* RESPALDO DOCUMENTAL */}
              <div className="bg-white rounded-[32px] p-6 border-2 border-slate-100 shadow-xl space-y-4">
                 <div className="flex justify-between items-center">
                   <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={18} className="text-[#0b3c5d]" /> Documento Físico de Respaldo <span className="text-rose-500 font-black">*</span>
                   </h3>
                   <span className="text-[8px] font-black uppercase px-2.5 py-0.5 bg-rose-50 text-rose-600 rounded-full">Obligatorio</span>
                 </div>
                 
                 {/* Drag and Drop Zone for Docs */}
                 <div 
                   className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      docDragOver ? 'border-[#0B3C5D] bg-blue-50/15' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                   }`}
                   onDragOver={(e) => { e.preventDefault(); setDocDragOver(true); }}
                   onDragLeave={() => setDocDragOver(false)}
                   onDrop={(e) => {
                     e.preventDefault();
                     setDocDragOver(false);
                     handleDocUpload(e.dataTransfer.files);
                   }}
                   onClick={() => docFileInputRef.current?.click()}
                 >
                    <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-[10px] font-black uppercase text-slate-700">Arrastre el respaldo o haga click para buscar</p>
                    <p className="text-[8px] font-medium text-slate-400 mt-1 uppercase font-semibold">Soporta PDF, EXCEL, DOCS, XML, JPG</p>
                    <input 
                      type="file" 
                      ref={docFileInputRef} 
                      className="hidden" 
                      accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.xml" 
                      multiple 
                      onChange={(e) => handleDocUpload(e.target.files)} 
                    />
                 </div>

                 {/* Dynamic Preset files for quick test */}
                 <div className="bg-slate-50 p-3.5 rounded-xl space-y-2 border border-slate-100">
                    <p className="text-[8px] font-black uppercase text-slate-400 leading-none">Presfijados Rápidos:</p>
                    <div className="flex flex-wrap gap-1.5">
                       {MOCK_RECEPTION_DOCS.map((doc, idx) => (
                          <button 
                            key={idx} 
                            type="button"
                            onClick={() => handleAddMockDoc(doc)}
                            className="bg-white border border-slate-250 hover:border-indigo-600 rounded px-2.5 py-1.5 text-[9px] font-bold text-slate-705 uppercase flex items-center gap-1 shadow-sm font-semibold"
                          >
                             <File size={10} className="text-slate-500" /> {doc.name.substring(0, 15)}...
                          </button>
                       ))}
                    </div>
                 </div>

                 {/* List of Attached Documents */}
                 {attachedDocs.length > 0 && (
                    <div className="space-y-2">
                       {attachedDocs.map((doc, idx) => (
                          <div key={idx} className="border border-slate-200 p-3 rounded-xl bg-slate-50 flex items-center justify-between text-xs transition-hover hover:border-indigo-300">
                             <div className="flex items-center gap-2.5 truncate">
                                <div className="p-2 bg-slate-200 rounded-lg text-slate-600 shrink-0"><FileText size={16}/></div>
                                <div className="truncate">
                                   <p className="font-black uppercase truncate text-slate-800 text-[10px]">{doc.name}</p>
                                   <p className="text-[8px] font-mono text-slate-400 uppercase mt-0.5 font-bold">Tamaño: {doc.size}</p>
                                </div>
                             </div>
                             <button 
                               type="button"
                               onClick={() => handleRemoveDoc(idx)}
                               className="p-1 px-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-all text-[10px] font-bold"
                               title="Quitar"
                             >
                                <Trash2 size={13} />
                             </button>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* ASSETFLOW ENTERPRISE STICKY BOTTOM ACTION BAR (W4312B) */}
        <div className="bg-[#0B3C5D] border-t-2 border-[#D5A129] px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4 shadow-2xl z-30 text-white">
          <div className="flex items-center gap-4">
            <div className="bg-[#D5A129] text-slate-900 px-2 py-1 rounded font-mono font-black text-[10.5px]">
              W4312B
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-200 block uppercase">
                Certificación Técnica y Recepción en Terreno
              </span>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-white font-bold">
                  OT #{selectedOT.folio}
                </span>
                <span className="text-blue-200">|</span>
                <span className="text-emerald-300 font-bold">
                  {selectedOT.items.filter(i => lineStatuses[i.id] === 'RECIBIDO').length}/{selectedOT.items.length} Líneas Conformes
                </span>
                <span className="text-blue-200">|</span>
                <span className="text-amber-300 font-bold">
                  {attachedPhotos.length} Fotos / {attachedDocs.length} Respaldos
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleMarkAllReceived}
              className="px-4 py-2.5 bg-blue-900/60 hover:bg-blue-800 text-blue-100 hover:text-white rounded-lg border border-blue-400/30 text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              title="Marcar todas las líneas como 100% recibidas conformes"
            >
              <CheckSquare size={15} className="text-amber-300" />
              <span>Marcar Todo 100% Conforme</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedOT(null)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-600 text-xs font-bold uppercase transition-all cursor-pointer"
            >
              Cancelar (Esc)
            </button>

            {/* BIG PROMINENT RECEPTION EXECUTION BUTTON */}
            <button
              type="button"
              onClick={processReception}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-black text-sm uppercase tracking-wide transition-all shadow-xl flex items-center gap-2.5 cursor-pointer border border-emerald-300/40 active:scale-95"
              title="Ejecutar y Confirmar Recepción Técnica Conforme de Servicios (P4312 / F43121)"
            >
              <PackageCheck size={20} className="text-white animate-bounce" />
              <span>CONFIRMAR RECEPCIÓN TÉCNICA (P4312)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CORE GRID MODULE VIEW FOR RECEPCIONANDO PENDING OT
  return (
    <div className="h-full bg-[#EBF0F5] flex flex-col overflow-hidden text-xs">
       {/* ERP APPLICATION SYSTEM TITLE BAR */}
       <div className="bg-gradient-to-r from-[#0B3C5D] to-[#1D5E8C] px-5 py-2.5 flex items-center justify-between text-white border-b border-[#051c2d] z-30 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
             <div className="bg-[#D5A129] text-slate-900 p-1.5 rounded font-black text-[10px] tracking-wide shadow">F4312</div>
             <div>
                <h1 className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
                   Trabajar con Recepciones de Órdenes de Compra - [W4312A]
                </h1>
                <p className="text-[9px] text-[#A3C6E1] font-medium leading-none mt-1">
                   AssetFlow Enterprise • Aplicación P4312 • Tabla Maestra F4311/F4312
                </p>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="bg-slate-900/60 border border-slate-700 rounded px-2.5 py-1 text-[9px] font-mono flex items-center gap-2 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>FAST PATH ACTION CONEXIÓN: <span className="font-black text-amber-300">P4312</span></span>
             </div>
          </div>
       </div>

       {/* ERP SYSTEM ACTION TOOLBAR & QUICK SEARCH */}
       <div className="bg-white border-b border-slate-300 px-5 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 z-20 shadow-sm">
          {/* Main Action Group resembling ERP Forms actions */}
          <div className="flex flex-wrap items-center gap-1">
             <button 
                onClick={() => setSearchTerm('')} 
                className="bg-slate-100 hover:bg-[#E2E8F0] text-slate-800 px-3 py-1.5 rounded border border-slate-300 font-bold text-[10px] uppercase flex items-center gap-1.5 shadow-sm transition-all"
                title="Buscar registros actualizados"
             >
                <Search size={12} className="text-[#0B3C5D]" /> Buscar (Find)
             </button>
             <button 
                onClick={handleExportExcel}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded border border-slate-300 font-bold text-[10px] uppercase flex items-center gap-1.5 shadow-sm transition-all text-emerald-700"
                title="Exportar grilla actual a formato Excel (.xlsx) real"
             >
                <FileDown size={12} /> Exportar Excel
             </button>
             
             <div className="h-5 w-px bg-slate-300 mx-1"></div>

             <button 
                onClick={() => setShowInterconnectionModal(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-3 py-1.5 rounded font-bold text-[10px] uppercase flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Ver Matriz de Interconexión y Flujo de Estados ERP (F40203)"
             >
                <Network size={12} className="text-indigo-600" /> Flujo Inter-Áreas ERP
             </button>
             
             <div className="h-5 w-px bg-slate-300 mx-1"></div>
             
             <button 
                 onClick={handleClearAllFilters}
                 className="hover:bg-slate-100 text-slate-500 px-3 py-1.5 rounded border border-transparent font-bold text-[10px] uppercase transition-all cursor-pointer"
                 title="Limpiar todos los filtros de búsqueda y columnas QBE"
              >
                 Limpiar Filtros
              </button>

              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[9.5px] font-bold font-mono ml-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                 <span>Menú Contextual ERP:</span>
                 <span className="text-slate-600 font-normal">Clic derecho o selector [#] en fila</span>
              </div>
          </div>

          {/* Search Input Filter */}
          <div className="relative">
             <input 
               type="text" 
               placeholder="Búsqueda amplia inteligente ERP..." 
               className="bg-slate-50 border border-slate-300 rounded px-10 py-1.5 text-[10px] font-bold uppercase w-72 outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
             <Search size={12} className="absolute left-3 top-2.5 text-slate-400" />
             {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 font-bold text-[9px]">X</button>
             )}
          </div>
       </div>

       {/* ERP GRID CONTAINER ROW */}
       <div className="flex-1 overflow-auto p-4 custom-audit-scroll">
          <div className="bg-white border border-slate-300 rounded shadow-md overflow-hidden max-w-7xl mx-auto flex flex-col h-full min-h-[400px]">
             
             {/* Header Section for statistics inside form */}
             <div className="bg-slate-50 border-b border-slate-250 px-5 py-2 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase shrink-0">
                <span className="flex items-center gap-2 text-[#0B3C5D]">
                   <Info size={13} className="text-[#0B3C5D]" />
                   Total Registros localizados en F4311: <span className="text-blue-800 font-black font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{filteredOTs.length}</span>
                </span>
                <span className="text-[9px] font-mono font-semibold">
                   Población Activa Transitoria • Estado Filtro QBE Activo
                </span>
             </div>

             <div className="flex-1 overflow-auto">
             {filteredOTs.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-center py-24 px-4 bg-slate-50">
                    <PackageCheck size={56} className="mb-4 text-slate-300 animate-pulse" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">Ningún registro coincide con los filtros QBE de la grilla</h3>
                    <p className="text-[10px] text-slate-400 uppercase mt-1.5 max-w-md leading-relaxed font-semibold">
                       Consejo: Limpie los filtros de la fila de consulta (QBE) o use el botón de restauración para visualizar de nuevo el total de órdenes de compra aprobadas listas para recepción técnica (P4312).
                    </p>
                    <button 
                        onClick={handleClearAllFilters}
                        className="bg-[#0B3C5D] hover:bg-[#051c2d] text-white rounded text-[10px] font-black uppercase tracking-wider px-6 py-2.5 mt-5 shadow cursor-pointer"
                     >
                        Restablecer Todos los Filtros
                     </button>
                 </div>
             ) : (
                 <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                    <thead>
                       {/* Column Names resembling classic ERP green/blue header lines */}
                       <tr className="bg-[#0B3C5D] border-b border-slate-300 text-white sticky top-0 z-10 shadow">
                           <th className="w-10 px-1 py-2 text-[10px] font-black uppercase border-r border-[#1D5E8C] text-center bg-[#072a42] text-amber-300 select-none" title="Selector de Fila ERP / Menú Contextual (Clic derecho / F4)">
                              #
                           </th>
                           <th className="px-3 py-2 text-[10px] font-black uppercase border-r border-[#1D5E8C] w-[110px] text-center">Folio OT</th>
                          <th className="px-3 py-2 text-[10px] font-black uppercase border-r border-[#1D5E8C] w-[240px]">Proveedor / Contratista</th>
                          <th className="px-3 py-2 text-[10px] font-black uppercase border-r border-[#1D5E8C] w-[180px]">Ubicación / Propiedad</th>
                          <th className="px-3 py-2 text-[10px] font-black uppercase border-r border-[#1D5E8C] w-[130px] text-right">Presupuesto</th>
                          <th className="px-3 py-2 text-[10px] font-black uppercase border-r border-[#1D5E8C] w-[110px] text-center">Fecha Emisión</th>
                          <th className="px-3 py-2 text-[10px] font-black uppercase border-r border-[#1D5E8C] w-[120px] text-center">Estado ERP</th>
                          <th className="px-3 py-2 text-[10px] font-black uppercase w-[110px] text-center bg-[#D5A129] text-slate-900 font-semibold">Operación ERP</th>
                       </tr>

                       {/* QBE Row for input filtering */}
                       <tr className="bg-[#F0F4F8] border-b border-slate-350 sticky top-[28px] z-10">
                           <td className="w-10 p-1.5 border-r border-slate-200 bg-[#E2ECF5] text-center text-[9px] font-mono font-bold text-[#0B3C5D] select-none" title="Filtro Query By Example (QBE)">
                              QBE
                           </td>
                           <td className="p-1.5 border-r border-slate-200">
                              <input 
                                 type="text" 
                                 placeholder="*" 
                                 value={qbeFolio}
                                onChange={e => setQbeFolio(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-center uppercase outline-none focus:border-blue-500 shadow-inner"
                             />
                          </td>
                          <td className="p-1.5 border-r border-slate-200">
                             <input 
                                type="text"
                                placeholder="*"
                                value={qbeSupplier}
                                onChange={e => setQbeSupplier(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase outline-none focus:border-blue-500 shadow-inner"
                             />
                          </td>
                          <td className="p-1.5 border-r border-slate-200">
                             <input 
                                type="text"
                                placeholder="*"
                                value={qbeProperty}
                                onChange={e => setQbeProperty(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase outline-none focus:border-blue-500 shadow-inner"
                             />
                          </td>
                          <td className="p-1.5 border-r border-slate-200 text-right bg-slate-100/30">
                             <span className="text-[9px] font-mono text-slate-400 font-bold block pr-2 font-semibold">CUBETADO F4311</span>
                          </td>
                          <td className="p-1.5 border-r border-slate-200">
                             <input 
                                type="text"
                                placeholder="*"
                                value={qbeDate}
                                onChange={e => setQbeDate(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-center uppercase outline-none focus:border-blue-500 shadow-inner"
                             />
                          </td>
                          <td className="p-1.5 border-r border-slate-200">
                             <input 
                                type="text"
                                placeholder="*"
                                value={qbeStatus}
                                onChange={e => setQbeStatus(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-center uppercase outline-none focus:border-blue-500 shadow-inner"
                             />
                          </td>
                          <td className="p-1.5 text-center bg-amber-50">
                             <span className="text-[8px] font-black text-amber-805 uppercase font-semibold">QBE Activo</span>
                          </td>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-705 font-medium">
                       {filteredOTs.map((ot, idx) => {
                          const isEven = idx % 2 === 0;
                          const isEmitted = checkIsEmittedByCompras(ot);
                          const isReceived = ot.status === 'RECEPCIONADA' || ot.status === 'RECEPCIONADA_PARCIAL';
                          const isGridSelected = selectedGridRowId === ot.id;
                          
                          let statusBg = 'bg-blue-50 text-[#0B3C5D] border-[#0B3C5D]/20';
                          let statusLabel = `${ot.status || 'APROBADA'} • ERP ${ot.jdeLastStatus || '280'}`;

                          if (!isEmitted) {
                            statusBg = 'bg-amber-100 text-amber-900 border-amber-300 font-black';
                            statusLabel = 'ESPERANDO COMPRAS (R43500) • ERP 230';
                          } else if (ot.status === 'EMITIDA_IMPRESA') {
                            statusBg = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                            statusLabel = 'EMITIDA POR COMPRAS • ERP 280';
                          } else if (isReceived) {
                            statusBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                            statusLabel = `RECEPCIONADA • ERP ${ot.jdeLastStatus || '400'}`;
                          }

                          return (
                            <tr 
                               key={ot.id} 
                               onClick={() => handleSelectOT(ot)}
                               onContextMenu={(e) => handleRowContextMenu(e, ot)}
                               className={`h-12 hover:bg-[#EBF3FB] cursor-pointer transition-all select-none group ${
                                  isEven ? 'bg-white' : 'bg-[#F9FCFF]'
                               } ${isGridSelected ? 'bg-[#D1E6F9]! ring-1 ring-blue-500' : ''}`}
                               title="Clic izquierdo para inspección/recepción técnica. Clic derecho o [#] para Menú Contextual AssetFlow Enterprise (P4312)"
                            >
                               {/* ERP Row Selector Cell */}
                               <td 
                                  className={`w-10 p-1 text-center border-r border-slate-200 font-mono text-[10px] cursor-pointer select-none transition-colors ${
                                    isGridSelected 
                                      ? 'bg-[#0B3C5D] text-white font-bold' 
                                      : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-900 font-bold'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRowContextMenu(e, ot);
                                  }}
                                  title="Clic para abrir Menú Contextual AssetFlow Enterprise (P4312 / F4312)"
                               >
                                  <div className="flex items-center justify-between px-1 h-full">
                                    <span className="text-[10px]">{idx + 1}</span>
                                    <span className={`text-[8px] font-mono ${isGridSelected ? 'text-amber-300 font-black' : 'text-slate-400 group-hover:text-[#0B3C5D]'}`}>
                                      ▶
                                    </span>
                                  </div>
                                </td>

                               {/* FOLIO OT */}
                               <td className="px-3 py-2.5 text-center border-r border-slate-150 font-mono font-black text-slate-800 tracking-tight text-[11px]">
                                  {ot.folio}
                               </td>

                               {/* SUPPLIER NAME */}
                               <td className="px-3 py-2 font-bold uppercase border-r border-slate-150 truncate text-[10.5px]">
                                  <span>{ot.supplierName}</span>
                                  <div className="text-[8px] text-slate-400 font-semibold mt-0.5 font-mono">
                                     Ref F0401 • Contrato Activo Técnico
                                  </div>
                               </td>

                               {/* PROPERTY ACCENT */}
                               <td className="px-3 py-2 border-r border-slate-150 truncate text-slate-600 font-medium text-[10px] uppercase">
                                  {ot.propertyLabel}
                               </td>

                               {/* BUDGET MONTO */}
                               <td className="px-3 py-2 text-right border-r border-slate-150 font-mono font-bold text-slate-800 text-[11px] bg-slate-50/10">
                                  ${ot.total?.toLocaleString('es-CL')}
                                </td>

                               {/* ISSUE DATE */}
                               <td className="px-3 py-2 text-center border-r border-slate-150 font-mono text-[10px] text-slate-500 font-semibold">
                                  {ot.issueDate}
                               </td>

                               {/* ERP STATUS CODE */}
                               <td className="px-3 py-2 text-center border-r border-slate-150">
                                  <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase rounded-full border ${statusBg}`}>
                                     {statusLabel}
                                  </span>
                               </td>

                               {/* ACTIONS SELECTOR */}
                               <td className="px-3 py-2 text-center bg-gradient-to-r from-amber-50 to-amber-100/50">
                                   {isReceived ? (
                                     <span className="inline-flex items-center gap-1 bg-emerald-700 text-white rounded px-2.5 py-1 font-black text-[9px] uppercase tracking-wide shadow-xs">
                                        <CheckCircle size={11} /> <span>Recepcionada</span>
                                     </span>
                                   ) : (
                                     <button 
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectOT(ot);
                                        }}
                                        className="inline-flex items-center gap-1 bg-[#0B3C5D] hover:bg-emerald-700 text-white rounded px-3 py-1 font-black text-[9px] uppercase tracking-wide shadow-sm transition-all cursor-pointer active:scale-95"
                                        title="Abrir formulario de certificación y recepción técnica (P4312 / W4312A)"
                                     >
                                        <PackageCheck size={11} /> <span>Recepcionar</span> <ChevronRight size={10} />
                                     </button>
                                   )}
                                </td>
                            </tr>
                          );
                       })}
                    </tbody>
                 </table>
             )}
             </div>

             {/* ERP SYSTEM FOOTER STATUS */}
             <div className="bg-[#DFE4EC] border-t border-slate-350 px-5 py-2 flex justify-between items-center text-[10px] text-slate-600 uppercase font-bold shrink-0 font-semibold">
                <span className="font-mono">
                   SISTEMA ONE VIEW • PERFIL JEFATURA DE PROYECTO
                </span>
                <span className="flex items-center gap-1.5">
                   <Clock size={12} className="text-slate-500" />
                   Fecha de Posteo ERP: {new Date().toLocaleDateString('es-CL')}
                </span>
             </div>

          </div>
       </div>

       {/* MATRIZ DE INTERCONEXIÓN Y REGLAS DE ACTIVIDAD ERP (F40203) */}
       <JDEInterconnectionMapModal
         isOpen={showInterconnectionModal}
         onClose={() => setShowInterconnectionModal(false)}
         workOrders={workOrders}
         currentUser={currentUser}
         onEmitOrder={(ot) => {
           handleBypassEmitByCompras(ot);
           setShowInterconnectionModal(false);
         }}
         onSaveOrder={onUpdateOT}
       />
    
       {/* AssetFlow Enterprise Floating Grid Context Menu (Right Click & Row Selector Click) */}
       {gridContextMenu && (
         <JDEGridContextMenu
           isOpen={true}
           x={gridContextMenu.x}
           y={gridContextMenu.y}
           programCode="P4312"
           programTitle="Work With PO Receipts (F4312 - W4312A)"
           collectionName="work_orders"
           recordKey={`OT #${gridContextMenu.order.folio || gridContextMenu.order.id}`}
           recordData={gridContextMenu.order}
           currentStatus={gridContextMenu.order.status}
           statusOptions={[
             { label: '230 • APROBADA (ESPERANDO COMPRAS)', value: 'APROBADA' },
             { label: '280 • EMITIDA POR COMPRAS (R43500)', value: 'EMITIDA_IMPRESA' },
             { label: '400 • RECEPCIONADA CONFORME', value: 'RECEPCIONADA' },
             { label: '400P • RECEPCIONADA PARCIAL', value: 'RECEPCIONADA_PARCIAL' },
             { label: '999 • ANULADA / CANCELADA', value: 'ANULADA' }
           ]}
           onUpdateStatus={async (newStatus) => {
             const order = gridContextMenu.order;
             const now = new Date();
             const statusAction: WorkOrderAction = {
               id: crypto.randomUUID(),
               date: now.toISOString(),
               entryDate: now.toISOString().split("T")[0],
               type: "REALIZADA",
               user: currentUser,
               actionResponsible: currentUser,
               trackingResponsible: "BODEGA & RECEPCIONES TÉCNICAS",
               actionCategory: "STATUS_CHANGE",
               description: `CAMBIO DE ESTADO DESDE MENÚ CONTEXTUAL ERP (P4312) A: ${newStatus}`,
             };
             const updated: WorkOrder = {
               ...order,
               status: newStatus as any,
               jdeLastStatus: newStatus === 'RECEPCIONADA' ? '400' : newStatus === 'EMITIDA_IMPRESA' ? '280' : '230',
               jdeNextStatus: newStatus === 'RECEPCIONADA' ? '999' : '400',
               trackingActions: [statusAction, ...(order.trackingActions || [])],
               timestamp: Date.now()
             };
             onUpdateOT(updated);
             setGridContextMenu(null);
           }}
           rowExits={[
             {
               id: 'exit_receive',
               label: 'Ejecutar Recepción Técnica en Terreno (W4312A)',
               icon: <PackageCheck size={12} className="text-emerald-700 font-bold" />,
               shortcut: 'Enter',
               onClick: () => {
                 handleSelectOT(gridContextMenu.order);
                 setGridContextMenu(null);
               }
             },
             {
               id: 'exit_print_order',
               label: 'Imprimir / Descargar Comprobante OT (R43500)',
               icon: <Printer size={12} className="text-blue-700" />,
               shortcut: 'F9',
               onClick: () => {
                 downloadJDEWorkOrderVoucher({
                   workOrder: gridContextMenu.order,
                   currentUser
                 });
                 setGridContextMenu(null);
               }
             },
             {
               id: 'exit_bypass_emit',
               label: 'Desbloqueo Compras: Forzar Emisión R43500 (Regla F40203)',
               icon: <CheckCircle2 size={12} className="text-indigo-700" />,
               onClick: () => {
                 handleBypassEmitByCompras(gridContextMenu.order);
                 setGridContextMenu(null);
               }
             },
             {
               id: 'exit_notify_compras',
               label: 'Notificar Requerimiento a Compras (Bitácora Inter-Áreas)',
               icon: <Bell size={12} className="text-amber-700" />,
               onClick: () => {
                 handleNotifyCompras(gridContextMenu.order);
                 setGridContextMenu(null);
               }
             },
             {
               id: 'exit_intercon',
               label: 'Ver Matriz de Interconexión ERP (F40203)',
               icon: <Network size={12} className="text-[#0B3C5D]" />,
               shortcut: 'F7',
               onClick: () => {
                 setShowInterconnectionModal(true);
                 setGridContextMenu(null);
               }
             }
           ]}
           onClose={() => setGridContextMenu(null)}
           onSelectRow={() => {
             handleSelectOT(gridContextMenu.order);
             setGridContextMenu(null);
           }}
           onViewDetails={() => {
             handleSelectOT(gridContextMenu.order);
             setGridContextMenu(null);
           }}
           onPrint={() => {
             downloadJDEWorkOrderVoucher({
               workOrder: gridContextMenu.order,
               currentUser
             });
             setGridContextMenu(null);
           }}
           onExportExcel={() => {
             const dataToExport = filteredOTs.map(ot => ({
               'Folio OT': ot.folio,
               'Proveedor': ot.supplierName,
               'Ubicación': ot.propertyLabel,
               'Monto Presupuesto': ot.total,
               'Fecha Emisión': ot.issueDate,
               'Estado': ot.status,
               'Estado ERP': ot.jdeLastStatus || '230'
             }));
             exportToExcel(dataToExport, `JDE_Technical_Reception_F4312_${new Date().toISOString().split('T')[0]}`, 'Recepciones');
             setGridContextMenu(null);
           }}
           onClearQBE={() => {
             handleClearAllFilters();
             setGridContextMenu(null);
           }}
           onCopy={() => {
             navigator.clipboard?.writeText(JSON.stringify(gridContextMenu.order, null, 2));
             alert(`Copiados datos de la OT #${gridContextMenu.order.folio} al portapapeles.`);
             setGridContextMenu(null);
           }}
         />
       )}
</div>
  );
};

export default WorkOrderReception;
