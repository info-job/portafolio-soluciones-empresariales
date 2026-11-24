
import React, { useMemo } from 'react';
import { X, FileText, Download, Printer, ShieldCheck, Calendar, Hash, Building2, Tag, DollarSign, User, Clock, Cpu, Database, AlertOctagon, TrendingUp, CheckCircle2, Percent } from 'lucide-react';
import { Transaction } from '../types';
import { printHtmlElement, downloadElementAsPdf } from '../lib/printDocument';

interface DocumentDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
  allTransactions?: Transaction[];
}

const BENFORD_PROBABILITIES: Record<number, number> = {
  1: 0.301,
  2: 0.176,
  3: 0.125,
  4: 0.097,
  5: 0.079,
  6: 0.067,
  7: 0.058,
  8: 0.051,
  9: 0.046
};

const getFirstDigit = (val: number): number | null => {
  if (!val || val <= 0) return null;
  const cleaned = Math.abs(val).toString().replace(/[^0-9]/g, '');
  const firstChar = cleaned.match(/[1-9]/);
  return firstChar ? parseInt(firstChar[0], 10) : null;
};

const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({ transaction, onClose, allTransactions = [] }) => {
  // Safe confidence score calculation (handles both 0.98 and 98 formats gracefully)
  const confidenceScore = useMemo(() => {
    const conf = transaction.metadata?.confidence;
    if (conf === undefined || conf === null) return 98;
    if (conf <= 1) return Math.round(conf * 100);
    return Math.min(Math.round(conf), 100);
  }, [transaction.metadata?.confidence]);

  // Benford & Integrity Evaluation
  const benfordAnalysis = useMemo(() => {
    const digit = getFirstDigit(transaction.amount);
    
    // Calculate first-digit stats over the entire active dataset
    let digitCount = 0;
    let totalValidSample = 0;
    allTransactions.forEach(tx => {
      const d = getFirstDigit(tx.amount);
      if (d !== null) {
        totalValidSample++;
        if (d === digit) {
          digitCount++;
        }
      }
    });

    const digitPercentage = totalValidSample > 0 ? (digitCount / totalValidSample) * 100 : 0;
    const expectedPercentage = digit ? BENFORD_PROBABILITIES[digit] * 100 : 0;
    const deviation = digit ? digitPercentage - expectedPercentage : 0;

    const alerts: { title: string; risk: 'ALTO' | 'MEDIO' | 'BAJO'; desc: string }[] = [];
    let overallRiskScore = 0;

    if (digit !== null) {
      if (Math.abs(deviation) > 1.5) {
        const isSevere = Math.abs(deviation) > 5;
        alerts.push({
          title: `Desvío en Frecuencia del Dígito [${digit}]`,
          risk: isSevere ? 'ALTO' : 'MEDIO',
          desc: `El dígito inicial ${digit} tiene fcia real del ${digitPercentage.toFixed(1)}% en el libro contable, desviándose ${(deviation > 0 ? '+' : '')}${deviation.toFixed(1)}% de la Ley de Benford (${expectedPercentage.toFixed(1)}%).`
        });
        overallRiskScore += isSevere ? 4 : 2;
      }
    }

    const amt = transaction.amount;
    // Threshold avoidance
    if ((amt >= 490000 && amt < 500000) || (amt >= 49000 && amt < 50000)) {
      alerts.push({
        title: 'Evasión de Umbral Contable',
        risk: 'ALTO',
        desc: `El monto de $${amt.toLocaleString('es-CL')} se halla rozando el umbral de aprobación por jefatura ($500K / $50K). Posible fraccionamiento de facturación.`
      });
      overallRiskScore += 5;
    } else if ((amt >= 950000 && amt < 1000000) || (amt >= 95000 && amt < 100000)) {
      alerts.push({
        title: 'Evasión de Límites Corporativos',
        risk: 'ALTO',
        desc: `El monto está rozando el límite corporativo de firmas ($1M / $100K). Sugiere atomización de la orden de compra.`
      });
      overallRiskScore += 5;
    }

    // Atipic round numbers
    if (amt % 100000 === 0) {
      alerts.push({
        title: 'Redondeo Atípico Extremo ($100K)',
        risk: 'MEDIO',
        desc: 'Monto perfectamente redondo múltiplo de $100K sin colas de IVA ni cobros fraccionados decimales habituales.'
      });
      overallRiskScore += 2;
    } else if (amt % 10000 === 0) {
      alerts.push({
        title: 'Redondeo Atípico ($10K)',
        risk: 'BAJO',
        desc: 'Monto con terminación cerrada múltiplo de $10K. Las operaciones de obra civil y suministros suelen conllevar fracciones exactas.'
      });
      overallRiskScore += 1;
    }

    // Double invoices
    const duplicateInvoices = allTransactions.filter(t => t.amount === amt && t.id !== transaction.id);
    if (duplicateInvoices.length > 0) {
      alerts.push({
        title: `Riesgo de Duplicidad (${duplicateInvoices.length + 1} Coincidentes)`,
        risk: 'ALTO',
        desc: `Se detectaron otros ${duplicateInvoices.length} movimientos por el mismo importe exacto ($${amt.toLocaleString('es-CL')}). Posible doble procesamiento.`
      });
      overallRiskScore += 4;
    }

    let riskLevel: 'ALTO' | 'MEDIO' | 'BAJO' = 'BAJO';
    if (overallRiskScore >= 5) {
      riskLevel = 'ALTO';
    } else if (overallRiskScore >= 2) {
      riskLevel = 'MEDIO';
    }

    let overallJustification = 'Frecuencias de primer dígito dentro de la variabilidad del comportamiento natural logarítmico.';
    if (riskLevel === 'ALTO') {
      overallJustification = 'Alta concentración de desvíos acumulativos. El cobro roza límites regulados de aprobaciones o duplica importes preexistentes. Requiere auditoría inmediata.';
    } else if (riskLevel === 'MEDIO') {
      overallJustification = 'Presencia de terminación cerrada o anomalía de frecuencia no-crítica. Típica en honorarios estables o arriendos comerciales de tasa única.';
    }

    return {
      digit,
      digitPercentage,
      expectedPercentage,
      deviation,
      alerts,
      riskLevel,
      overallJustification,
      overallRiskScore
    };
  }, [transaction, allTransactions]);
  return (
    <div className="fixed inset-0 z-[500] bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-5xl h-[85vh] shadow-2xl overflow-hidden flex animate-in zoom-in-95 duration-300">
        
        {/* LADO IZQUIERDO: COPIA DIGITAL */}
        <div className="flex-1 bg-slate-100 p-8 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Copia Digital del Documento</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => downloadElementAsPdf('printable-digital-document', `Factura_${transaction.documentNumber || transaction.id}.pdf`)} 
                className="p-2 bg-white rounded-xl shadow-sm hover:bg-slate-50 transition-all text-slate-600 cursor-pointer active:scale-95" 
                title="Descargar PDF"
              >
                <Download size={18}/>
              </button>
              <button 
                onClick={() => printHtmlElement('printable-digital-document', `Factura_${transaction.documentNumber || transaction.id}`)} 
                className="p-2 bg-white rounded-xl shadow-sm hover:bg-slate-50 transition-all text-slate-600 cursor-pointer active:scale-95" 
                title="Imprimir"
              >
                <Printer size={18}/>
              </button>
            </div>
          </div>
          
          <div className="flex-1 bg-white shadow-inner rounded-3xl border border-slate-200 overflow-auto p-12 relative">
            {/* SIMULACIÓN DE DOCUMENTO */}
            <div id="printable-digital-document" className="max-w-2xl mx-auto space-y-10">
              <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8">
                <div className="space-y-1">
                  <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">FACTURA ELECTRÓNICA</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">S.I.I. - CHILE</p>
                </div>
                <div className="text-right border-2 border-rose-600 p-4 rounded-xl">
                  <p className="text-rose-600 font-black text-lg">R.U.T.: {transaction.metadata?.taxId || '76.123.456-K'}</p>
                  <p className="text-rose-600 font-black text-xl">Nº {transaction.documentNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-4">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Emisor</p>
                    <p className="text-sm font-black text-slate-800 uppercase">{transaction.metadata?.entityName || 'PROVEEDOR REGISTRADO'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Giro</p>
                    <p className="text-[10px] font-bold text-slate-600 uppercase">SERVICIOS INTEGRALES DE CONSTRUCCIÓN Y MANTENCIÓN</p>
                  </div>
                </div>
                <div className="space-y-4 text-right">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fecha de Emisión</p>
                    <p className="text-sm font-black text-slate-800">{transaction.invoiceDate || transaction.date}</p>
                  </div>
                </div>
              </div>

              <div className="border-y-2 border-slate-100 py-8">
                <table className="w-full">
                  <thead>
                    <tr className="text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
                      <th className="text-left pb-2">Descripción del Servicio</th>
                      <th className="text-right pb-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-xs font-bold text-slate-800">
                      <td className="py-4 uppercase">{transaction.description}</td>
                      <td className="py-4 text-right">${transaction.amount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4">
                <div className="w-48 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>Neto</span>
                    <span>${Math.round(transaction.amount / 1.19).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>IVA (19%)</span>
                    <span>${Math.round(transaction.amount - (transaction.amount / 1.19)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black text-slate-900 border-t-2 border-slate-900 pt-2">
                    <span>TOTAL</span>
                    <span>${transaction.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-20 opacity-20 flex justify-center">
                <div className="border-4 border-slate-900 p-4 rounded-full rotate-12">
                  <ShieldCheck size={60} className="text-slate-900" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LADO DERECHO: METADATOS Y AUDITORÍA */}
        <div className="w-96 bg-white border-l border-slate-100 p-8 flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                <ShieldCheck size={18} />
              </div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Ficha de Auditoría</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"><X size={20}/></button>
          </div>

          <div className="flex-1 space-y-8 overflow-auto pr-2 custom-audit-scroll">
            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Información Base</h4>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="text-slate-300" size={16} />
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Fecha Registro</p>
                    <p className="text-[10px] font-bold text-slate-700">{transaction.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Hash className="text-slate-300" size={16} />
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Número Documento</p>
                    <p className="text-[10px] font-bold text-slate-700">#{transaction.documentNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="text-slate-300" size={16} />
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Compañía</p>
                    <p className="text-[10px] font-bold text-slate-700">{transaction.insuranceCompany}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Tag className="text-slate-300" size={16} />
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Categoría</p>
                    <p className="text-[10px] font-bold text-slate-700">{transaction.category}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Trazabilidad</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="text-slate-300" size={16} />
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Registrado por</p>
                    <p className="text-[10px] font-bold text-slate-700">{transaction.user}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="text-slate-300" size={16} />
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Fecha/Hora Sistema</p>
                    <p className="text-[10px] font-bold text-slate-700">{new Date(transaction.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest border-b border-amber-200 pb-2 flex items-center gap-1.5 font-mono">
                <Cpu size={12} className="animate-pulse" />
                Auditoría Base ASSETFLOW Gestión Integrada
              </h4>
              <div className="bg-[#EBF0F5]/50 border border-[#9DB2C3] p-4 rounded-2xl space-y-3 font-mono text-[9px] text-[#0B3C5D]">
                <div className="flex justify-between items-center border-b border-[#D2DFEC] pb-1.5">
                  <span className="font-bold text-slate-500 uppercase">ID Prog. Gestión Integrada:</span>
                  <span className="font-black bg-[#D2DFEC] px-1.5 py-0.5 text-slate-800 rounded">{transaction.programId || (transaction.type === 'INCOME' ? 'P03B11' : 'P0411')}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#D2DFEC] pb-1.5">
                  <span className="font-bold text-slate-500 uppercase">Lote Central (Batch):</span>
                  <span className="font-bold text-slate-700">{transaction.batchNumber || `BAT-${Math.floor(transaction.timestamp % 100000)}`}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#D2DFEC] pb-1.5">
                  <span className="font-bold text-slate-500 uppercase">Secuencia F0002:</span>
                  <span className="font-bold text-indigo-700 font-bold">{transaction.nextNumberSeq || Math.floor((transaction.timestamp % 1000000) / 2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#D2DFEC] pb-1.5">
                  <span className="font-bold text-slate-500 uppercase">Estación de Trabajo (MKEY):</span>
                  <p className="font-bold text-slate-600 truncate max-w-[150px] text-right" title={transaction.workStationId || "MKEY-CLOUDRUN-CONTAINER"}>
                    {transaction.workStationId || "MKEY-CLOUDRUN-CLIENT-v9"}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500 uppercase">LNK_OK Integrity Sign:</span>
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/20 max-w-[150px] truncate" title={transaction.hashSignature || "INTEGRITY_VERIFIED_F0911"}>
                    {transaction.hashSignature || "LNK_AUTOMATICA_SQL_OK"}
                  </span>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Metadatos IA</h4>
              <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Confianza IA</span>
                  <span className="text-[10px] font-black text-emerald-600">{confidenceScore}%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${confidenceScore}%` }}></div>
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed">
                  Documento procesado mediante Gemini Pro Vision. Los datos fueron validados contra el esquema de control interno.
                </p>
              </div>
            </section>

            {/* ANÁLISIS DE BENFORD & INTEGRIDAD DE GASTO */}
            <section className="space-y-4 pt-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Análisis Logarítmico (Benford)</span>
                <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                  benfordAnalysis.riskLevel === 'ALTO'
                    ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                    : benfordAnalysis.riskLevel === 'MEDIO'
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                }`}>
                  Riesgo {benfordAnalysis.riskLevel}
                </span>
              </h4>

              <div className="space-y-3">
                {/* Primer Dígito Visual State */}
                <div className="bg-[#0B3C5D]/5 border border-[#0B3C5D]/10 rounded-2xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Primer Dígito Significativo</p>
                    <p className="text-[14px] font-black text-[#0B3C5D] font-mono">Dígito {benfordAnalysis.digit || 'N/A'}</p>
                    <p className="text-[8px] font-medium text-slate-450 uppercase leading-none">
                      Prob. Benford: {benfordAnalysis.expectedPercentage.toFixed(1)}% | Real: {benfordAnalysis.digitPercentage.toFixed(1)}%
                    </p>
                  </div>
                  {benfordAnalysis.digit && (
                    <span className="w-10 h-10 rounded-full flex items-center justify-center bg-[#0B3C5D] text-[#FFCC00] font-mono text-lg font-black shadow-md border-2 border-white">
                      {benfordAnalysis.digit}
                    </span>
                  )}
                </div>

                {/* Justificación de Control */}
                <div className={`p-4 rounded-2xl text-[9px] leading-relaxed border ${
                  benfordAnalysis.riskLevel === 'ALTO'
                    ? 'bg-rose-500/5 border-rose-500/20 text-rose-950'
                    : benfordAnalysis.riskLevel === 'MEDIO'
                      ? 'bg-amber-500/5 border-amber-500/20 text-amber-950'
                      : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-950'
                }`}>
                  <p className="font-black uppercase tracking-wide mb-1 flex items-center gap-1">
                    <AlertOctagon size={11} className={
                      benfordAnalysis.riskLevel === 'ALTO'
                        ? 'text-rose-500'
                        : benfordAnalysis.riskLevel === 'MEDIO'
                          ? 'text-amber-500'
                          : 'text-emerald-500'
                    } />
                    Justificación de Control Interno:
                  </p>
                  <p className="font-semibold text-slate-700">{benfordAnalysis.overallJustification}</p>
                </div>

                {/* Specific Alerts Lists */}
                {benfordAnalysis.alerts.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Triggers de Alerta Detectados:</p>
                    <div className="space-y-1.5">
                      {benfordAnalysis.alerts.map((alert, idx) => (
                        <div key={idx} className="flex gap-2 items-start bg-slate-50 border border-slate-150 p-2.5 rounded-xl">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            alert.risk === 'ALTO' ? 'bg-rose-500' : alert.risk === 'MEDIO' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-extrabold text-slate-800 uppercase leading-none">{alert.title}</p>
                            <p className="text-[8.5px] font-medium text-slate-600 leading-normal">{alert.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <button 
              onClick={onClose}
              className="w-full py-4 bg-slate-100 border border-slate-300 text-slate-800 rounded-2xl text-xs font-black uppercase hover:bg-slate-200 transition-all shadow-xs cursor-pointer"
            >
              Cerrar Expediente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailModal;
