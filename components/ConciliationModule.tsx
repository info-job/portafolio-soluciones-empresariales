
import React, { useState, useMemo } from 'react';
import { Transaction, InsuranceCompany } from '../types';
import { useResizableColumns } from '../lib/useResizableColumns';
import { FileUp, Scale, CheckCircle2, AlertTriangle, Printer, ArrowLeft, Building2, Search, Zap, Loader2 } from 'lucide-react';
import { printHtmlElement } from '../lib/printDocument';
import { GridDimensionControls } from './common/GridDimensionControls';
import { JDEGridContextMenu } from './JDEGridContextMenu';

interface BankRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
}

const ConciliationModule: React.FC<{ transactions: Transaction[], companyLogo: string | null }> = ({ transactions, companyLogo }) => {
  const [selectedCompany, setSelectedCompany] = useState<InsuranceCompany>('VIDA');
  const [bankRecords, setBankRecords] = useState<BankRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [gridContextMenu, setGridContextMenu] = useState<{ x: number; y: number; tx: Transaction } | null>(null);

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
      estado: 150,
      fecha: 128,
      concepto: 400,
      montoLibro: 150,
      montoBanco: 150
    },
    initialRowHeight: 48,
    storageKey: 'conciliation_module'
  });

  // Datos internos filtrados por compañía
  const internalRecords = useMemo(() => 
    transactions.filter(t => t.insuranceCompany === selectedCompany),
    [transactions, selectedCompany]
  );

  const totalInternal = internalRecords.reduce((sum, t) => sum + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
  const totalBank = bankRecords.reduce((sum, r) => sum + r.amount, 0);

  const handleSimulateUpload = () => {
    setIsProcessing(true);
    // Simulación de carga de cartola bancaria con algunos desajustes para el ejemplo
    setTimeout(() => {
      const simulated: BankRecord[] = internalRecords.slice(0, 5).map(t => ({
        id: crypto.randomUUID(),
        date: t.date,
        description: `CARGO BANCARIO - ${t.description}`,
        amount: t.type === 'INCOME' ? t.amount : -t.amount
      }));
      
      // Agregamos un registro que no existe en el sistema para forzar la discrepancia
      simulated.push({
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        description: "MANTENCION CUENTA BANCO",
        amount: -15000
      });

      setBankRecords(simulated);
      setIsProcessing(false);
    }, 1500);
  };

  const getMatchStatus = (amount: number) => {
    const found = bankRecords.some(r => r.amount === amount || r.amount === -amount);
    return found;
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
      {/* HEADER DEL MÓDULO */}
      <div className="bg-white border-b border-slate-200 px-10 py-6 flex justify-between items-center no-print">
         <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600 text-white rounded-3xl shadow-xl">
               <Scale size={28} />
            </div>
            <div>
               <h2 className="text-2xl font-black uppercase tracking-tighter">Conciliación Bancaria</h2>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cuadratura Maestra vs Cartola Bancaria</p>
            </div>
         </div>

         <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
               <button 
                  onClick={() => setSelectedCompany('VIDA')} 
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedCompany === 'VIDA' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
               >VIDA</button>
               <button 
                  onClick={() => setSelectedCompany('GENERALES')} 
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedCompany === 'GENERALES' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
               >GENERALES</button>
            </div>
            <button 
              onClick={() => setIsPreviewOpen(true)}
              className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase flex items-center gap-3 hover:bg-black transition-all shadow-lg"
            >
               <Printer size={18} /> Informe de Cuadratura
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-auto p-10 space-y-8">
        {/* PANEL DE ACCIÓN Y RESUMEN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center">
                 <FileUp size={32} />
              </div>
              <h3 className="font-black text-slate-800 uppercase text-xs">Cargar Cartola Bancaria</h3>
              <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed">Arrastre el archivo Excel/CSV del banco para iniciar el cruce inteligente.</p>
              <button 
                onClick={handleSimulateUpload}
                disabled={isProcessing}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Zap size={18}/>}
                Procesar Cartola
              </button>
           </div>

           <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Libro (Sistema)</span>
                 <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Building2 size={16}/></div>
              </div>
              <p className="text-3xl font-black text-slate-900">${totalInternal.toLocaleString('es-ES')}</p>
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
                 <CheckCircle2 size={14} className="text-emerald-500" />
                 <span className="text-[9px] font-bold text-slate-500 uppercase">{internalRecords.length} Operaciones Registradas</span>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diferencia de Cuadratura</span>
                 <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><AlertTriangle size={16}/></div>
              </div>
              <p className={`text-3xl font-black ${Math.abs(totalInternal - totalBank) === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ${(totalInternal - totalBank).toLocaleString('es-ES')}
              </p>
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
                 <span className="text-[9px] font-bold text-slate-500 uppercase italic">Requiere ajuste contable manual</span>
              </div>
           </div>
        </div>

        {/* TABLA DE CONCILIACIÓN */}
        <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
           <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                 <Search size={18} className="text-blue-600" /> Detalle de Cruce - SEGUROS {selectedCompany}
              </h3>
              <div className="flex items-center gap-3">
                 <GridDimensionControls
                    defaultRowHeight={defaultRowHeight}
                    onSetRowHeight={setDefaultRowHeight}
                    onResetColumns={resetWidths}
                    onResetRows={resetHeights}
                    onResetAll={resetAll}
                 />
                 <div className="text-[10px] font-black bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full uppercase">
                    Estado: {bankRecords.length > 0 ? 'Cartola Analizada' : 'Esperando Cartola'}
                 </div>
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                 <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                       <th style={{ width: widths.estado }} className="relative px-8 py-4 text-[10px] font-black text-slate-400 uppercase border border-black">
                          Estado
                          <div onMouseDown={(e) => onMouseDown(e, 'estado')} className="resizer" />
                       </th>
                       <th style={{ width: widths.fecha }} className="relative px-8 py-4 text-[10px] font-black text-slate-400 uppercase border border-black">
                          Fecha
                          <div onMouseDown={(e) => onMouseDown(e, 'fecha')} className="resizer" />
                       </th>
                       <th style={{ width: widths.concepto }} className="relative px-8 py-4 text-[10px] font-black text-slate-400 uppercase border border-black">
                          Concepto Planilla
                          <div onMouseDown={(e) => onMouseDown(e, 'concepto')} className="resizer" />
                       </th>
                       <th style={{ width: widths.montoLibro }} className="relative px-8 py-4 text-[10px] font-black text-slate-400 uppercase text-right border border-black">
                          Monto Libro
                          <div onMouseDown={(e) => onMouseDown(e, 'montoLibro')} className="resizer" />
                       </th>
                       <th style={{ width: widths.montoBanco }} className="relative px-8 py-4 text-[10px] font-black text-slate-400 uppercase text-right border border-black">
                          Monto Banco
                          <div onMouseDown={(e) => onMouseDown(e, 'montoBanco')} className="resizer" />
                       </th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {internalRecords.map(t => {
                      const isMatched = getMatchStatus(t.amount);
                      return (
                        <tr 
                           key={t.id} 
                           style={{ height: `${getRowHeight(t.id)}px` }}
                           onContextMenu={(e) => {
                              e.preventDefault();
                              setGridContextMenu({ x: e.clientX, y: e.clientY, tx: t });
                           }}
                           className="hover:bg-slate-50/50 group transition-all cursor-context-menu"
                        >
                           <td className="relative px-8 py-4 border border-black">
                              <div
                                 onMouseDown={(e) => onRowMouseDown(e, t.id)}
                                 onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    onRowDoubleClick(t.id);
                                 }}
                                 className="row-resizer"
                                 title="Arrastrar para cambiar alto de fila (Shift para todas). Doble clic para restablecer."
                              />
                              {isMatched ? (
                                <div className="flex items-center gap-2 text-emerald-600">
                                   <CheckCircle2 size={16} />
                                   <span className="text-[9px] font-black uppercase">Conciliado</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-rose-500">
                                   <AlertTriangle size={16} />
                                   <span className="text-[9px] font-black uppercase">No en Cartola</span>
                                </div>
                              )}
                           </td>
                           <td className="px-8 py-4 text-[10px] font-mono font-bold text-slate-500 border border-black">{t.date}</td>
                           <td className="px-8 py-4 text-[11px] font-black text-slate-800 uppercase border border-black truncate">{t.description}</td>
                           <td className="px-8 py-4 text-right text-xs font-black text-slate-900 border border-black">
                              ${(t.type === 'INCOME' ? t.amount : -t.amount).toLocaleString('es-ES')}
                           </td>
                           <td className="px-8 py-4 text-right text-xs font-black font-mono text-slate-400 border border-black">
                              {isMatched ? `$${(t.type === 'INCOME' ? t.amount : -t.amount).toLocaleString('es-ES')}` : '---'}
                           </td>
                        </tr>
                      )
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* REPORTE DE CONCILIACIÓN PDF */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-100 flex flex-col no-print">
            <div className="h-24 bg-white border-b border-slate-200 px-10 flex items-center justify-between shadow-xs z-20">
                <button onClick={() => setIsPreviewOpen(false)} className="flex items-center gap-3 px-6 py-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl border border-slate-300 font-black text-xs uppercase cursor-pointer"><ArrowLeft size={18} /> Volver</button>
                <button onClick={() => printHtmlElement("printable-report", `Acta_Conciliacion_${selectedCompany}`)} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase flex items-center gap-4 hover:bg-blue-700 active:scale-95 transition-all shadow-md cursor-pointer"><Printer size={22} /> Imprimir Acta</button>
            </div>
            <div className="flex-1 overflow-auto p-12 bg-slate-200 flex justify-center custom-audit-scroll">
                <div id="printable-report" className="bg-white w-[216mm] min-h-[279mm] shadow-2xl p-[1.5cm] flex flex-col text-black font-sans relative my-10 animate-in zoom-in-95">
                    <div className="flex justify-between items-start border-b-[4px] border-black pb-8 mb-10">
                        <div className="flex items-center gap-6">
                            {companyLogo ? (
                              <img src={companyLogo} className="w-24 h-24 object-contain" alt="Logo Empresa" />
                            ) : (
                              <div className="w-20 h-20 bg-blue-900 text-white rounded-3xl flex items-center justify-center font-black text-4xl shadow-lg">CON</div>
                            )}
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1 text-slate-900">Acta de Conciliación Bancaria</h1>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entidad: Seguros {selectedCompany} • Depto Inmobiliario</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-black uppercase tracking-tighter">Cristian Muñoz</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Control Interno Depto Inmobiliario</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-10">
                       <div className="bg-slate-50 p-6 border-l-4 border-blue-600">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Saldo Final Libro</p>
                          <p className="text-2xl font-black text-black">${totalInternal.toLocaleString('es-ES')}</p>
                       </div>
                       <div className="bg-slate-50 p-6 border-l-4 border-black">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Diferencia Determinada</p>
                          <p className="text-2xl font-black text-rose-600">${(totalInternal - totalBank).toLocaleString('es-ES')}</p>
                       </div>
                    </div>

                    <div className="flex-1">
                       <h3 className="text-sm font-black uppercase border-b-2 border-black pb-2 mb-4">Detalle de Partidas No Conciliadas</h3>
                       <table className="w-full text-left">
                          <thead>
                             <tr className="bg-slate-100">
                                <th className="p-3 text-[10px] font-black uppercase">Fecha</th>
                                <th className="p-3 text-[10px] font-black uppercase">Descripción del Sistema</th>
                                <th className="p-3 text-[10px] font-black uppercase text-right">Monto Diferencia</th>
                             </tr>
                          </thead>
                          <tbody>
                             {internalRecords.filter(t => !getMatchStatus(t.amount)).map(t => (
                                <tr key={`print-diff-${t.id}`} className="border-b border-slate-100 italic">
                                   <td className="p-3 text-[10px] font-mono">{t.date}</td>
                                   <td className="p-3 text-[10px] uppercase">{t.description}</td>
                                   <td className="p-3 text-right text-[10px] font-black">${t.amount.toLocaleString('es-ES')}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>

                    <div className="mt-16 flex justify-between items-end border-t border-slate-200 pt-10">
                        <div className="text-[8px] font-mono text-slate-400">Certificación de Saldo Real • ID: {crypto.randomUUID().toUpperCase()}</div>
                        <div className="w-80 text-center border-t-2 border-black pt-4">
                            <p className="text-xs font-black uppercase text-black">Cristian Muñoz</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Control Interno Depto Inmobiliario</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* ERP CONTEXT MENU */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={!!gridContextMenu}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P09131"
          programTitle="Conciliación Bancaria Automática"
          collectionName="transactions"
          recordId={gridContextMenu.tx.id}
          recordFolio={gridContextMenu.tx.description || gridContextMenu.tx.id}
          onClose={() => setGridContextMenu(null)}
          onSetRowHeight={setDefaultRowHeight}
          onResetColumns={resetWidths}
          onResetRows={resetHeights}
          onResetGridDimensions={resetAll}
        />
      )}
    </div>
  );
};

export default ConciliationModule;
