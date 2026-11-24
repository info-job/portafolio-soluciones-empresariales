import React, { useState, useEffect } from 'react';
import { 
  X, Printer, ShieldCheck, BookOpen, Search, Presentation, 
  Target, Cpu, Shield, FileDown, RefreshCw, AlertCircle, 
  CheckCircle2, Info, ChevronRight, LayoutDashboard, Database, 
  Lock, ArrowRight, Upload, HelpCircle, FileSpreadsheet, FileText, 
  Sliders, AlertTriangle, Sparkles, CheckSquare, Eye, Play,
  Camera, Monitor, MousePointer, Briefcase, GitFork
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { printHtmlElement } from '../lib/printDocument';
import { JobSearchManualModal } from './JobSearchManualModal';
import { VisioFlowchartsModule } from './VisioFlowchartsModule';

const ERROR_GLOSSARY = [
  { code: 'ERR-VAL-001', category: 'VALIDACIÓN', title: 'RUT INVÁLIDO CONTABLE', risk: 'MEDIO', solution: 'Ingrese el RUT sin puntos, sin espacios y con guión. Ejemplo: 12345678-K. Si pones puntos, la grilla de la gestión integrada se descuadrará.' },
  { code: 'ERR-VAL-002', category: 'VALIDACIÓN', title: 'FORMATO FECHA ERRÓNEO', risk: 'ALTO', solution: 'El sistema espera formato internacional AAAA-MM-DD. Si colocas barras o puntos, el sistema lo corregirá automáticamente si es posible, de lo contrario se bloqueará en rojo.' },
  { code: 'ERR-FIN-101', category: 'FINANZAS', title: 'MONTO EXCESIVO / COMPLIANCE ALTO (> $1,000,000)', risk: 'CRÍTICO', solution: 'Gasto catalogado por arriba de un millón. Se activa un bloqueo preventivo que requiere el V°B° manual de la Jefatura con Firma Digital en el Panel de Tareas.' },
  { code: 'ERR-SUP-201', category: 'COMPRAS', title: 'PROVEEDOR BLOQUEADO / NO AUTORIZADO', risk: 'CRÍTICO', solution: 'El emisor de la factura está en Lista Negra o no está homologado en el Maestro Corporativo P04012. Solicite el alta con toda su documentación UAF lista.' },
  { code: 'ERR-IA-501', category: 'SISTEMA IA', title: 'FALLO DE CLASIFICACIÓN COGNITIVA', risk: 'BAJO', solution: 'La inteligencia artificial no entendió la boleta debido a letras borrosas. El usuario simplemente debe abrir el combo y seleccionar la categoría general.' },
  { code: 'ERR-APR-707', category: 'APROBACIONES P43081', title: 'CHECKLIST 7 PUNTOS W43081C INCOMPLETO / CONFLICTO SoD', risk: 'ALTO', solution: 'Para liberar una OT/OC en P43081 debe completar la auditoría de 7 puntos (umbral P43008, presupuesto CC, RUT proveedor, cálculo IVA 19% / Retención 15,25%, SoD, alcance técnico y sello SHA-256).' },
  { code: 'ERR-BLK-409', category: 'BLOCKCHAIN F4209', title: 'RUPTURA CRIPTOGRÁFICA SHA-256 EN CADENA F4209', risk: 'CRÍTICO', solution: 'El motor Web Crypto API detectó discrepancia entre el hash almacenado y el recalculado. Bajo gobernanza Append-Only está prohibido re-sellar bloques históricos; emita un Bloque de Contra-Asiento (Reversal Block).' },
  { code: 'ERR-SEC-901', category: 'SEGURIDAD IP', title: 'ACCESO DENEGADO / NO PERMITIDO', risk: 'CRÍTICO', solution: 'Intento de ingresar a la consola de control o modificar auditorías sin el rol de Administrador. Su estación e IP quedarán grabadas en el R097001.' },
  { code: 'ERR-CON-301', category: 'CATASTRO P1501', title: 'CONDOMINIO O UNIDAD NO HOMOLOGADA EN MAESTRO', risk: 'MEDIO', solution: 'La propiedad ingresada no existe en el catálogo maestro. Abra el Asistente de Consulta de Propiedades, utilice la función Drill-Down para ubicar la unidad o seleccione [Crear/Editar Unidad] para darla de alta formalmente.' },
  { code: 'ERR-NET-802', category: 'INFRAESTRUCTURA', title: 'PÉRDIDA DE ENLACE EXTERNO / MODO RESILIENTE LOCAL-FIRST', risk: 'BAJO', solution: 'El servidor local opera con normalidad en la red LAN. Las transacciones, órdenes de trabajo y sellos SHA-256 se guardan en IndexedDB local y se encolan para sincronización diferida automática al restablecerse Internet.' }
];

interface ManualModalProps {
  onClose: () => void;
  initialTab?: 'GUIA' | 'DICCIONARIO' | 'PRESENTACION' | 'ARRENDATARIO' | 'DIAGRAMAS_VISIO';
}

const ManualModal: React.FC<ManualModalProps> = ({ onClose, initialTab = 'GUIA' }) => {
  const [activeTab, setActiveTab] = useState<'GUIA' | 'DICCIONARIO' | 'PRESENTACION' | 'ARRENDATARIO' | 'DIAGRAMAS_VISIO'>(initialTab);
  const [activeScreenshot, setActiveScreenshot] = useState<number>(1);
  const [showJobSearchManual, setShowJobSearchManual] = useState<boolean>(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handlePrint = () => {
    printHtmlElement('printable-report', 'Manual_Usuario_AssetFlow');
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Helper Drawing Utilities
      const drawPageHeader = (programCode = 'P0000A') => {
        doc.setFillColor(11, 60, 93);
        doc.rect(0, 0, 210, 18, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('MANUAL DE ENTRENAMIENTO DIDÁCTICO - SISTEMA ASSETFLOW', 15, 11);
        doc.setTextColor(255, 204, 0);
        doc.text(`PROGRAMA: ${programCode}`, 195, 11, { align: 'right' });
      };

      const drawPageFooter = (pageNum: number, totalPages = 6) => {
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);
        doc.line(15, 280, 195, 280);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(8);
        doc.text('ASSETFLOW GESTIÓN INTEGRADA • SEC_CODE: MUTU_PRD_XE_2026', 15, 286);
        doc.text(`Página ${pageNum} de ${totalPages}`, 195, 286, { align: 'right' });
      };

      const drawMockBrowserFrame = (
        y: number,
        title: string,
        url: string,
        badgeText: string,
        badgeBg: [number, number, number],
        height = 40
      ) => {
        // Outer Container Box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.4);
        doc.roundedRect(15, y, 180, height, 2, 2, 'FD');

        // Title Bar Header
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(15, y, 180, 7, 2, 2, 'F');
        doc.rect(15, y + 5, 180, 2, 'F'); // flatten bottom

        // Window buttons (red, yellow, green)
        doc.setFillColor(239, 68, 68); doc.circle(18, y + 3.5, 0.8, 'F');
        doc.setFillColor(245, 158, 11); doc.circle(21, y + 3.5, 0.8, 'F');
        doc.setFillColor(34, 197, 94); doc.circle(24, y + 3.5, 0.8, 'F');

        // Window Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(title, 27, y + 4.8);

        // URL Box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(82, y + 1.2, 68, 4.5, 1, 1, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(16, 185, 129);
        doc.text('🔒 Secure | ', 84, y + 4.2);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(url, 96, y + 4.2);

        // Badge Top Right
        doc.setFillColor(...badgeBg);
        doc.roundedRect(154, y + 1.2, 38, 4.5, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(255, 255, 255);
        doc.text(badgeText, 173, y + 4.2, { align: 'center' });
      };

      const drawStepBox = (
        y: number,
        title: string,
        steps: { num: string; text: string }[],
        ruleText: string,
        boxBg: [number, number, number] = [248, 250, 252],
        borderBg: [number, number, number] = [226, 232, 240]
      ) => {
        doc.setFillColor(...boxBg);
        doc.setDrawColor(...borderBg);
        doc.setLineWidth(0.3);
        doc.roundedRect(15, y, 180, 42, 2, 2, 'FD');

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(11, 60, 93);
        doc.text(title, 19, y + 5.5);

        // Steps
        let currentY = y + 11.5;
        steps.forEach((st) => {
          // Number circle badge
          doc.setFillColor(11, 60, 93);
          doc.circle(22, currentY - 1, 2, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(255, 204, 0);
          doc.text(st.num, 22, currentY, { align: 'center' });

          // Step text
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);
          const splitStep = doc.splitTextToSize(st.text, 160);
          doc.text(splitStep, 26, currentY);
          currentY += splitStep.length * 3.5 + 1.5;
        });

        // Rule Callout
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(254, 202, 202);
        doc.roundedRect(19, y + 31.5, 172, 7.5, 1, 1, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(185, 28, 28);
        doc.text('⚠ REGLA INMUTABLE:', 22, y + 36.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(127, 29, 29);
        const splitRule = doc.splitTextToSize(ruleText, 138);
        doc.text(splitRule[0] || '', 50, y + 36.5);
      };

      // ==========================================
      // PAGE 1: COVER PAGE
      // ==========================================
      doc.setFillColor(11, 60, 93); // ERP Blue / ERP Slate
      doc.rect(0, 0, 210, 297, 'F');

      // Decorative vector frame
      doc.setDrawColor(255, 204, 0); // Gold yellow border
      doc.setLineWidth(1);
      doc.rect(8, 8, 194, 281, 'S');

      // Cover Texts
      doc.setTextColor(255, 204, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('ASSETFLOW GESTIÓN INTEGRADA INTEGRATED SYSTEMS • DIVISION DE ACTIVO INMOBILIARIO', 105, 50, { align: 'center' });

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.text('MANUAL DE ENTRENAMIENTO', 105, 95, { align: 'center' });
      doc.setFontSize(24);
      doc.text('DEL SISTEMA ASSETFLOW', 105, 110, { align: 'center' });
      
      doc.setFillColor(255, 204, 0);
      doc.rect(45, 120, 120, 1.5, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(226, 232, 240);
      doc.text('Guía Visual Didáctica Paso a Paso Para Todo el Personal (Sin Conocimientos Previos)', 105, 132, { align: 'center' });

      doc.setFontSize(9.5);
      doc.setTextColor(148, 163, 184);
      const textIntroPdf = 'Este instructivo está redactado con un estándar didáctico de extrema simpleza, incluyendo capturas de pantalla, diagramas interactivos, llamadas numeradas de acción (1, 2, 3), reglas inquebrantables de validación y el glosario completo anti-errores.';
      doc.text(doc.splitTextToSize(textIntroPdf, 150), 105, 150, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 204, 0);
      doc.setFontSize(11);
      doc.text('SISTEMA INTEGRAL DE COMPLIANCE Y GESTIÓN CORPORATIVA v2.5', 105, 225, { align: 'center' });
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('REMITIDO POR: CONTROL INTERNO & DEPARTAMENTO TI', 105, 235, { align: 'center' });
      doc.text('ÚLTIMA ACTUALIZACIÓN: 10 DE JULIO, 2026 (v2.5)', 105, 245, { align: 'center' });

      // ==========================================
      // PAGE 2: GUÍA VISUAL - CAPTURAS 1 & 2
      // ==========================================
      doc.addPage();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 297, 'F');
      drawPageHeader('P0000A');

      // Section Title 1
      doc.setTextColor(11, 60, 93);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('1. PROCESO DE CARGA INTELIGENTE DE EXCEL (R15011Z1I)', 15, 25);

      // Screenshot 1 Mockup
      drawMockBrowserFrame(28, 'CARGA EXCEL ERP - R15011Z1I', 'assetflow.inmobiliariapro.cl/jde/R15011Z1I_excel_upload', '📸 CAPTURA 1', [11, 60, 93], 38);
      
      // Mockup 1 Internal Layout
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(19, 37, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(11, 60, 93);
      doc.text('[1] ZONA DE ARRASTRE', 21, 42);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(100, 116, 139);
      doc.text('Soltar archivo Excel (.xlsx / .csv)\ndetección directa de planillas.', 21, 47);

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(75, 37, 60, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(79, 70, 229);
      doc.text('[2] MAPEO DE COLUMNAS', 77, 42);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(100, 116, 139);
      doc.text('Rol: ✓ MAPEADO  |  Comuna: ✓ MAPEADO\nDirección: ✓ MAPEADO  |  Valor: ✓ MAPEADO', 77, 47);

      doc.setFillColor(238, 242, 255);
      doc.setDrawColor(199, 210, 254);
      doc.roundedRect(139, 37, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(16, 185, 129);
      doc.text('[3] CONSOLIDACIÓN', 141, 42);
      doc.setFillColor(11, 60, 93);
      doc.roundedRect(141, 47, 48, 12, 1, 1, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(255, 204, 0);
      doc.text('PROCESAR Y GUARDAR', 165, 54, { align: 'center' });

      // Step Box 1
      drawStepBox(
        68,
        'PASOS Y DIRECTRICES DEL PROCESO DE CARGA EXCEL:',
        [
          { num: '1', text: 'Paso 1 (Carga): Arrastre la planilla Excel (.xlsx o .csv) a la Zona de Detección (1).' },
          { num: '2', text: 'Paso 2 (Mapeo): Verifique que los campos obligatorios muestren el estado "✓ MAPEADO" (2).' },
          { num: '3', text: 'Paso 3 (Consolidación): Presione "PROCESAR Y GUARDAR" (3) para cargar a Firebase/ERP.' }
        ],
        'Evitar celdas en blanco en el Rol. La ausencia de Rol genera la falla bloqueante ERR-VAL-001.'
      );

      // Section Title 2
      doc.setTextColor(11, 60, 93);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('2. MAESTRO DE PROVEEDORES & COMPLIANCE UAF (P04012)', 15, 116);

      // Screenshot 2 Mockup
      drawMockBrowserFrame(119, 'PROVEEDORES COMPLIANCE - P04012', 'assetflow.inmobiliariapro.cl/jde/P04012_supplier_compliance', '📸 CAPTURA 2', [16, 185, 129], 38);

      // Mockup 2 Internal Layout
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(19, 128, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(15, 23, 42);
      doc.text('[1] FICHA CONTABLE', 21, 133);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(100, 116, 139);
      doc.text('Constructora Maestro Ltda.\nRUT: 76.124.908-4 (SII ✓)', 21, 138);

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(75, 128, 60, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(220, 38, 38);
      doc.text('[2] SEMÁFORO COMPLIANCE UAF', 77, 133);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(100, 116, 139);
      doc.text('1. DJ Beneficiarios Finales: ✓ OK\n2. No Parentesco / Conflicto: ✓ OK\n3. Cédula Rep. Legal: ✗ FALTA', 77, 138);

      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      doc.roundedRect(139, 128, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(185, 28, 28);
      doc.text('[3] BLOQUEO SEGURIDAD', 141, 133);
      doc.setFillColor(203, 213, 225);
      doc.roundedRect(141, 138, 48, 12, 1, 1, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(100, 116, 139);
      doc.text('🔒 APROBACIÓN RESTRINGIDA', 165, 145, { align: 'center' });

      // Step Box 2
      drawStepBox(
        159,
        'PASOS Y DIRECTRICES DE COMPLIANCE DE PROVEEDORES:',
        [
          { num: '1', text: 'Paso 1 (Contraste): Ingrese Rut y Razón Social; el sistema corrobora datos con el SII (1).' },
          { num: '2', text: 'Paso 2 (Semáforo): Verifique la carpeta UAF. Todos los ítems deben estar en "✓ OK" (2).' },
          { num: '3', text: 'Paso 3 (Bloqueo): Si falta algún documento (ej. Cédula), la aprobación permanece bloqueada (3).' }
        ],
        'Obligatorio adjuntar la Declaración Jurada UAF notarial para desbloquear aprobaciones de pago.'
      );

      drawPageFooter(2);

      // ==========================================
      // PAGE 3: GUÍA VISUAL - CAPTURAS 3 & 4
      // ==========================================
      doc.addPage();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 297, 'F');
      drawPageHeader('P0000A');

      // Section Title 3
      doc.setTextColor(11, 60, 93);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('3. CAJA CHICA Y AUDITORÍA DE BOLETAS CON IA (P0002M)', 15, 25);

      // Screenshot 3 Mockup
      drawMockBrowserFrame(28, 'INGESTA INTELIGENTE CAJA CHICA - P0002M', 'assetflow.inmobiliariapro.cl/jde/P0002M_ai_expense_detector', '📸 CAPTURA 3', [245, 158, 11], 38);

      // Mockup 3 Internal Layout
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(19, 37, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(217, 119, 6);
      doc.text('[1] COMPROBANTE ORIGINAL', 21, 42);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(100, 116, 139);
      doc.text('Restaurante El Lomo Azul\nRUT: 76.531.029-4 | Total: $14.500\nPrecisión OCR: 98.7%', 21, 47);

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(75, 37, 60, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(79, 70, 229);
      doc.text('[2] EXTRACTION COGNITIVA', 77, 42);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(100, 116, 139);
      doc.text('RUT Emisor: 76531029-4 (Auto)\nMonto Total: $14.500 (Auto)', 77, 47);

      doc.setFillColor(238, 242, 255);
      doc.roundedRect(139, 37, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(16, 185, 129);
      doc.text('[3] IMPUTACIÓN CONTABLE', 141, 42);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(67, 56, 202);
      doc.text('💼 GASTOS GENERALES\nALIMENTACIÓN (R502)', 141, 48);

      // Step Box 3
      drawStepBox(
        68,
        'PASOS Y DIRECTRICES DE RENDICIÓN DE CAJA CHICA CON IA:',
        [
          { num: '1', text: 'Paso 1 (Carga): Cargue la foto o PDF del comprobante de egreso en el lector OCR (1).' },
          { num: '2', text: 'Paso 2 (Lectura): Confirme que la IA haya extraído el RUT y Monto ($) sin errores (2).' },
          { num: '3', text: 'Paso 3 (Imputación): Confirme la cuenta contable de destino sugerida y rinda los fondos (3).' }
        ],
        'Exigir siempre imágenes 100% legibles. Comprobantes borrosos o cortados serán rechazados.'
      );

      // Section Title 4
      doc.setTextColor(11, 60, 93);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('4. HISTORIAL DE PAGOS & REPORTE CARTERA MOROSA (P1501HA / P15012)', 15, 116);

      // Screenshot 4 Mockup
      drawMockBrowserFrame(119, 'HISTORIAL DE PAGOS & CARTERA MOROSA - P1501HA', 'assetflow.inmobiliariapro.cl/jde/P1501HA_payment_history', '📸 CAPTURA 4', [225, 29, 72], 38);

      // Mockup 4 Internal Layout
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(19, 128, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(15, 23, 42);
      doc.text('[1] FICHA CONTRACTUAL', 21, 133);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(100, 116, 139);
      doc.text('RUT Arrendatario: 15.890.124-K\nInmueble: Local 102 - Providencia\nEstado: ✓ Al día con obligaciones', 21, 138);

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(75, 128, 60, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(11, 60, 93);
      doc.text('[2] DESGLOSE FINANCIERO', 77, 133);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(100, 116, 139);
      doc.text('Monto Cobrado: $1.250.000\nMonto Pagado: $1.250.000\nPor Pagar (Saldo): $0 (PAGADO)', 77, 138);

      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(139, 128, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(4, 120, 87);
      doc.text('[3] EXPORTACIÓN & PORTAL', 141, 133);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(11, 60, 93);
      doc.text('📊 Tabulado Excel (.xlsx)\n📄 Cartola PDF\n📱 Portal Arrendatario (#001D42)', 141, 138);

      // Step Box 4
      drawStepBox(
        159,
        'PASOS Y AUDITORÍA DEL HISTORIAL DE PAGOS Y CARTERA:',
        [
          { num: '1', text: 'Paso 1 (Acceso): Acceda a "Historial & Comportamiento de Pago Arrendatarios" (P1501HA).' },
          { num: '2', text: 'Paso 2 (Análisis): Audite la ficha contractual, montos cobrados, pagados y saldo por pagar (2).' },
          { num: '3', text: 'Paso 3 (Reporte): Exporte la planilla Excel (.xlsx) para la empresa o la Cartola PDF para el cliente.' }
        ],
        'El módulo P1501HA es la herramienta autorizada para la auditoría de saldos y morosidades.'
      );

      drawPageFooter(3);

      // ==========================================
      // PAGE 4: GUÍA VISUAL - CAPTURAS 5 & 6
      // ==========================================
      doc.addPage();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 297, 'F');
      drawPageHeader('P0000A');

      // Section Title 5
      doc.setTextColor(11, 60, 93);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('5. CONFIGURACIÓN IA NEURONAL & BYPASS (F0911_NN)', 15, 25);

      // Screenshot 5 Mockup (Dark Tech style)
      drawMockBrowserFrame(28, 'CONFIGURACIÓN IA NEURONAL - F0911_NN', 'assetflow.inmobiliariapro.cl/jde/F0911_NN_neural_config', '📸 CAPTURA 5', [99, 102, 241], 38);

      // Mockup 5 Internal Layout
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(19, 37, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(129, 140, 248);
      doc.text('[1] INTERRUPTOR SW', 21, 42);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(226, 232, 240);
      doc.text('● ACTIVO (ON)\nToggle de visualización visual', 21, 47);

      doc.setFillColor(15, 23, 42);
      doc.roundedRect(75, 37, 60, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(245, 158, 11);
      doc.text('[2] MODO SILENCIOSO', 77, 42);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(226, 232, 240);
      doc.text('Auditoría activa en 2° plano\nOculta grafos a usuarios finales', 77, 47);

      doc.setFillColor(15, 23, 42);
      doc.roundedRect(139, 37, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(52, 211, 153);
      doc.text('[3] BITÁCORA LOG', 141, 42);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(52, 211, 153);
      doc.text('LOG: CERO DISCREPANCIAS\nIntegridad 100% Ok', 141, 48);

      // Step Box 5
      drawStepBox(
        68,
        'PASOS DE CONFIGURACIÓN DEL MOTOR NEURONAL:',
        [
          { num: '1', text: 'Paso 1 (Control): Encienda o apague la visualización técnica con el switch principal (1).' },
          { num: '2', text: 'Paso 2 (Comprensión): Apagar la vista NO detiene la auditoría de compliance en 2° plano (2).' },
          { num: '3', text: 'Paso 3 (Bitácora): Monitoree la barra inferior para certificar que no existan discrepancias (3).' }
        ],
        'No alterar la configuración del motor neuronal sin la autorización directa de la Jefatura de TI.'
      );

      // Section Title 6
      doc.setTextColor(11, 60, 93);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('6. LIBRO DIARIO CENTRAL ERP (P09210 & P0911)', 15, 116);

      // Screenshot 6 Mockup
      drawMockBrowserFrame(119, 'LIBRO DIARIO CENTRAL - P0911', 'assetflow.inmobiliariapro.cl/contabilidad/ledger_p0911', '📸 CAPTURA 6', [15, 23, 42], 38);

      // Mockup 6 Internal Layout
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(19, 128, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(16, 185, 129);
      doc.text('[1] CUADRE MATEMÁTICO', 21, 133);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(100, 116, 139);
      doc.text('Total Deber: $15.420.000\nTotal Haber: $15.420.000\nEstado: ✓ CUADRADO ($0)', 21, 138);

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(75, 128, 60, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(79, 70, 229);
      doc.text('[2] GRILLA CON FILTRO QBE', 77, 133);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(100, 116, 139);
      doc.text('Lote: 12845669 / JE\nCuenta: 1110.01.002 Caja General\nDeber: $550.000 | Haber: $0', 77, 138);

      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(139, 128, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(4, 120, 87);
      doc.text('[3] POSTEO DIRECTO', 141, 133);
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(141, 138, 48, 12, 1, 1, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(255, 255, 255);
      doc.text('✓ AUTORIZAR Y POSTEAR', 165, 145, { align: 'center' });

      // Step Box 6
      drawStepBox(
        159,
        'PASOS Y REGLAS DEL REGISTRO EN LIBRO DIARIO:',
        [
          { num: '1', text: 'Paso 1 (Cuadre): Ingrese al lote y corrobore que el indicador indique "✓ CUADRADO" ($0 descalce).' },
          { num: '2', text: 'Paso 2 (QBE): Filtre líneas o cuentas específicas escribiendo sobre las cabeceras de columna.' },
          { num: '3', text: 'Paso 3 (Posteo): Presione "Autorizar y Postear Lote" para asentar en el Libro Mayor.' }
        ],
        'Si existe un solo peso de diferencia entre Deber y Haber, el botón de posteo estará bloqueado.'
      );

      drawPageFooter(4);

      // ==========================================
      // PAGE 5: GUÍA VISUAL - CAPTURAS 7 & 8
      // ==========================================
      doc.addPage();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 297, 'F');
      drawPageHeader('P0000A');

      // Section Title 7
      doc.setTextColor(11, 60, 93);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('7. RECEPCIÓN TÉCNICA (P4312) & MAYOR DE CUENTAS', 15, 25);

      // Screenshot 7 Mockup
      drawMockBrowserFrame(28, 'RECEPCIÓN TÉCNICA & MAYOR DE CUENTAS - P4312', 'assetflow.inmobiliariapro.cl/recepcion_tecnica/p4312_consolidated', '📸 CAPTURA 7', [79, 70, 229], 38);

      // Mockup 7 Internal Layout
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(19, 37, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(11, 60, 93);
      doc.text('[1] REVISIÓN DE ORDEN', 21, 42);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(100, 116, 139);
      doc.text('OC #45091 - Repare Techo\nVerificar cantidades y valor', 21, 47);

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(75, 37, 60, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(16, 185, 129);
      doc.text('[2] CARGA EVIDENCIA', 77, 42);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(100, 116, 139);
      doc.text('Acta Conformidad: ✓ OK\nRespaldo Fotográfico: ✓ OK', 77, 47);

      doc.setFillColor(238, 242, 255);
      doc.roundedRect(139, 37, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(67, 56, 202);
      doc.text('[3] MAYOR CENTRAL', 141, 42);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(11, 60, 93);
      doc.text('Posteo Automático de\nProvisión en el Mayor', 141, 48);

      // Step Box 7
      drawStepBox(
        68,
        'PASOS Y REQUISITOS DE RECEPCIÓN TÉCNICA:',
        [
          { num: '1', text: 'Paso 1 (Orden): Localice la orden de servicio y revise las cantidades entregadas (1).' },
          { num: '2', text: 'Paso 2 (Evidencia): Adjunte obligatoriamente el Acta de Conformidad y fotos de respaldo (2).' },
          { num: '3', text: 'Paso 3 (Posteo): Presione "Finalizar" para asentar la provisión contable en el Mayor (3).' }
        ],
        'Sin el Acta de Conformidad firmada no se puede dar la recepción técnica en el ERP.'
      );

      // Section Title 8
      doc.setTextColor(11, 60, 93);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('8. MAPA INTERACTIVO ERP Y CONSOLA BATCH (F0000S / R98403S)', 15, 116);

      // Screenshot 8 Mockup
      drawMockBrowserFrame(119, 'MAPA INTERACTIVO ERP & CONSOLA BATCH - F0000S / R98403S', 'assetflow.inmobiliariapro.cl/jde/F0000S_suite_map', '📸 CAPTURA 8', [245, 158, 11], 38);

      // Mockup 8 Internal Layout
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(19, 128, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(11, 60, 93);
      doc.text('[1] SUITES ERP', 21, 133);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(100, 116, 139);
      doc.text('Financials | Asset Mgmt\nReal Estate (F1501)', 21, 138);

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(75, 128, 60, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(217, 119, 6);
      doc.text('[2] CONSOLA BATCH', 77, 133);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(100, 116, 139);
      doc.text('Proceso R98403S\nAuditoría referencial cruzada', 77, 138);

      doc.setFillColor(15, 23, 42);
      doc.roundedRect(139, 128, 52, 26, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(52, 211, 153);
      doc.text('[3] TERMINAL LOGS', 141, 133);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(226, 232, 240);
      doc.text('STATUS: 200 OK\nConsistencia referencial 100%', 141, 138);

      // Step Box 8
      drawStepBox(
        159,
        'PASOS Y DIRECTRICES DEL BATCH DE CONSISTENCIA:',
        [
          { num: '1', text: 'Paso 1 (Navegación): Ingrese a la Central de Integración ERP (F0000S) desde accesos directos (1).' },
          { num: '2', text: 'Paso 2 (Auditoría): Inspeccione las tablas físicas (F0911, F0401, F1501) en el panel lateral (2).' },
          { num: '3', text: 'Paso 3 (Ejecución): Ejecute el proceso Batch R98403S al menos una vez al día previo al cierre (3).' }
        ],
        'Correr el Batch R98403S diariamente para prevenir descalces de datos lógicos en la base central.'
      );

      drawPageFooter(5);

      // ==========================================
      // PAGE 6: GLOSARIO COMPLETITO DE EXCEPCIONES
      // ==========================================
      doc.addPage();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 297, 'F');
      drawPageHeader('P0000A');

      doc.setTextColor(11, 60, 93);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('6. GLOSARIO PAE (PROTOCOLO ANTI-ERRORES)', 15, 28);

      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('El sistema emite los siguientes códigos específicos ante intentos de vulneración, digitación errónea o bloqueos de compliance. Utilice esta tabla para contactar a Soporte TI o Control Interno:', 15, 34);

      // Render table
      const tableData = ERROR_GLOSSARY.map(err => [
        err.code,
        `${err.title}\nCausa/Solución: ${err.solution}`,
        err.risk
      ]);

      (doc as any).autoTable({
        startY: 42,
        margin: { left: 15, right: 15 },
        head: [['Código', 'Incidencia & Corrección Sugerida', 'Severidad']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [11, 60, 93], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 28, fontStyle: 'bold', textColor: [11, 60, 93] },
          1: { cellWidth: 122 },
          2: { cellWidth: 30, halign: 'center' }
        },
        styles: { fontSize: 8, cellPadding: 3 }
      });

      // Signature Block at Page 6 bottom
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(11, 60, 93);
      doc.text('REVISADO Y VALIDADO CORPORATIVAMENTE', 15, 222);
      
      doc.setDrawColor(203, 213, 225);
      doc.line(15, 248, 85, 248);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('SOPORTE TI / HELP DESK', 15, 253);
      doc.text('E-mail: helpdesk@inmobiliariapro.cl', 15, 258);

      doc.line(125, 248, 195, 248);
      doc.text('CRISTIAN MUÑOZ R.', 125, 253);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTROL INTERNO DEPTO INMOBILIARIO', 125, 258);

      drawPageFooter(6);

      doc.save('Manual_Usuario_AssetFlow_AssetFlow.pdf');
    } catch (err) {
      console.error("Error al generar PDF de Manual", err);
      alert("Hubo un problema al exportar el PDF del manual. Por favor intente de nuevo.");
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-100 flex flex-col no-print overflow-hidden animate-in fade-in duration-300">
      
      {/* SUPERIOR NAVEGATION BAR */}
      <div className="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs shrink-0 z-20">
        <div className="flex items-center gap-6">
          <button 
            onClick={onClose} 
            className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
            title="Cerrar Manual de Usuario"
          >
            <X size={18} />
            <span className="text-[10px] uppercase font-black tracking-widest hidden sm:inline">Cerrar</span>
          </button>
          
          <div className="h-6 w-[1px] bg-slate-300"></div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-300 shadow-inner overflow-x-auto max-w-full">
            <button 
              onClick={() => setActiveTab('GUIA')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${activeTab === 'GUIA' ? 'bg-indigo-650 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Eye size={14} /> Guía Explicativa & Pantallazos
            </button>
            <button 
              onClick={() => setActiveTab('DICCIONARIO')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${activeTab === 'DICCIONARIO' ? 'bg-emerald-650 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Sliders size={14} /> Glosario de Excepciones PAE
            </button>
            <button 
              onClick={() => setActiveTab('PRESENTACION')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${activeTab === 'PRESENTACION' ? 'bg-amber-650 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Presentation size={14} /> Resumen de Gobierno
            </button>
            <button 
              onClick={() => setActiveTab('ARRENDATARIO')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${activeTab === 'ARRENDATARIO' ? 'bg-rose-650 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <HelpCircle size={14} /> Manual Arrendatario
            </button>
            <button 
              onClick={() => setActiveTab('DIAGRAMAS_VISIO')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${activeTab === 'DIAGRAMAS_VISIO' ? 'bg-[#0B3C5D] text-[#FFCC00] shadow-md ring-2 ring-[#FFCC00]' : 'text-slate-700 hover:text-slate-900 bg-amber-50 hover:bg-amber-100 border border-amber-200'}`}
            >
              <GitFork size={14} className="text-[#0B3C5D]" /> Diagramas Visio (BPMN)
            </button>
            <button 
              type="button"
              onClick={() => setShowJobSearchManual(true)}
              className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 cursor-pointer shadow-xs"
              title="Abrir Manual de Uso del Módulo de Búsqueda de Empleo y Match CV"
            >
              <Briefcase size={14} className="text-amber-700 animate-pulse" /> Manual Empleo (P09OWJOB)
            </button>
          </div>
        </div>
        
        <button 
          onClick={handleDownloadPDF} 
          className="bg-[#0B3C5D] hover:bg-[#072438] text-[#FFCC00] hover:text-[#ffd633] px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2.5 transition-all border border-[#FFCC00]/30 shadow-md cursor-pointer scale-100 hover:scale-[1.02]"
        >
          <FileDown size={14} /> Descargar Manual PDF completito
        </button>
      </div>

      {/* BODY SCROLL CONTAINER */}
      <div className="flex-1 overflow-y-auto bg-slate-200 p-6 lg:p-10 flex flex-col items-center custom-audit-scroll">
        
        {/* INNER VISUAL WRAPPER */}
        <div id="printable-report" className="bg-white w-full max-w-[216mm] min-h-[279mm] shadow-2xl p-6 md:p-12 flex flex-col text-slate-800 font-sans relative my-4 rounded-2xl border border-slate-200 animate-in zoom-in-95 duration-400">
          
          {/* SECURE REPORT CORNER DECORATION */}
          <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden pointer-events-none rounded-tr-2xl">
            <div className="bg-slate-900 text-white text-[7px] font-black tracking-widest text-center py-1 absolute top-4 right-[-32px] w-40 rotate-45 border-y border-[#FFCC00]/30 font-mono">
              SISTEMA PROCOLO PAE
            </div>
          </div>

          {/* HEADER EMBLEMA */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-5 mb-6 font-sans">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <div className="flex items-center gap-1.5 bg-[#0B3C5D]/10 text-[#0B3C5D] px-2.5 py-1 rounded-md w-fit">
                  <Shield size={11} className="animate-pulse" />
                  <span className="text-[7.5px] font-black uppercase tracking-widest">Procedimiento Obligatorio</span>
                </div>
                <div className="bg-amber-100 text-amber-900 border border-amber-200 text-[8px] font-black uppercase px-2.5 py-1 rounded-md">
                  Última Actualización: 16 de Octubre, 2026 (v4.0 • JDE 9.11 + Blockchain SHA-256)
                </div>
              </div>
              <h1 className="text-xl font-black uppercase tracking-tight text-[#0B3C5D] leading-none mb-1">Manual de Entrenamiento del Sistema AssetFlow</h1>
              <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">Módulo de Integración, Aprobaciones P43081 &amp; Blockchain F4209 • ID: P0000A</p>
            </div>
            <div className="text-right mt-3 sm:mt-0 font-sans font-medium">
              <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Control de Calidad</p>
              <p className="text-xs font-black text-emerald-700 uppercase">100% Homologado</p>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: GUÍA EXPLICATIVA CON INTERFACES CAPTURADAS */}
          {/* ========================================================= */}
          {activeTab === 'GUIA' && (
            <div className="space-y-6 flex-1 flex flex-col font-sans">
              
              {/* COHESIVE SYSTEM PROCEDURE INSTRUCTIONS */}
              <div className="p-4 bg-indigo-50 border-l-4 border-[#0B3C5D] rounded-r-xl space-y-1">
                <div className="flex items-center gap-2 text-[#0B3C5D] font-black text-[10px] uppercase tracking-wider">
                  <ShieldCheck size={14} className="text-emerald-700 animate-pulse" />
                  <span>GUÍA INTERACTIVA DE OPERACIONES Y PROCEDIMIENTO DE TRABAJO (PAE)</span>
                </div>
                <p className="text-[10px] text-slate-700 font-medium leading-relaxed">
                  Para potenciar la eficiencia en la gestión corporativa inmobiliaria, este manual interactivo provee un recorrido detallado paso a paso por los diferentes módulos. Seleccione la pantalla deseada en la botonera de abajo para desplegar la simulación del sistema ERP de gestión integrada y las directrices obligatorias de control.
                </p>
              </div>

              {/* SCREENSHOT INTERACTIVE SELECTOR TAB RAIL */}
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 mt-2">
                <button 
                  onClick={() => setActiveScreenshot(1)} 
                  className={`py-2.5 px-3 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                    activeScreenshot === 1 
                      ? 'border-[#0B3C5D] bg-[#0b3c5d]/5 border-2 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-0.5">
                    <span className="text-[7px] font-black text-slate-400 font-mono">R15011Z1I</span>
                    <span className="text-[6.5px] bg-red-100 text-red-700 px-1 rounded font-black font-mono">📸 CAPTURA 1</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#0B3C5D] uppercase truncate">Carga Excel</span>
                </button>
                <button 
                  onClick={() => setActiveScreenshot(2)} 
                  className={`py-2.5 px-3 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                    activeScreenshot === 2 
                      ? 'border-[#2A6546] bg-[#2a6546]/5 border-2 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-0.5">
                    <span className="text-[7px] font-black text-slate-400 font-mono">P04012</span>
                    <span className="text-[6.5px] bg-emerald-100 text-emerald-700 px-1 rounded font-black font-mono">📸 CAPTURA 2</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#2A6546] uppercase truncate">Proveedores UAF</span>
                </button>
                <button 
                  onClick={() => setActiveScreenshot(3)} 
                  className={`py-2.5 px-3 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                    activeScreenshot === 3 
                      ? 'border-amber-600 bg-amber-500/5 border-2 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-0.5">
                    <span className="text-[7px] font-black text-slate-400 font-mono">P0002M</span>
                    <span className="text-[6.5px] bg-amber-100 text-amber-700 px-1 rounded font-black font-mono">📸 CAPTURA 3</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase truncate">Gastos IA</span>
                </button>
                <button 
                  onClick={() => setActiveScreenshot(4)} 
                  className={`py-2.5 px-3 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                    activeScreenshot === 4 
                      ? 'border-rose-600 bg-rose-500/5 border-2 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-0.5">
                    <span className="text-[7px] font-black text-slate-400 font-mono">P15012</span>
                    <span className="text-[6.5px] bg-rose-100 text-rose-700 px-1 rounded font-black font-mono">📸 CAPTURA 4</span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-800 uppercase truncate">Rep. Morosos</span>
                </button>
                <button 
                  onClick={() => setActiveScreenshot(5)} 
                  className={`py-2.5 px-3 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                    activeScreenshot === 5 
                      ? 'border-indigo-600 bg-indigo-50 border-2 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-0.5">
                    <span className="text-[7px] font-black text-slate-400 font-mono">F0911_NN</span>
                    <span className="text-[6.5px] bg-indigo-100 text-indigo-700 px-1 rounded font-black font-mono">📸 CAPTURA 5</span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-850 uppercase truncate">Red Neuronal</span>
                </button>
                <button 
                  onClick={() => setActiveScreenshot(6)} 
                  className={`py-2.5 px-3 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                    activeScreenshot === 6 
                      ? 'border-[#0B3C5D] bg-[#0b3c5d]/5 border-2 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-0.5">
                    <span className="text-[7px] font-black text-slate-400 font-mono">P09210</span>
                    <span className="text-[6.5px] bg-slate-200 text-slate-700 px-1 rounded font-black font-mono">📸 CAPTURA 6</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-805 uppercase truncate">Libro Diario ERP</span>
                </button>
                <button 
                  onClick={() => setActiveScreenshot(7)} 
                  className={`py-2.5 px-3 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                    activeScreenshot === 7 
                      ? 'border-[#0B3C5D] bg-[#0b3c5d]/5 border-2 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-0.5">
                    <span className="text-[7px] font-black text-slate-400 font-mono">P4312</span>
                    <span className="text-[6.5px] bg-blue-100 text-blue-700 px-1 rounded font-black font-mono">📸 CAPTURA 7</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-850 uppercase truncate">Recepción & Mayor</span>
                </button>
                <button 
                  onClick={() => setActiveScreenshot(8)} 
                  className={`py-2.5 px-3 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                    activeScreenshot === 8 
                      ? 'border-amber-600 bg-amber-500/5 border-2 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-0.5">
                    <span className="text-[7px] font-black text-slate-400 font-mono">F0000S</span>
                    <span className="text-[6.5px] bg-amber-100 text-amber-700 px-1 rounded font-black font-mono">📸 CAPTURA 8</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase truncate">Suite & Batch</span>
                </button>
                <button 
                  onClick={() => setActiveScreenshot(9)} 
                  className={`py-2.5 px-3 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                    activeScreenshot === 9 
                      ? 'border-indigo-600 bg-indigo-500/5 border-2 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-0.5">
                    <span className="text-[7px] font-black text-slate-400 font-mono">P09OWJOB</span>
                    <span className="text-[6.5px] bg-indigo-100 text-indigo-700 px-1 rounded font-black font-mono">📸 CAPTURA 9</span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-800 uppercase truncate">Empleo & RBAC</span>
                </button>
                <button 
                  onClick={() => setActiveScreenshot(10)} 
                  className={`py-2.5 px-3 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                    activeScreenshot === 10 
                      ? 'border-emerald-600 bg-emerald-500/10 border-2 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-0.5">
                    <span className="text-[7px] font-black text-slate-400 font-mono">P43081/F4209</span>
                    <span className="text-[6.5px] bg-emerald-100 text-emerald-800 px-1 rounded font-black font-mono">📸 CAPTURA 10</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-900 uppercase truncate">Aprob. &amp; Blockchain</span>
                </button>
                <button 
                  onClick={() => setActiveScreenshot(11)} 
                  className={`py-2.5 px-3 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                    activeScreenshot === 11 
                      ? 'border-cyan-600 bg-cyan-500/10 border-2 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-0.5">
                    <span className="text-[7px] font-black text-slate-400 font-mono">R09322 (B.4)</span>
                    <span className="text-[6.5px] bg-cyan-100 text-cyan-800 px-1 rounded font-black font-mono">📸 CAPTURA 11</span>
                  </div>
                  <span className="text-[10px] font-bold text-cyan-900 uppercase truncate">Informe B.4 CMF</span>
                </button>
                <button 
                  onClick={() => setActiveScreenshot(12)} 
                  className={`py-2.5 px-3 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                    activeScreenshot === 12 
                      ? 'border-indigo-600 bg-indigo-500/10 border-2 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-0.5">
                    <span className="text-[7px] font-black text-slate-400 font-mono">R09323 (N14)</span>
                    <span className="text-[6.5px] bg-indigo-100 text-indigo-800 px-1 rounded font-black font-mono">📸 CAPTURA 12</span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-900 uppercase truncate">Nota 14 NIC 40</span>
                </button>
                <button 
                  onClick={() => setActiveScreenshot(13)} 
                  className={`py-2.5 px-3 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                    activeScreenshot === 13 
                      ? 'border-amber-600 bg-amber-500/10 border-2 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-0.5">
                    <span className="text-[7px] font-black text-slate-400 font-mono">P1501 (DRILL)</span>
                    <span className="text-[6.5px] bg-amber-100 text-amber-800 px-1 rounded font-black font-mono">📸 CAPTURA 13</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-900 uppercase truncate">Catastro Drill-Down</span>
                </button>
              </div>

              {/* SCREENSHOT VIEWPORT CONTAINER */}
              <div className="flex-1 flex flex-col">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-2 font-mono">Visualizador de Pantalla Activa:</p>
                
                {/* INTERACTIVE SCREENSHOT MOCK 1: CARGA EXCEL R15011Z1I */}
                {activeScreenshot === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-300 text-left">
                    {/* Visual Browser Mockup Frame */}
                    <div className="border-2 border-slate-300 rounded-2xl overflow-hidden shadow-lg bg-slate-100 font-sans">
                      {/* Browser Window Header */}
                      <div className="bg-slate-200 px-4 py-2 flex items-center justify-between border-b border-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                          <span className="ml-2 text-[10px] font-black text-slate-500 tracking-wider font-mono">CARGA EXCEL ERP - R15011Z1I</span>
                        </div>
                        <div className="hidden md:flex bg-white border border-slate-200 rounded-lg px-3 py-1 text-[9px] text-slate-500 items-center gap-1.5 font-mono w-96 truncate">
                          <span className="text-emerald-600 font-bold">🔒 Secure</span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-700 font-bold truncate">https://assetflow.inmobiliariapro.cl/jde/R15011Z1I_excel_upload</span>
                        </div>
                        <span className="text-[8px] font-black uppercase text-rose-600 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md animate-pulse">
                          📸 EJEMPLO DE CAPTURA REAL
                        </span>
                      </div>

                      {/* Mock UI body */}
                      <div className="p-5 bg-white space-y-4 text-left text-[11px] relative">
                        {/* Interactive Red Overlay Pointers */}
                        <div className="border-2 border-dashed border-[#0B3C5D]/40 bg-[#0B3C5D]/3 p-8 text-center rounded-2xl space-y-2 relative">
                          <div className="absolute top-2 right-2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">1</span>
                            <span>ARRASTRAR EXCEL AQUÍ</span>
                          </div>
                          
                          <Upload className="mx-auto text-[#0B3C5D] animate-bounce" size={28} />
                          <p className="text-[#0B3C5D] font-black uppercase text-[11px] tracking-wide">ZONA DE DETECCIÓN INTELIGENTE DE PLANILLAS</p>
                          <p className="text-slate-400 text-[9.5px] font-bold">Admite planillas de tasaciones (.xlsx o .csv) para todo Chile.</p>
                        </div>

                        {/* Mapeador Columnas Mock */}
                        <div className="space-y-2.5 border border-slate-200 p-4 bg-slate-50 rounded-2xl relative">
                          <div className="absolute top-2 right-2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">2</span>
                            <span>MAPEO DE COLUMNAS</span>
                          </div>

                          <p className="font-black text-[9.5px] uppercase tracking-wide text-slate-600 flex items-center gap-1">
                            <Sliders size={13} className="text-indigo-600" /> PASO 2: CONTROL DE ATRIBUTOS REQUERIDOS (EVITAR ERRORES)
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[9px]">
                            <div className="bg-white p-2 border border-slate-200 rounded-xl flex items-center justify-between shadow-3xs">
                              <span className="font-mono text-slate-400 font-bold">Columna Rol:</span>
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-1.5 py-0.5 rounded-md font-black text-[8px]">✓ MAPEADO</span>
                            </div>
                            <div className="bg-white p-2 border border-slate-200 rounded-xl flex items-center justify-between shadow-3xs">
                              <span className="font-mono text-slate-400 font-bold">Columna Comuna:</span>
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-1.5 py-0.5 rounded-md font-black text-[8px]">✓ MAPEADO</span>
                            </div>
                            <div className="bg-white p-2 border border-slate-200 rounded-xl flex items-center justify-between shadow-3xs">
                              <span className="font-mono text-slate-400 font-bold">Columna Dirección:</span>
                              <span className="bg-amber-100 text-amber-805 border border-amber-200 px-1.5 py-0.5 rounded-md font-black text-[8px]">⚠ POR ASIGNAR</span>
                            </div>
                          </div>
                        </div>

                        {/* Button mock */}
                        <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                          <span className="text-[8.5px] font-black text-slate-400 uppercase font-mono tracking-wider">MÓDULO DE GESTIÓN CONTABLE</span>
                          <div className="flex gap-2 relative">
                            <div className="absolute left-[-115px] top-1/2 -translate-y-1/2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 z-10 shadow-sm">
                              <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">3</span>
                              <span>GUARDAR</span>
                            </div>
                            <button type="button" className="bg-[#D2DFEC] text-slate-650 px-3.5 py-1.5 font-black uppercase tracking-wider rounded-lg text-[9.5px]">Cancelar</button>
                            <button type="button" className="bg-[#0B3C5D] text-[#FFCC00] hover:bg-[#082d46] px-4 py-1.5 font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 text-[9.5px] pointer-events-none shadow-md">
                              <CheckSquare size={11} /> PROCESAR Y GUARDAR REGISTROS
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Screenshot Explanatory Panel */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-900 tracking-wide flex items-center gap-1.5">
                        <Monitor size={14} className="text-indigo-600 animate-pulse" /> ANÁLISIS EXPLICATIVO DE LA CAPTURA 1 (CARGA EXCEL):
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-[#0B3C5D] text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-[#0B3C5D] text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">1</span>
                            ZONA DE ARRASTRE DIRECTO
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Espacio interactivo donde se suelta la planilla Excel o CSV de tasaciones. El sistema lee el archivo en el navegador sin retraso.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-indigo-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-indigo-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">2</span>
                            SELECTORES DE MAPEO
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Permite mapear las columnas del Excel con los atributos exigidos por el ERP (Rol, Comuna, Dirección, Valor) de manera flexible.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-emerald-800 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-emerald-700 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">3</span>
                            BOTÓN DE CONSOLIDACIÓN
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Guarda los registros validados síncronamente en la base de datos de Firebase. Aplica el filtro de prevención de errores.
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200">
                        <h4 className="text-[9.5px] font-black uppercase text-slate-700">REGLAS CRÍTICAS DE ESTA INTERFAZ:</h4>
                        <ul className="space-y-1 text-[9.5px] text-slate-550 pl-4 list-disc leading-relaxed">
                          <li><strong>Evite celdas en blanco:</strong> Si falta el ROL, la tasación proporcional no se podrá calcular y generará el error <code>ERR-VAL-001</code>.</li>
                          <li><strong>Nombres de comuna limpios:</strong> No use caracteres extraños como "Providencia_123" para que el mapa georreferencie de manera óptima.</li>
                        </ul>
                      </div>

                      {/* Sequential Process Steps */}
                      <div className="p-3.5 bg-indigo-50 border border-indigo-150 rounded-xl space-y-2 mt-3 text-left">
                        <h5 className="text-[10px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="bg-indigo-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8.5px] font-mono">1-3</span>
                          PASOS DEL PROCESO CONTABLE A SEGUIR EN ESTA PANTALLA:
                        </h5>
                        <ol className="space-y-2.5 text-[9.5px] text-slate-700 font-semibold pl-1">
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">1</span>
                            <div>
                              <strong>Paso 1: Carga de Planilla de Tasaciones</strong> - Arrastre y suelte el archivo Excel o CSV (.xlsx / .csv) dentro del área punteada de la <span className="text-rose-700 font-extrabold">Zona de Detección (1)</span>. El sistema detectará las filas y columnas automáticamente en el cliente.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">2</span>
                            <div>
                              <strong>Paso 2: Validación y Mapeo de Columnas Contables</strong> - Revise la sección de <span className="text-rose-700 font-extrabold">Mapeo de Columnas (2)</span>. Asegúrese de asociar las columnas de su archivo con las requeridas por el ERP (Rol, Comuna, Dirección y Valor), verificando que la advertencia cambie al estado "✓ MAPEADO".
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">3</span>
                            <div>
                              <strong>Paso 3: Procesamiento Contable e Integración ERP</strong> - Presione el botón <span className="text-rose-700 font-extrabold">"PROCESAR Y GUARDAR REGISTROS" (3)</span>. El sistema validará la información y la consolidará síncronamente en la base de datos central de Firebase, gatillando el cálculo de tasaciones proporcionales.
                            </div>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE SCREENSHOT MOCK 2: MAESTRO PROVEEDORES P04012 */}
                {activeScreenshot === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-300 text-left">
                    {/* Visual Browser Mockup Frame */}
                    <div className="border-2 border-emerald-300 rounded-2xl overflow-hidden shadow-lg bg-slate-100 font-sans">
                      {/* Browser Window Header */}
                      <div className="bg-emerald-50 px-4 py-2 flex items-center justify-between border-b border-emerald-200">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                          <span className="ml-2 text-[10px] font-black text-emerald-800 tracking-wider font-mono">PROVEEDORES COMPLIANCE - P04012</span>
                        </div>
                        <div className="hidden md:flex bg-white border border-slate-200 rounded-lg px-3 py-1 text-[9px] text-slate-500 items-center gap-1.5 font-mono w-96 truncate">
                          <span className="text-emerald-600 font-bold">🔒 Secure</span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-700 font-bold truncate">https://assetflow.inmobiliariapro.cl/jde/P04012_supplier_compliance</span>
                        </div>
                        <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md animate-pulse">
                          📸 EJEMPLO DE CAPTURA REAL
                        </span>
                      </div>

                      {/* Mock UI body */}
                      <div className="p-5 bg-white space-y-4 text-left text-[11px] relative">
                        {/* Supplier Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 relative">
                          <div className="absolute top-2 right-2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">1</span>
                            <span>INFORMACIÓN DE CONTRASTE</span>
                          </div>
                          <div>
                            <span className="text-[7.5px] font-bold text-slate-400 uppercase font-mono block">Razón Social Contable:</span>
                            <span className="font-black text-slate-800 text-[11px]">CONSTRUCTORA MAESTRO LIMITADA</span>
                          </div>
                          <div>
                            <span className="text-[7.5px] font-bold text-slate-400 uppercase font-mono block">Rut Emisor Fiscal:</span>
                            <span className="font-mono text-slate-800 font-black text-[11px]">76.124.908-4</span>
                          </div>
                        </div>

                        {/* Checklist Checkboxes Visuals */}
                        <div className="space-y-2.5 border border-slate-200 p-4 bg-slate-50 rounded-2xl relative">
                          <div className="absolute top-2 right-2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">2</span>
                            <span>SEMÁFORO DE COMPLIANCE</span>
                          </div>

                          <p className="font-black text-[9.5px] uppercase tracking-wide text-slate-600">Semáforo de Compliance Auditoría UAF:</p>
                          
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                              <span className="font-bold text-emerald-805 text-[10px]">1. Declaración Jurada Beneficiarios Finales UAF</span>
                              <span className="text-[8px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">✓ OK (ADJUNTO)</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                              <span className="font-bold text-emerald-805 text-[10px]">2. Certificado de No Parentesco / Conflicto Interés</span>
                              <span className="text-[8px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">✓ OK (FIRMADO)</span>
                            </div>
                            
                            {/* Missing warning red indicator */}
                            <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 border border-rose-200 relative">
                              <span className="font-bold text-rose-805 text-[10px]">3. Copia de Cédula de Identidad Representante Legal</span>
                              <span className="text-[8px] font-black uppercase text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">✗ FALTA</span>
                              
                              <div className="absolute top-[-5px] right-2 bg-amber-500 text-slate-950 font-black text-[7.5px] px-2 py-0.5 rounded-md shadow-md animate-bounce">
                                ¡REQUISITO MANDATORIO UAF BLOQUEANTE!
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Save block */}
                        <div className="pt-4 border-t flex justify-between items-center text-[10px] relative">
                          <span className="text-slate-400 font-bold font-mono uppercase tracking-wider">Responsable: ANALISTA COMPLIANCE</span>
                          <div className="relative">
                            <div className="absolute left-[-150px] top-1/2 -translate-y-1/2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 z-10 shadow-sm">
                              <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">3</span>
                              <span>BLOQUEADO</span>
                            </div>
                            <button type="button" className="bg-slate-100 text-slate-400 font-black px-4 py-2 uppercase rounded-lg flex items-center gap-1.5 cursor-not-allowed border border-slate-200">
                              <Lock size={12} /> APROBAR PROVEEDOR EN ERP (RESTRINGIDO)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Explanation Grid */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-900 tracking-wide flex items-center gap-1.5">
                        <Monitor size={14} className="text-emerald-700 animate-pulse" /> ANÁLISIS EXPLICATIVO DE LA CAPTURA 2 (ALTA PROVEEDORES):
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-slate-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-slate-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">1</span>
                            FICHA CENTRALIZADA
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Contiene los datos del Rut y Razón Social ingresados. El sistema realiza una consulta automática en segundo plano al Servicio de Impuestos Internos.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-rose-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-rose-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">2</span>
                            REGLAS DE CUMPLIMIENTO UAF
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Lista de verificación indispensable del Protocolo Anti-Errores. Si falta la Cédula u otro documento, se enciende la luz de alarma roja síncronamente.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-[#0B3C5D] text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-[#0B3C5D] text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">3</span>
                            BLOQUEO DE APROBACIÓN
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            La acción de aprobación permanece bloqueada con candado de seguridad criptográfica hasta que el dossier esté 100% completo, evitando multas UAF.
                          </p>
                        </div>
                      </div>

                      {/* Sequential Process Steps */}
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 mt-3 text-left">
                        <h5 className="text-[10px] font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="bg-emerald-700 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8.5px] font-mono">1-3</span>
                          PASOS DEL PROCESO DE CUMPLIMIENTO A SEGUIR EN ESTA PANTALLA:
                        </h5>
                        <ol className="space-y-2.5 text-[9.5px] text-slate-700 font-semibold pl-1">
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">1</span>
                            <div>
                              <strong>Paso 1: Contraste de Datos del Proveedor</strong> - Ingrese y corrobore los datos de la <span className="text-rose-700 font-extrabold">Ficha de Contraste (1)</span>, incluyendo Razón Social y RUT, que el sistema valida automáticamente en segundo plano con el SII para descartar empresas fantasma.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">2</span>
                            <div>
                              <strong>Paso 2: Evaluación del Semáforo de Compliance UAF</strong> - Revise exhaustivamente el <span className="text-rose-700 font-extrabold">Semáforo de Compliance (2)</span>. Asegúrese de que todos los ítems obligatorios tengan el estado "✓ OK (ADJUNTO)" en verde. Si hay una alerta roja de "✗ FALTA" (como la Cédula de Identidad), el proceso no podrá avanzar.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">3</span>
                            <div>
                              <strong>Paso 3: Bloqueo de Seguridad y Aprobación</strong> - Verifique el botón de <span className="text-rose-700 font-extrabold">Aprobación Bloqueado (3)</span>. El sistema mantiene inhabilitada la aprobación en el ERP de manera física mediante candados lógicos hasta que se cargue la totalidad de los documentos, protegiendo a la empresa de cualquier riesgo legal.
                            </div>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE SCREENSHOT MOCK 3: CAJA CHICA CON IA P0002M */}
                {activeScreenshot === 3 && (
                  <div className="space-y-4 animate-in fade-in duration-300 text-left">
                    {/* Visual Browser Mockup Frame */}
                    <div className="border-2 border-amber-300 rounded-2xl overflow-hidden shadow-lg bg-slate-100 font-sans">
                      {/* Browser Window Header */}
                      <div className="bg-amber-50 px-4 py-2 flex items-center justify-between border-b border-amber-200">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                          <span className="ml-2 text-[10px] font-black text-amber-800 tracking-wider font-mono">INGESTA INTELIGENTE CAJA CHICA - P0002M</span>
                        </div>
                        <div className="hidden md:flex bg-white border border-slate-200 rounded-lg px-3 py-1 text-[9px] text-slate-500 items-center gap-1.5 font-mono w-96 truncate">
                          <span className="text-emerald-600 font-bold">🔒 Secure</span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-700 font-bold truncate">https://assetflow.inmobiliariapro.cl/jde/P0002M_ai_expense_detector</span>
                        </div>
                        <span className="text-[8px] font-black uppercase text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md animate-pulse">
                          📸 EJEMPLO DE CAPTURA REAL
                        </span>
                      </div>

                      {/* Mock UI body */}
                      <div className="p-5 bg-white text-left text-[11px] grid grid-cols-1 md:grid-cols-2 gap-5 relative">
                        {/* Boleta física izquierda */}
                        <div className="border border-slate-300 p-4 rounded-2xl bg-slate-50 space-y-2 text-center font-mono text-[9px] leading-tight flex flex-col justify-between relative shadow-2xs">
                          <div className="absolute top-2 left-2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">1</span>
                            <span>COMPROBANTE ORIGINAL</span>
                          </div>
                          
                          <div className="space-y-1 pt-6 text-left">
                            <p className="font-black uppercase text-[10px] text-slate-700 text-center">RESTAURANT EL LOMO AZUL</p>
                            <p className="text-center text-slate-500">RUT: 76.531.029-4</p>
                            <p className="text-center text-slate-400">DIR: Av. Providencia 1120, Santiago</p>
                            <p className="border-t my-2 border-dashed border-slate-300"></p>
                            <p className="flex justify-between text-slate-600 font-bold"><span>1x Consumo Almuerzo Ejecutivo:</span> <span>$14.500</span></p>
                            <p className="flex justify-between text-emerald-800 font-black bg-emerald-50 px-2 py-1 rounded border border-emerald-100 mt-2">
                              <span>VALOR TOTAL DETECTADO:</span> <span>$14.500</span>
                            </p>
                          </div>
                          
                          <div className="bg-emerald-100 text-emerald-805 font-black p-1.5 text-[8.5px] uppercase rounded-xl border border-emerald-200 flex items-center justify-center gap-1 mt-2">
                            <Sparkles size={11} className="text-emerald-700" /> CONFIANZA DE EXTRACCIÓN OCR: 98.7%
                          </div>
                        </div>

                        {/* Formulario extraído */}
                        <div className="space-y-3.5 border-l border-slate-200 pl-5 relative">
                          <div className="absolute top-0 right-2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">2</span>
                            <span>CAMPOS AUTO-RELLENADOS</span>
                          </div>

                          <p className="text-[9px] text-indigo-600 uppercase font-black tracking-widest font-mono">Lectura Neuronal Automática:</p>
                          
                          <div className="space-y-2">
                            <div>
                              <label className="text-[8px] text-slate-400 font-bold block mb-0.5">RUT EMISOR:</label>
                              <input type="text" value="76531029-4" disabled className="w-full text-[10px] font-mono font-bold p-2 border rounded-lg bg-slate-50 text-slate-800 border-slate-200 shadow-3xs" />
                            </div>
                            <div>
                              <label className="text-[8px] text-slate-400 font-bold block mb-0.5">MONTO TOTAL ($):</label>
                              <input type="text" value="14500" disabled className="w-full text-[10px] font-mono font-bold p-2 border rounded-lg bg-slate-50 text-slate-800 border-slate-200 shadow-3xs" />
                            </div>
                            <div className="relative">
                              <div className="absolute right-[-5px] top-[-5px] bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm z-10">
                                <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">3</span>
                                <span>CUENTA</span>
                              </div>
                              <label className="text-[8px] text-slate-400 font-bold block mb-0.5">IMPUTACIÓN CONTABLE PREVISTA:</label>
                              <span className="text-[9px] bg-indigo-50 text-indigo-850 border border-indigo-200 rounded-lg px-2.5 py-2 font-black block font-mono">
                                💼 GASTOS GENERALES - ALIMENTACIÓN (R502)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Explanation Grid */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-900 tracking-wide flex items-center gap-1.5">
                        <Monitor size={14} className="text-amber-700 animate-pulse" /> ANÁLISIS EXPLICATIVO DE LA CAPTURA 3 (GASTOS IA / CAJA CHICA):
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-rose-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-rose-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">1</span>
                            LECTURA DIRECTA OCR
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            El analista simplemente sube la foto o PDF del comprobante. El motor OCR integrado analiza los bloques de caracteres de manera instantánea.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-indigo-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-indigo-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">2</span>
                            DETECCIÓN DE CAMPOS CLAVE
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Se aíslan automáticamente valores numéricos como el RUT de la empresa y el Monto total de la boleta, evitando la digitación manual.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-emerald-800 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-emerald-700 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">3</span>
                            CLASIFICACIÓN INTELIGENTE
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            La red neuronal asocia el nombre del comercio con la cuenta contable de imputación de manera automatizada.
                          </p>
                        </div>
                      </div>

                      {/* Sequential Process Steps */}
                      <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 mt-3 text-left">
                        <h5 className="text-[10px] font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="bg-amber-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8.5px] font-mono">1-3</span>
                          PASOS DEL PROCESO DE RENDICIÓN A SEGUIR EN ESTA PANTALLA:
                        </h5>
                        <ol className="space-y-2.5 text-[9.5px] text-slate-700 font-semibold pl-1">
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">1</span>
                            <div>
                              <strong>Paso 1: Cargar la Imagen del Comprobante</strong> - Suba la foto o PDF de su documento a la <span className="text-rose-700 font-extrabold">Zona de Comprobante Original (1)</span>. El motor OCR integrado extraerá los caracteres con una precisión superior al 98%.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">2</span>
                            <div>
                              <strong>Paso 2: Revisión de Campos Auto-Rellenados</strong> - Confirme los datos leídos en la sección <span className="text-rose-700 font-extrabold">Campos Auto-Rellenados (2)</span>. El sistema completará automáticamente el RUT del emisor y el Monto total de la boleta, agilizando el flujo de trabajo.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">3</span>
                            <div>
                              <strong>Paso 3: Asociación de Imputación Contable</strong> - Valide la <span className="text-rose-700 font-extrabold">Cuenta Contable Asignada (3)</span>. El motor inteligente sugiere la cuenta de destino basándose en el rubro del comercio (ej. Alimentación). Confirme la rendición para realizar el asiento.
                            </div>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE SCREENSHOT MOCK 4: REPORTE MOROSOS P15012 */}
                {activeScreenshot === 4 && (
                  <div className="space-y-4 animate-in fade-in duration-300 text-left">
                    {/* Visual Browser Mockup Frame */}
                    <div className="border-2 border-rose-300 rounded-2xl overflow-hidden shadow-lg bg-slate-100 font-sans">
                      {/* Browser Window Header */}
                      <div className="bg-rose-50 px-4 py-2 flex items-center justify-between border-b border-rose-200">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                          <span className="ml-2 text-[10px] font-black text-rose-800 tracking-wider font-mono">CARTERA MOROSA ERP - P15012</span>
                        </div>
                        <div className="hidden md:flex bg-white border border-slate-200 rounded-lg px-3 py-1 text-[9px] text-slate-500 items-center gap-1.5 font-mono w-96 truncate">
                          <span className="text-emerald-600 font-bold">🔒 Secure</span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-700 font-bold truncate">https://assetflow.inmobiliariapro.cl/jde/P15012_morosos_report</span>
                        </div>
                        <span className="text-[8px] font-black uppercase text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md animate-pulse">
                          📸 EJEMPLO DE CAPTURA REAL
                        </span>
                      </div>

                      {/* Mock UI body */}
                      <div className="p-5 bg-white space-y-4 text-left text-[11px] relative">
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 relative">
                          <div className="absolute top-2 right-2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">1</span>
                            <span>REGLA INMUTABLE</span>
                          </div>

                          <Info className="text-rose-700 shrink-0 mt-0.5" size={18} />
                          <div className="text-[10px] text-rose-900 leading-relaxed font-semibold pr-24">
                            Módulo de Cartera Mensual: Descargue el formato estructurado antes de intentar cargar datos de arriendo. La alteración de nombres de columnas invalida la validación del sistema síncronamente.
                          </div>
                        </div>

                        {/* Plantilla Action Box */}
                        <div className="border border-slate-200 p-4 bg-slate-50 rounded-2xl flex justify-between items-center relative">
                          <div className="absolute top-1/2 -translate-y-1/2 right-48 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm z-10">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">2</span>
                            <span>DESCARGA DIRECTA</span>
                          </div>

                          <div>
                            <p className="font-extrabold text-[11px] text-slate-800">Plantilla_Reporte_Morosidad_Mensual.xlsx</p>
                            <p className="text-[9.5px] text-slate-400 font-bold">Contiene celdas protegidas para evitar errores de digitación de analistas.</p>
                          </div>
                          <button type="button" className="bg-emerald-600 text-white px-4 py-2 font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 text-[10px] pointer-events-none shadow-md">
                            <FileDown size={13} /> Descargar Plantilla (.xlsx)
                          </button>
                        </div>

                        {/* SUBMISSION / PROCESS BLOCK (Badge 3) */}
                        <div className="border border-dashed border-rose-200 p-4 bg-rose-50/30 rounded-2xl flex justify-between items-center relative">
                          <div className="absolute top-1/2 -translate-y-1/2 right-48 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm z-10">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">3</span>
                            <span>CARGAR COMPLETADO</span>
                          </div>

                          <div>
                            <p className="font-extrabold text-[11px] text-slate-800">Cargar Archivo Completado</p>
                            <p className="text-[9.5px] text-slate-400 font-bold">Procese las morosidades directamente tras llenar la planilla.</p>
                          </div>
                          <button type="button" className="bg-[#0B3C5D] text-white px-4 py-2 font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 text-[10px] pointer-events-none shadow-md">
                            <Upload size={13} /> Subir Reporte Lleno
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Explanation Grid */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-900 tracking-wide flex items-center gap-1.5">
                        <Monitor size={14} className="text-rose-700 animate-pulse" /> ANÁLISIS EXPLICATIVO DE LA CAPTURA 4 (REPORTE DE MOROSOS):
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-rose-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-rose-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">1</span>
                            PROTOCOLO INMUTABLE DE FECHAS
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Cada descarga incluye una marca temporal encriptada que la asocia al mes de facturación actual. El sistema rechaza planillas antiguas.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-emerald-800 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-emerald-700 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">2</span>
                            BOTÓN DE FORMATO ESTÁNDAR
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Descarga directa del archivo de Excel estructurado desde Firebase. Garantiza que la estructura sea 100% compatible con el cargador.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-rose-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-rose-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">3</span>
                            PROCESAMIENTO CONSOLIDADO
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Una vez completada la plantilla, se carga en el sistema para calcular el interés penal y actualizar el ledger de cuentas por cobrar.
                          </p>
                        </div>
                      </div>

                      {/* Sequential Process Steps */}
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 mt-3 text-left">
                        <h5 className="text-[10px] font-black text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="bg-rose-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8.5px] font-mono">1-3</span>
                          PASOS DEL PROCESO DE CARTERA MOROSA A SEGUIR EN ESTA PANTALLA:
                        </h5>
                        <ol className="space-y-2.5 text-[9.5px] text-slate-700 font-semibold pl-1">
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">1</span>
                            <div>
                              <strong>Paso 1: Lectura de Advertencias y Reglas de Negocio</strong> - Revise la <span className="text-rose-700 font-extrabold">Regla Inmutable de Consistencia (1)</span> para comprender los requisitos del periodo de cobro y evitar la alteración de nombres de columnas.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">2</span>
                            <div>
                              <strong>Paso 2: Descarga de la Plantilla de Trabajo</strong> - Presione el botón <span className="text-rose-700 font-extrabold">"Descargar Plantilla" (2)</span>. Esto descarga el archivo estructurado y protegido (.xlsx) para rellenar los datos de morosidad sin riesgo de digitar mal las columnas.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">3</span>
                            <div>
                              <strong>Paso 3: Carga del Reporte Completado</strong> - Complete los datos y arrastre o seleccione el archivo con el botón <span className="text-rose-700 font-extrabold">"Subir Reporte Lleno" (3)</span>. El motor contable procesará síncronamente los saldos, calculará los intereses de mora e impactará el ledger de arriendos de AssetFlow.
                            </div>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE SCREENSHOT MOCK 5: INTERRUPTOR RED NEURONAL (F0911_NN) */}
                {activeScreenshot === 5 && (
                  <div className="space-y-4 animate-in fade-in duration-300 text-left">
                    {/* Visual Browser Mockup Frame */}
                    <div className="border-2 border-indigo-300 rounded-2xl overflow-hidden shadow-md bg-white font-sans text-slate-900">
                      {/* Browser Window Header */}
                      <div className="bg-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                          <span className="ml-2 text-[10px] font-black text-slate-700 tracking-wider font-mono">CONFIGURACIÓN IA NEURONAL - F0911_NN</span>
                        </div>
                        <div className="hidden md:flex bg-white border border-slate-300 rounded-lg px-3 py-1 text-[9px] text-slate-600 items-center gap-1.5 font-mono w-96 truncate">
                          <span className="text-emerald-700 font-bold">🔒 Secure</span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-800 truncate font-bold">https://assetflow.inmobiliariapro.cl/jde/F0911_NN_neural_config</span>
                        </div>
                        <span className="text-[8px] font-black uppercase text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                          📸 EJEMPLO DE CAPTURA REAL
                        </span>
                      </div>

                      {/* Mock UI body */}
                      <div className="p-5 bg-white text-slate-900 space-y-4 text-[11px] relative">
                        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex items-center justify-between gap-4 relative">
                          <div className="absolute top-2 right-2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-xs">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">1</span>
                            <span>INTERRUPTOR EN TIEMPO REAL</span>
                          </div>

                          <div>
                            <span className="text-[8px] font-black font-mono text-indigo-900 uppercase tracking-widest block">CONTROL CENTRAL DEL MOTOR NEURONAL</span>
                            <span className="text-[12px] font-black text-slate-900 uppercase block mt-0.5">Control de Auditoría Transversal</span>
                            <span className="text-[9.5px] text-slate-700 font-bold block">Enciende o apaga la representación visual de la IA en la grilla contable.</span>
                          </div>
                          
                          {/* Simulated Switch Widget */}
                          <div className="flex items-center gap-2 bg-white p-2.5 border border-slate-300 rounded-xl shadow-xs">
                            <span className="text-[9px] font-bold text-emerald-800">● ACTIVO (ON)</span>
                            <div className="w-10 h-5 bg-emerald-600 rounded-full p-0.5 cursor-pointer relative shadow-inner">
                              <div className="w-4 h-4 bg-white rounded-full ml-auto shadow"></div>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Explanation Box */}
                        <div className="bg-slate-50 border border-slate-300 p-4 rounded-2xl text-slate-800 space-y-1 text-[10px] relative shadow-xs">
                          <div className="absolute top-2 right-2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-xs">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">2</span>
                            <span>MODO SILENCIOSO ACTIVO</span>
                          </div>

                          <p className="font-bold text-indigo-900 uppercase font-mono tracking-wider flex items-center gap-1">
                            <Cpu size={12} className="text-amber-600" /> Bypass de Visualización para Analistas:
                          </p>
                          <p className="leading-relaxed text-slate-700 text-[10px] pr-24 font-medium">
                            Si se apaga la visualización, la red neuronal de AssetFlow sigue auditando de forma silenciosa el 100% de los egresos en segundo plano. Esto oculta los grafos avanzados para simplificar la pantalla a analistas que prefieran ver solo los saldos planos de ERP.
                          </p>
                        </div>

                        {/* Status bar (Badge 3) */}
                        <div className="flex justify-between items-center text-[9.5px] text-slate-700 border-t border-slate-200 pt-3 relative font-bold">
                          <span className="font-bold uppercase tracking-wider font-mono text-slate-900">Estado del Servicio Neuronal: ACTIVO</span>
                          <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-xs z-10">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">3</span>
                            <span>BITÁCORA INTEGRADA</span>
                          </div>
                          <span className="font-mono text-emerald-800 font-extrabold bg-emerald-50 border border-emerald-300 px-2 py-1 rounded">LOG: CERO DISCREPANCIAS</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Explanation Grid */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-900 tracking-wide flex items-center gap-1.5">
                        <Monitor size={14} className="text-indigo-600 animate-pulse" /> ANÁLISIS EXPLICATIVO DE LA CAPTURA 5 (BYPASS NEURONAL):
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-indigo-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-indigo-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">1</span>
                            INTERRUPTOR PRINCIPAL (ON/OFF)
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Activa o desactiva la visualización de pesos de la red artificial. Facilita una transición visual limpia para el personal no técnico.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-emerald-800 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-emerald-700 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">2</span>
                            FILTRADO SILENCIOSO EN SEGUNDO PLANO
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Garantiza cumplimiento normativo ininterrumpido. El motor de auditoría inteligente no se detiene; solo se ocultan sus gráficos pesados.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-slate-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-slate-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">3</span>
                            BITÁCORA INTEGRADA
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Muestra el registro en tiempo real de las auditorías realizadas, confirmando que las transacciones sigan las reglas contables inmutables.
                          </p>
                        </div>
                      </div>

                      {/* Sequential Process Steps */}
                      <div className="p-3.5 bg-indigo-50 border border-indigo-150 rounded-xl space-y-2 mt-3 text-left">
                        <h5 className="text-[10px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="bg-indigo-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8.5px] font-mono">1-3</span>
                          PASOS DEL PROCESO DE CONFIGURACIÓN IA A SEGUIR EN ESTA PANTALLA:
                        </h5>
                        <ol className="space-y-2.5 text-[9.5px] text-slate-700 font-semibold pl-1">
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">1</span>
                            <div>
                              <strong>Paso 1: Control del Interruptor en Tiempo Real</strong> - Utilice el widget de <span className="text-rose-700 font-extrabold">Interruptor (1)</span> para encender (ON) o apagar (OFF) la visualización de la red neuronal en sus pantallas. Esto permite alternar entre vistas técnicas y vistas contables estándar.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">2</span>
                            <div>
                              <strong>Paso 2: Comprensión del Modo Silencioso</strong> - Lea la información del panel <span className="text-rose-700 font-extrabold">Bypass de Visualización (2)</span>. Tenga la tranquilidad de saber que apagar el switch NO detiene la auditoría inteligente, la cual sigue resguardando la integridad en segundo plano de manera silenciosa.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">3</span>
                            <div>
                              <strong>Paso 3: Monitoreo de Consistencia en la Bitácora</strong> - Inspeccione la barra de estado inferior <span className="text-rose-700 font-extrabold">Bitácora Integrada (3)</span>. Corrobore que el indicador muestre "LOG: CERO DISCREPANCIAS" para certificar que el motor de IA no ha detectado descalces ni anomalías de cumplimiento.
                            </div>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE SCREENSHOT MOCK 6: LIBRO DIARIO ERP CENTRAL (P09210 & P0911) */}
                {activeScreenshot === 6 && (
                  <div className="space-y-4 animate-in fade-in duration-300 text-left">
                    {/* Visual Browser Mockup Frame */}
                    <div className="border-2 border-slate-300 rounded-2xl overflow-hidden shadow-lg bg-slate-100 font-sans">
                      {/* Browser Window Header */}
                      <div className="bg-slate-50 px-4 py-2 flex items-center justify-between border-b border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                          <span className="ml-2 text-[10px] font-black text-slate-800 tracking-wider font-mono">LIBRO DIARIO CENTRAL - P0911</span>
                        </div>
                        <div className="hidden md:flex bg-white border border-slate-200 rounded-lg px-3 py-1 text-[9px] text-slate-500 items-center gap-1.5 font-mono w-96 truncate">
                          <span className="text-emerald-600 font-bold">🔒 Secure</span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-700 font-bold truncate">https://assetflow.inmobiliariapro.cl/contabilidad/ledger_p0911</span>
                        </div>
                        <span className="text-[8px] font-black uppercase text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md animate-pulse">
                          📸 EJEMPLO DE CAPTURA REAL
                        </span>
                      </div>

                      {/* Mock UI body */}
                      <div className="p-5 bg-white space-y-4 text-left text-[11px] text-slate-850 relative">
                        {/* Summary Numbers */}
                        <div className="grid grid-cols-3 gap-3 text-center relative">
                          <div className="absolute top-2 right-2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm z-10">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">1</span>
                            <span>CUADRE OBLIGATORIO</span>
                          </div>

                          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                            <span className="text-[8px] font-black text-slate-400 block uppercase font-mono tracking-wider">Total DEBER</span>
                            <span className="text-indigo-700 font-black text-[12px] font-mono block mt-0.5">$15.420.000</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                            <span className="text-[8px] font-black text-slate-400 block uppercase font-mono tracking-wider">Total HABER</span>
                            <span className="text-indigo-700 font-black text-[12px] font-mono block mt-0.5">$15.420.000</span>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex flex-col justify-center">
                            <span className="text-[8px] font-black text-emerald-800 block uppercase font-mono tracking-wider">ESTADO CONTABLE</span>
                            <span className="text-emerald-800 font-black text-[10px] uppercase font-mono block mt-0.5 animate-pulse">✓ CUADRADO</span>
                          </div>
                        </div>

                        {/* Ledger Lines Grid */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden text-[10px] relative">
                          <div className="absolute top-1/2 -translate-y-1/2 left-1/4 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm z-10">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">2</span>
                            <span>FILTRO DE GRILLA (QBE)</span>
                          </div>

                          <table className="w-full text-left">
                            <thead className="bg-slate-900 text-white font-mono uppercase text-[8px] tracking-wider">
                              <tr>
                                <th className="p-2 border-r border-slate-850">Lote / Folio</th>
                                <th className="p-2 border-r border-slate-850">Cuenta Contable</th>
                                <th className="p-2 border-r border-slate-850 text-right">Deber</th>
                                <th className="p-2 text-right">Haber</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                              <tr className="hover:bg-slate-50">
                                <td className="p-2 border-r">12845669 / JE</td>
                                <td className="p-2 border-r text-indigo-700 font-bold">1110.01.002 - Caja General</td>
                                <td className="p-2 border-r text-right font-black">$550.000</td>
                                <td className="p-2 text-right text-slate-300">$0</td>
                              </tr>
                              <tr className="hover:bg-slate-50">
                                <td className="p-2 border-r">12845669 / JE</td>
                                <td className="p-2 border-r text-indigo-700 font-bold">2110.05.001 - Proveedores Nac.</td>
                                <td className="p-2 border-r text-right text-slate-300">$0</td>
                                <td className="p-2 text-right font-black">$550.000</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Bottom Warning */}
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[9px] text-amber-900 leading-tight">
                          <strong>REGLA DE CONSOLIDACIÓN DIRECTA:</strong> El total de ingresos del Deber debe coincidir centavo a centavo con el Haber. Si hay un solo peso de diferencia, el botón de "Autorizar Lote" estará bloqueado preventivamente por el auditor interno.
                        </div>

                        {/* Action Bar with Post Button (Badge 3) */}
                        <div className="flex justify-between items-center pt-2 relative border-t border-slate-100 mt-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">Lote Activo: 12845669</span>
                          <div className="relative">
                            <div className="absolute left-[-115px] top-1/2 -translate-y-1/2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 z-10 shadow-sm">
                              <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">3</span>
                              <span>POSTEO DIRECTO</span>
                            </div>
                            <button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 font-black rounded-lg text-[9.5px] pointer-events-none shadow-sm flex items-center gap-1">
                              <CheckCircle2 size={12} /> Autorizar y Postear Lote
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Explanation Grid */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-900 tracking-wide flex items-center gap-1.5">
                        <Monitor size={14} className="text-indigo-600 animate-pulse" /> ANÁLISIS EXPLICATIVO DE LA CAPTURA 6 (LIBRO DIARIO CENTRAL):
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-rose-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-rose-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">1</span>
                            CUADRE MATEMÁTICO INTEGRAL
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            El sistema evalúa el balance del lote de manera síncrona. Si el Deber y Haber no coinciden, se suspende el proceso para evitar descuadres en el balance general.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-indigo-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-indigo-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">2</span>
                            GRILLAS CON FILTRO QBE (Query By Example)
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Casillas de búsqueda dinámica integradas directamente sobre cada columna. Permite aislar folios o cuentas contables al instante tipeando sobre la tabla.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-emerald-800 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-emerald-700 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">3</span>
                            POSTEO DIRECTO EN ERP
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Una vez que el lote tiene el estado "✓ CUADRADO", se habilita este botón para asentar físicamente los registros contables de arriendos en el ERP.
                          </p>
                        </div>
                      </div>

                      {/* Sequential Process Steps */}
                      <div className="p-3.5 bg-indigo-50 border border-indigo-150 rounded-xl space-y-2 mt-3 text-left">
                        <h5 className="text-[10px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="bg-indigo-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8.5px] font-mono">1-3</span>
                          PASOS DEL PROCESO DE REGISTRO EN LIBRO DIARIO A SEGUIR:
                        </h5>
                        <ol className="space-y-2.5 text-[9.5px] text-slate-700 font-semibold pl-1">
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">1</span>
                            <div>
                              <strong>Paso 1: Verificación de Cuadre Obligatorio</strong> - Inspeccione la cabecera de la <span className="text-rose-700 font-extrabold">Ficha de Cuadre (1)</span> para corroborar que el total Deber coincida exactamente con el total Haber, logrando el indicador "✓ CUADRADO" en verde.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">2</span>
                            <div>
                              <strong>Paso 2: Depuración y Búsqueda en la Grilla</strong> - Utilice la casilla del <span className="text-rose-700 font-extrabold">Filtro de Grilla QBE (2)</span> para buscar líneas específicas, tipeando directamente sobre las cabeceras de columna (por ejemplo, digitando parte de la cuenta "Caja") para filtrar dinámicamente.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">3</span>
                            <div>
                              <strong>Paso 3: Autorización y Posteo del Lote</strong> - Presione el botón <span className="text-rose-700 font-extrabold">"Autorizar y Postear Lote" (3)</span> en la barra de acción inferior para imputar de manera firme y definitiva los registros en el Libro Mayor de la organización.
                            </div>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE SCREENSHOT MOCK 7: RECEPCIÓN TÉCNICA (P4312) & MAYOR DE CUENTAS */}
                {activeScreenshot === 7 && (
                  <div className="space-y-4 animate-in fade-in duration-300 text-left">
                    {/* Visual Browser Mockup Frame */}
                    <div className="border-2 border-indigo-400 rounded-2xl overflow-hidden shadow-lg bg-slate-100 font-sans">
                      {/* Browser Window Header */}
                      <div className="bg-indigo-50 px-4 py-2 flex items-center justify-between border-b border-indigo-200">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                          <span className="ml-2 text-[10px] font-black text-indigo-900 tracking-wider font-mono">RECEPCIÓN TÉCNICA & MAYOR</span>
                        </div>
                        <div className="hidden md:flex bg-white border border-slate-200 rounded-lg px-3 py-1 text-[9px] text-slate-500 items-center gap-1.5 font-mono w-96 truncate">
                          <span className="text-emerald-600 font-bold">🔒 Secure</span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-700 font-bold truncate">https://assetflow.inmobiliariapro.cl/recepcion_tecnica/p4312_consolidated</span>
                        </div>
                        <span className="text-[8px] font-black uppercase text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md animate-pulse">
                          📸 EJEMPLO DE CAPTURA REAL
                        </span>
                      </div>

                      {/* Mock UI body */}
                      <div className="p-5 bg-white space-y-4 text-xs font-medium text-slate-800 relative">
                        {/* Alert / Callout Badge */}
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-2 text-[10px] relative">
                          <div className="absolute top-2 right-2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">1</span>
                            <span>TRAZABILIDAD EN CADENA</span>
                          </div>

                          <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                          <span>RECEPCIÓN TÉCNICA VINCULADA EN TIEMPO REAL AL LIBRO MAYOR DE COMPRAS</span>
                        </div>

                        {/* Interactive Step Visual Map */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 relative hover:bg-indigo-50/20 transition-all">
                            <span className="absolute top-1.5 right-2 bg-indigo-900 text-white text-[8px] font-black font-mono px-1.5 py-0.5 rounded">PASO 1</span>
                            <p className="font-extrabold text-indigo-900 text-[10px] uppercase font-sans mb-1">REVISIÓN DE ORDEN</p>
                            <p className="text-[9.5px] text-slate-500 leading-tight">Localizar la orden de servicio en la grilla y verificar cantidades pendientes.</p>
                          </div>
                          
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 relative hover:bg-indigo-50/20 transition-all">
                            <span className="absolute top-1.5 right-2 bg-emerald-700 text-white text-[8px] font-black font-mono px-1.5 py-0.5 rounded">PASO 2</span>
                            <p className="font-extrabold text-emerald-800 text-[10px] uppercase font-sans mb-1">CARGA DE EVIDENCIA</p>
                            <p className="text-[9.5px] text-slate-500 leading-tight">Adjuntar obligatoriamente el Acta de Conformidad y respaldo fotográfico.</p>
                          </div>

                          <div className="bg-slate-100 border border-indigo-200 rounded-xl p-3 relative hover:bg-indigo-50/20 transition-all">
                            <span className="absolute top-1.5 right-2 bg-indigo-600 text-white text-[8px] font-black font-mono px-1.5 py-0.5 rounded">PASO 3</span>
                            <div className="absolute bottom-2 right-2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm z-10">
                              <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">3</span>
                              <span>ASIENTO DE PROVISIÓN</span>
                            </div>
                            <p className="font-extrabold text-indigo-950 text-[10px] uppercase font-sans mb-1">POSTEO CONTABLE</p>
                            <p className="text-[9.5px] text-slate-500 leading-tight pr-20">Al presionar "Finalizar", el sistema postea el asiento contable de forma automática.</p>
                          </div>
                        </div>

                        {/* Mayor de cuentas linkage widget */}
                        <div className="border border-slate-200 p-3 bg-slate-50 rounded-xl relative overflow-hidden">
                          <div className="absolute top-2 right-2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">2</span>
                            <span>CONSULTA DEL MAYOR</span>
                          </div>
                          <p className="font-black font-mono text-[9px] uppercase text-slate-600 mb-1.5 flex items-center gap-1">
                            <Database size={11} className="text-indigo-600" /> Sincronía del Libro Mayor Central (Saldos Consolidados):
                          </p>
                          <div className="grid grid-cols-2 gap-3 text-center text-[10px] font-bold">
                            <div className="bg-white border p-2 rounded-xl">
                              <span className="block text-slate-400 text-[8.5px] uppercase font-mono">Último Cierre</span>
                              <span className="text-slate-800 font-mono font-black text-[11px]">Saldos al Día</span>
                            </div>
                            <div className="bg-indigo-50 border border-indigo-150 p-2 rounded-xl">
                              <span className="block text-indigo-700 text-[8.5px] uppercase font-mono">Consistencia de Caja</span>
                              <span className="text-indigo-900 font-bold uppercase text-[10px]">Cuadrado y Auditado</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Explanation Grid */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-900 tracking-wide flex items-center gap-1.5">
                        <Monitor size={14} className="text-indigo-700 animate-pulse" /> ANÁLISIS EXPLICATIVO DE LA CAPTURA 7 (RECEPCIÓN & MAYOR):
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-rose-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-rose-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">1</span>
                            VINCULACIÓN DOCUMENTAL COMPLETA
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            La recepción de mercadería/obra genera de forma síncrona la provisión contable en el Libro Mayor, permitiendo auditoría cruzada en cualquier momento.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-emerald-800 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-emerald-700 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">2</span>
                            CONSULTA DE SALDOS INMEDIATA
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Acceso directo a la consulta de sábanas de saldos contables, garantizando transparencia forense para las revisiones de contraloría.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-indigo-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-indigo-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">3</span>
                            ASIENTO CONTABLE AUTOMÁTICO
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            El sistema genera automáticamente el asiento contable de provisión en el Libro Mayor centralizado, eliminando la digitación manual y descalces de cuentas.
                          </p>
                        </div>
                      </div>

                      {/* Sequential Process Steps */}
                      <div className="p-3.5 bg-indigo-50 border border-indigo-150 rounded-xl space-y-2 mt-3 text-left">
                        <h5 className="text-[10px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="bg-indigo-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8.5px] font-mono">1-3</span>
                          PASOS DEL PROCESO DE RECEPCIÓN TÉCNICA Y AUDITORÍA DE MAYOR:
                        </h5>
                        <ol className="space-y-2.5 text-[9.5px] text-slate-700 font-semibold pl-1">
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">1</span>
                            <div>
                              <strong>Paso 1: Revisión y Recepción Técnica en Cadena</strong> - Localice la orden de compra respectiva en la grilla. El sistema activará la <span className="text-rose-700 font-extrabold">Trazabilidad en Cadena (1)</span> para vincular las cantidades físicas recibidas con los compromisos financieros.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">2</span>
                            <div>
                              <strong>Paso 2: Carga de Respaldo Contable y Evidencias</strong> - Adjunte el Acta de Conformidad y los respaldos fotográficos obligatorios de la obra para habilitar el gatillo de posteo, garantizando que cada provisión contable posea un respaldo forense.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">3</span>
                            <div>
                              <strong>Paso 3: Posteo y Verificación en el Libro Mayor</strong> - Dispare el <span className="text-rose-700 font-extrabold">Asiento de Provisión (3)</span>. Luego, verifique el estado del balance en tiempo real consultando la sección de <span className="text-rose-700 font-extrabold">Consulta de Mayor de Cuentas (2)</span> para confirmar que los saldos se actualicen instantánea y síncronamente en el estado "Cuadrado y Auditado".
                            </div>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE SCREENSHOT MOCK 8: MAPA INTERACTIVO DE LA SUITE & BATCH R98403S */}
                {activeScreenshot === 8 && (
                  <div className="space-y-4 animate-in fade-in duration-300 text-left">
                    {/* Visual Browser Mockup Frame */}
                    <div className="border-2 border-amber-300 rounded-2xl overflow-hidden shadow-lg bg-slate-100 font-sans">
                      {/* Browser Window Header */}
                      <div className="bg-amber-50 px-4 py-2 flex items-center justify-between border-b border-amber-200">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                          <span className="ml-2 text-[10px] font-black text-amber-800 tracking-wider font-mono">MAPA INTERACTIVO ERP & BATCH - F0000S</span>
                        </div>
                        <div className="hidden md:flex bg-white border border-slate-200 rounded-lg px-3 py-1 text-[9px] text-slate-500 items-center gap-1.5 font-mono w-96 truncate">
                          <span className="text-emerald-600 font-bold">🔒 Secure</span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-700 font-bold truncate">https://assetflow.inmobiliariapro.cl/jde/F0000S_suite_map</span>
                        </div>
                        <span className="text-[8px] font-black uppercase text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md animate-pulse">
                          📸 NUEVA CAPTURA RECIENTE
                        </span>
                      </div>

                      {/* Mock UI body */}
                      <div className="p-5 bg-white space-y-4 text-xs font-medium text-slate-800 relative">
                        {/* Callout Badge */}
                        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl font-bold flex items-center gap-2 text-[10px] relative">
                          <div className="absolute top-2 right-2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">1</span>
                            <span>MAPEO MAESTRO</span>
                          </div>

                          <Sliders size={16} className="text-amber-700 shrink-0" />
                          <span>DIAGRAMA DE BLOQUES MULTINIVEL DE LA SUITE ASSETFLOW ENTERPRISE</span>
                        </div>

                        {/* Interactive diagram mock layout */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[9px] font-bold font-sans">
                          <div className="bg-amber-50 border-2 border-amber-400 p-2 rounded-lg">
                            <span className="block text-[#0B3C5D]">Financials</span>
                            <span className="text-[7.5px] font-mono text-slate-400">F0911 / F0901</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-250 p-2 rounded-lg">
                            <span className="block text-slate-600">Supply Chain</span>
                            <span className="text-[7.5px] font-mono text-slate-400">F0401 / F0101</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-250 p-2 rounded-lg">
                            <span className="block text-slate-600">Real Estate</span>
                            <span className="text-[7.5px] font-mono text-slate-400">F15017 / F1201</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-250 p-2 rounded-lg">
                            <span className="block text-slate-600">Work Orders</span>
                            <span className="text-[7.5px] font-mono text-slate-400">F4801 / F4312</span>
                          </div>
                        </div>

                        {/* Batch runner mock */}
                        <div className="border border-slate-200 p-3 bg-slate-900 text-slate-300 rounded-xl relative overflow-hidden">
                          <div className="absolute top-2 right-2 bg-rose-600 border border-rose-700 text-white text-[8px] font-black font-mono uppercase px-2 py-0.5 animate-pulse rounded-md flex items-center gap-1 shadow-sm">
                            <span className="bg-white text-rose-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black">2</span>
                            <span>PROCESO BATCH</span>
                          </div>
                          <p className="font-black font-mono text-[9px] uppercase text-amber-400 mb-1 flex items-center gap-1">
                            <RefreshCw size={11} className="text-amber-400 animate-spin" /> Batch de Integridad Referencial R98403S:
                          </p>
                          <div className="font-mono text-[8px] bg-black/50 p-2 rounded-lg space-y-0.5 text-slate-400">
                            <p className="text-emerald-400">R98403S // INICIANDO VALIDACIÓN DE INTEGRIDAD CONTABLE GENERAL...</p>
                            <p>  - VALIDANDO DIRECCIONES EN F0101 CONTRA ROLES EN F15017... [OK]</p>
                            <p>  - BALANCEANDO ASIENTOS F0911 CONTRA SALDOS MAYOR F0902... [OK]</p>
                            <p className="text-emerald-400">STATUS: PROCESO BATCH EJECUTADO EXITOSAMENTE. CERO INCONSISTENCIAS.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Explanation Grid */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-900 tracking-wide flex items-center gap-1.5">
                        <Monitor size={14} className="text-amber-700 animate-pulse" /> ANÁLISIS EXPLICATIVO DE LA CAPTURA 8 (MAPA DE SUITE & BATCH):
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-rose-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-rose-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">1</span>
                            ORGANIGRAMA MULTINIVEL ACTIVO
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Representación estructurada de AssetFlow Enterprise dividida en Suites, Tools y Platforms. Permite la navegación rápida y la inspección técnica al hacer clic.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-emerald-800 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-emerald-700 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">2</span>
                            CONSOLA BATCH CENTRALIZADA
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Módulo interactivo para forzar la sincronización y validación cruzada. El proceso R98403S certifica que no existan descalces lógicos de datos en base de datos.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-indigo-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-indigo-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">3</span>
                            ACCESO FAST PATH DIRECTO
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            El panel de inspección incluye botones de ruteo rápido. Al hacer clic, navega instantáneamente al formulario real (ej. P0911 o P04012) ahorrando tiempo.
                          </p>
                        </div>
                      </div>

                      {/* Sequential Process Steps */}
                      <div className="p-3.5 bg-amber-50 border border-amber-150 rounded-xl space-y-2 mt-3 text-left font-sans">
                        <h5 className="text-[10px] font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="bg-amber-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8.5px] font-mono">1-3</span>
                          PASOS DEL PROCESO DE CONTROL DEL MAPA DE LA SUITE:
                        </h5>
                        <ol className="space-y-2.5 text-[9.5px] text-slate-700 font-semibold pl-1">
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">1</span>
                            <div>
                              <strong>Paso 1: Navegar e Inspeccionar el Organigrama de la Suite</strong> - Observe el diagrama de bloques ERP. Haga clic en cualquiera de los bloques (por ejemplo, "Financial Management") para visualizar sus códigos de aplicación, base de datos asociados y métricas de consistencia en vivo.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">2</span>
                            <div>
                              <strong>Paso 2: Lanzamiento de la Consola de Auditoría Batch R98403S</strong> - En el panel inferior, haga clic en "Ejecutar Proceso Batch R98403S". El sistema simulará la auditoría forense transversal de base de datos síncronamente, imprimiendo el progreso en el terminal de comandos interactivo.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-[#0B3C5D] text-[#FFCC00] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-mono">3</span>
                            <div>
                              <strong>Paso 3: Redirección Inteligente Fast Path</strong> - Si necesita operar directamente sobre el módulo inspeccionado, haga clic en el botón de redirección de la parte inferior para que el sistema le traslade directamente a ese formulario real dentro del software.
                            </div>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE SCREENSHOT MOCK 9: PORTAL LABORAL (P09OWJOB) & CONTROL RBAC (P98OWSEC) */}
                {activeScreenshot === 9 && (
                  <div className="space-y-4 animate-in fade-in duration-300 text-left">
                    {/* Visual Browser Mockup Frame */}
                    <div className="border-2 border-indigo-400 rounded-2xl overflow-hidden shadow-lg bg-slate-100 font-sans">
                      {/* Browser Window Header */}
                      <div className="bg-[#0B3C5D] px-4 py-2 flex items-center justify-between border-b border-[#07263b] text-white">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 ml-2">
                            P09OWJOB & P98OWSEC • BÚSQUEDA DE EMPLEO CHILE & CONTROL RBAC ZERO-TRUST
                          </span>
                        </div>
                        <span className="text-[8px] font-mono bg-[#FFCC00] text-[#0B3C5D] px-2 py-0.5 rounded font-black uppercase">
                          📸 CAPTURA 9
                        </span>
                      </div>

                      {/* Browser URL Bar */}
                      <div className="bg-slate-50 px-4 py-1.5 border-b border-slate-200 flex items-center gap-2 text-[10px] font-mono text-slate-500">
                        <Lock size={10} className="text-emerald-600" />
                        <span className="text-slate-400">https://</span>
                        <span className="text-slate-700 font-bold">assetflow.inmobiliariapro.cl/empleo?portal=empleo</span>
                      </div>

                      {/* Mockup Body: Two side-by-side modules */}
                      <div className="p-4 bg-slate-50 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Left Mockup Panel: Login con Ficha de Accesos */}
                          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-[10.5px] font-black text-slate-800 uppercase flex items-center gap-1.5">
                                <ShieldCheck size={14} className="text-[#0B3C5D]" /> Control de Acceso RBAC
                              </span>
                              <span className="text-[8px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                                P98OWSEC
                              </span>
                            </div>
                            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 space-y-1.5 text-[9.5px]">
                              <div className="flex justify-between items-center">
                                <strong className="text-slate-800">JUAN ANDRÉS PIÑA</strong>
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-black text-[7.5px]">SOLO EMPLEO</span>
                              </div>
                              <p className="text-slate-500 text-[8.5px]">Postulante Laboral / Candidato</p>
                              <div className="bg-emerald-50 border border-emerald-200 rounded p-1.5 text-emerald-800 text-[8.5px]">
                                ✓ Acceso Permitido: Búsqueda de Empleo Chile (P09OWJOB) y Match CV
                              </div>
                              <div className="bg-rose-50 border border-rose-200 rounded p-1.5 text-rose-800 text-[8.5px]">
                                ✕ Restricción Activa: Bloqueo de Finanzas, Contratos y OTs
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="bg-[#0B3C5D] text-[#FFCC00] text-[9px] font-black px-2 py-1 rounded w-full text-center">
                                ⚡ INGRESO DIRECTO (1 CLIC)
                              </span>
                            </div>
                          </div>

                          {/* Right Mockup Panel: Portal de Empleo */}
                          <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                              <span className="text-[10.5px] font-black text-amber-950 uppercase flex items-center gap-1.5">
                                <Briefcase size={14} className="text-amber-600" /> Búsqueda de Empleo Chile & Match CV
                              </span>
                              <span className="text-[8px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                                P09OWJOB
                              </span>
                            </div>
                            <div className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-150 space-y-1 text-[9.5px]">
                              <p className="font-bold text-slate-800">Buscador Multicanal (ChileTrabajos, Laborum, Computrabajo)</p>
                              <p className="text-slate-600 text-[8.5px]">Filtros por Región (RM, Valparaíso, Biobío) y Modalidad Remoto/Presencial</p>
                              <div className="bg-white p-2 rounded border border-amber-200 text-[8.5px] space-y-0.5">
                                <span className="font-black text-emerald-700">Analista de Control Interno / ERP • 98% Match</span>
                                <p className="text-slate-500">Inmobiliaria & Holding Financiero • Las Condes</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="bg-amber-600 text-white text-[9px] font-black px-2 py-1 rounded w-full text-center">
                                🤖 GENERAR CARTA DE PRESENTACIÓN CON IA
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>

                    {/* Technical Anatomy Notes */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-600" />
                        ANATOMÍA TÉCNICA DEL PORTAL LABORAL Y SEGURIDAD RBAC
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-indigo-700 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-indigo-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">1</span>
                            DEEP LINK DIRECTO (?portal=empleo)
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Permite compartir un enlace directo con amigos o candidatos. El sistema autentica la sesión de forma inmediata en el perfil laboral sin solicitar contraseña ni exponer datos del ERP.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-amber-800 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-amber-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">2</span>
                            BLINDAJE Y AISLAMIENTO ZERO-TRUST
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            El rol SOLO_EMPLEO está aislado en el cliente y servidor. No puede navegar a finanzas, contratos, propiedades ni órdenes de trabajo, protegiendo al 100% la confidencialidad corporativa.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                          <p className="font-black text-emerald-800 text-[10px] uppercase flex items-center gap-1">
                            <span className="bg-emerald-700 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono">3</span>
                            HERRAMIENTAS COGNITIVAS IA
                          </p>
                          <p className="text-[9.5px] text-slate-500 leading-snug">
                            Incluye cálculo de porcentaje de compatibilidad (Match CV) entre el currículum del postulante y los requisitos de cada oferta, junto con generador automático de cartas en formato Word y PDF.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE SCREENSHOT MOCK 10: APROBACIONES JERÁRQUICAS (P43081) & VERIFICADOR BLOCKCHAIN SHA-256 (F4209) */}
                {activeScreenshot === 10 && (
                  <div className="space-y-4 animate-in fade-in duration-300 text-left">
                    <div className="border-2 border-emerald-500 rounded-2xl overflow-hidden shadow-lg bg-slate-100 font-sans">
                      <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-emerald-500 text-white">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 ml-2 font-mono">
                            P43081 / W43081C / F4209 • APROBACIÓN DE ÓRDENES &amp; CADENA DE BLOQUES SHA-256 (APPEND-ONLY)
                          </span>
                        </div>
                        <span className="text-[8px] font-mono bg-emerald-400 text-slate-950 px-2 py-0.5 rounded font-black uppercase">
                          📸 CAPTURA 10 • NUEVO
                        </span>
                      </div>

                      <div className="p-4 bg-white space-y-3 text-[10px]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                            <span className="text-[8px] font-black uppercase font-mono text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">[1] MENÚ CONTEXTUAL JDE (CLIC DERECHO)</span>
                            <p className="font-bold text-slate-800">Grillas P43081, P43008, P43280 y F4209</p>
                            <p className="text-slate-600 text-[9px]">Permite auditar con 7 puntos (W43081C), aprobar/rechazar, inspeccionar bloque SHA-256 o exportar a Excel con hora corta (<code>HH:mm</code>).</p>
                          </div>
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                            <span className="text-[8px] font-black uppercase font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">[2] CHECKLIST 7 PUNTOS (W43081C)</span>
                            <p className="font-bold text-slate-800">Validación Tributaria y de Control Interno</p>
                            <p className="text-slate-600 text-[9px]">Verifica umbral P43008, presupuesto CC, RUT SII, IVA 19% vs. Retención 15,25%, SoD, alcance técnico y sello SHA-256.</p>
                          </div>
                          <div className="p-3 bg-slate-900 text-white border border-slate-700 rounded-xl space-y-1">
                            <span className="text-[8px] font-black uppercase font-mono text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">[3] LEDGER F4209 APPEND-ONLY</span>
                            <p className="font-bold text-emerald-300">Web Crypto API SHA-256 + Merkle Root</p>
                            <p className="text-slate-300 text-[9px]">Verificador de solo lectura sin funciones de restauración histórica; rectificaciones únicamente vía Contra-Asiento (Reversal Block).</p>
                          </div>
                        </div>

                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                            DIRECTRICES OPERATIVAS DEL MÓDULO P43081 Y BITÁCORA F4209:
                          </h5>
                          <ol className="space-y-1.5 text-[9.5px] text-slate-700 font-semibold">
                            <li><strong>1. Menú Contextual Forense:</strong> Haga clic derecho sobre cualquier fila de las 4 pestañas o presione el botón <code>[#]</code> para ejecutar acciones rápidas de fila (Row Exit).</li>
                            <li><strong>2. Exportación Excel con Hora Corta (HH:mm):</strong> Al exportar la bitácora <code>F4209</code> a Excel (<code>.xlsx</code>), el campo <code>timestamp</code> se formatea automáticamente como hora corta (<code>17:08</code>, <code>14:40</code>), impidiendo la notación científica.</li>
                            <li><strong>3. Verificación Criptográfica Inmutable:</strong> Utilice el botón <em>"Verificar Integridad de la Cadena de Bloques"</em> para recalcular en vivo los hashes <code>SHA-256</code> y la <strong>Raíz de Merkle</strong> bajo estricto estándar de No-Repudio.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE SCREENSHOT MOCK 11: INFORME B.4 CMF (R09322) & NCG 316 */}
                {activeScreenshot === 11 && (
                  <div className="space-y-4 animate-in fade-in duration-300 text-left">
                    <div className="border-2 border-cyan-600 rounded-2xl overflow-hidden shadow-lg bg-slate-100 font-sans">
                      <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-cyan-500 text-white">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 ml-2 font-mono">
                            R09322 • INFORME B.4 CMF (BIENES RAÍCES &amp; INVERSIONES INMOBILIARIAS • NCG 316)
                          </span>
                        </div>
                        <span className="text-[8px] font-mono bg-cyan-400 text-slate-950 px-2 py-0.5 rounded font-black uppercase">
                          📸 CAPTURA 11 • CMF REGULATORIO
                        </span>
                      </div>

                      <div className="p-4 bg-white space-y-3 text-[10px]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl space-y-1">
                            <span className="text-[8px] font-black uppercase font-mono text-cyan-800 bg-cyan-100 px-1.5 py-0.5 rounded">[1] SEPARACIÓN NCG 316 (CMF)</span>
                            <p className="font-bold text-slate-800">Terreno No Depreciable vs. Construcción</p>
                            <p className="text-slate-600 text-[9px]">Desglose analítico obligatorio de valorización donde los terrenos no sufren depreciación económica ni contable.</p>
                          </div>
                          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                            <span className="text-[8px] font-black uppercase font-mono text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded">[2] PAGINACIÓN FDA DE ALTO RENDIMIENTO</span>
                            <p className="font-bold text-slate-800">Bloques 25 / 50 / 100 / Todas</p>
                            <p className="text-slate-600 text-[9px]">Elimina tiempos de espera y bloqueos del navegador reduciendo en un 74% la carga de memoria DOM del explorador.</p>
                          </div>
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                            <span className="text-[8px] font-black uppercase font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">[3] EXPORTADOR OFICIAL EXCEL CMF</span>
                            <p className="font-bold text-slate-800">Estructura Exacta Circular N° 1.835</p>
                            <p className="text-slate-600 text-[9px]">Planilla XLSX con autofiltros, encabezados institucionales y totales consolidados para subida al SEIL de la CMF.</p>
                          </div>
                        </div>

                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                            PASOS OPERATIVOS DEL INFORME B.4 CMF (R09322):
                          </h5>
                          <ol className="space-y-1.5 text-[9.5px] text-slate-700 font-semibold">
                            <li><strong>1. Selección de Compañía y Periodo:</strong> Filtre por Aseguradora (VIDA, GENERALES o TODAS) y el mes de reporte (mensual).</li>
                            <li><strong>2. Control de Inconsistencias:</strong> Revise las alertas del panel de diagnóstico para subsanar diferencias de avalúos o destinos no clasificados.</li>
                            <li><strong>3. Exportación y Firma:</strong> Genere el archivo <code>.xlsx</code> con el botón de exportación oficial para su visación contable.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE SCREENSHOT MOCK 12: NOTA 14 PROPIEDADES DE INVERSIÓN (R09323) */}
                {activeScreenshot === 12 && (
                  <div className="space-y-4 animate-in fade-in duration-300 text-left">
                    <div className="border-2 border-indigo-600 rounded-2xl overflow-hidden shadow-lg bg-slate-100 font-sans">
                      <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-indigo-500 text-white">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 ml-2 font-mono">
                            R09323 • NOTA 14: PROPIEDADES DE INVERSIÓN (NIC 40 / NIIF 13 / FECU)
                          </span>
                        </div>
                        <span className="text-[8px] font-mono bg-indigo-400 text-slate-950 px-2 py-0.5 rounded font-black uppercase">
                          📸 CAPTURA 12 • ESTADOS FINANCIEROS
                        </span>
                      </div>

                      <div className="p-4 bg-white space-y-3 text-[10px]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                            <span className="text-[8px] font-black uppercase font-mono text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded">[1] ROLL-FORWARD MATRIX DE 2 AÑOS</span>
                            <p className="font-bold text-slate-800">Conciliación de Movimientos Oficial</p>
                            <p className="text-slate-600 text-[9px]">Saldo Inicial, Adquisiciones, CAPEX, Retiros, Ajuste a Valor Razonable y Saldo Final por clases de activos.</p>
                          </div>
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                            <span className="text-[8px] font-black uppercase font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">[2] CUADRO NOI &amp; GASTOS DIRECTOS</span>
                            <p className="font-bold text-slate-800">NIC 40 §75(f) Inmuebles Arrendados vs. Vacantes</p>
                            <p className="text-slate-600 text-[9px]">Desglose de ingresos por renta vs costos directos de mantención, contribuciones territoriales y primas de seguros.</p>
                          </div>
                          <div className="p-3 bg-slate-900 text-white border border-slate-700 rounded-xl space-y-1">
                            <span className="text-[8px] font-black uppercase font-mono text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">[3] EXCEL MULTICAPA (5 PESTAÑAS)</span>
                            <p className="font-bold text-white">Conciliación, NOI, Nómina, Hipotecas y Bases</p>
                            <p className="text-slate-300 text-[9px]">Emite el libro Excel completo con fórmulas dinámicas y diseño corporativo listo para auditores externos (Big Four).</p>
                          </div>
                        </div>

                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                            DIRECTRICES DE CONCILIACIÓN CON EL INFORME B.4:
                          </h5>
                          <ol className="space-y-1.5 text-[9.5px] text-slate-700 font-semibold">
                            <li><strong>1. Cuadre de Cierre de Trimestre:</strong> Al 31 de Marzo, 30 de Junio, 30 de Septiembre y 31 de Diciembre, el saldo a valor razonable de la Nota 14 coincide con exactitud con la suma del Informe B.4 del mes de cierre.</li>
                            <li><strong>2. Tasadores CMF:</strong> Las valorizaciones incorporadas provienen de tasaciones independientes inscritas en la CMF con vigencia menor a 24 meses.</li>
                            <li><strong>3. Tratamiento Tributario (SII):</strong> El ajuste a valor razonable reconocido en resultados financieros se deduce en la RLI (Art. 31 LIR), manteniendo el control de depreciación tributaria en el registro REX.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE SCREENSHOT MOCK 13: ASISTENTE DE CONSULTA CATASTRAL DRILL-DOWN (P1501) */}
                {activeScreenshot === 13 && (
                  <div className="space-y-4 animate-in fade-in duration-300 text-left">
                    <div className="border-2 border-amber-600 rounded-2xl overflow-hidden shadow-lg bg-slate-100 font-sans">
                      <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-amber-500 text-white">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 ml-2 font-mono">
                            P1501 • ASISTENTE DE CONSULTA: MAESTRO DE CONDOMINIOS Y PROPIEDADES (DRILL-DOWN)
                          </span>
                        </div>
                        <span className="text-[8px] font-mono bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-black uppercase">
                          📸 CAPTURA 13 • GESTIÓN JERÁRQUICA
                        </span>
                      </div>

                      <div className="p-4 bg-white space-y-3 text-[10px]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                            <span className="text-[8px] font-black uppercase font-mono text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded">[1] DOBLE VISTA JERÁRQUICA</span>
                            <p className="font-bold text-slate-800">Acordeón In-line y Vista Focalizada</p>
                            <p className="text-slate-600 text-[9px]">Expande unidades directamente en la tabla con un chevron o transiciona a pantalla completa con migas de pan y contador de cartera.</p>
                          </div>
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                            <span className="text-[8px] font-black uppercase font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">[2] BÚSQUEDA CONTEXTUAL DINÁMICA</span>
                            <p className="font-bold text-slate-800">Filtro Instantáneo de 22.000+ Unidades</p>
                            <p className="text-slate-600 text-[9px]">El buscador superior se adapta al condominio seleccionado permitiendo ubicar departamentos por código, dirección o tipo en milisegundos.</p>
                          </div>
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                            <span className="text-[8px] font-black uppercase font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">[3] INTEGRACIÓN CON QBE Y EDICIÓN</span>
                            <p className="font-bold text-slate-800">Acción Directa en 1 Clic</p>
                            <p className="text-slate-600 text-[9px]">[Elegir Unidad] inyecta los filtros en la grilla principal de requerimientos y OT, mientras [Editar] permite modificar parámetros catastrales en caliente.</p>
                          </div>
                        </div>

                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                            PROCEDIMIENTO OPERATIVO DE AUDITORÍA CATASTRAL:
                          </h5>
                          <ol className="space-y-1.5 text-[9.5px] text-slate-700 font-semibold">
                            <li><strong>1. Exploración de Complejos:</strong> Consulte la lista de los 19 condominios o conjuntos consolidados. El sistema expone la comuna estandarizada, la región territorial oficial y la cantidad de unidades registradas.</li>
                            <li><strong>2. Desglose Rápido (In-Line):</strong> Al presionar el badge de unidades o el botón [Desglosar], la fila expande un panel con las primeras 9 unidades y un botón de acceso directo a la vista profunda.</li>
                            <li><strong>3. Vista Completa Drill-Down:</strong> Para conjuntos extensos (ej. Montesol II con 6.546 unidades), la vista profunda aísla el conjunto con paginación protectora de 150 unidades y botón [Filtrar Todo el Condominio] para aplicar el universo completo al Centro de Solicitudes.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: DICCIONARIO TÉCNICO DE EXCEPCIONES */}
          {/* ========================================================= */}
          {activeTab === 'DICCIONARIO' && (
            <div className="space-y-6 relative z-10 flex-1 flex flex-col font-sans">
              <div className="bg-emerald-700 text-white p-5 rounded-2xl shadow-md">
                <h2 className="text-lg font-black uppercase tracking-tight mb-1">Diccionario Técnico de Excepciones</h2>
                <p className="text-emerald-150 text-[9px] font-black uppercase tracking-widest leading-none">Protocolo Anti-Errores (PAE) • Manual De Emergencia</p>
              </div>

              <p className="text-[10.5px] text-slate-550 leading-relaxed font-semibold italic p-3.5 bg-slate-50 rounded-xl border border-dashed text-justify">
                Este listado mapea los códigos emitidos por el núcleo contable ante intentos de transgresión del compliance UAF o fallos de validación en las planillas importadas. Utilícelo para resolver cualquier incidente menor o escalarlo con la mesa central de ayuda en Help Desk (P17500).
              </p>

              <div className="border-2 border-slate-900 rounded-2xl overflow-hidden shadow-md">
                <table className="w-full text-left font-sans text-[10px]">
                  <thead className="bg-slate-900 text-white uppercase font-black text-[9px] tracking-wider">
                    <tr>
                      <th className="p-3 w-28 border-r border-white/5">Código</th>
                      <th className="p-3">Descripción de la Incidencia / Remedio</th>
                      <th className="p-3 w-24 text-center">Riesgo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ERROR_GLOSSARY.map(err => (
                      <tr key={err.code} className="hover:bg-slate-55 transition-colors">
                        <td className="p-3.5 font-bold font-mono text-indigo-700 bg-slate-50 border-r">{err.code}</td>
                        <td className="p-3.5 space-y-1">
                          <p className="font-extrabold text-slate-800 uppercase text-[9.5px]">{err.title}</p>
                          <p className="text-slate-550 leading-relaxed">{err.solution}</p>
                          <span className="text-[7.5px] bg-indigo-50 text-indigo-800 border border-indigo-150 px-1.5 py-0.5 rounded font-black uppercase inline-block">ÁREA: {err.category}</span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full shadow-3xs ${
                            err.risk === 'CRÍTICO' ? 'bg-rose-600 text-white' :
                            err.risk === 'ALTO' ? 'bg-amber-600 text-white' :
                            'bg-blue-600 text-white'
                          }`}>
                            {err.risk}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: RESUMEN DE GOBIERNO / PRESENTACIÓN */}
          {/* ========================================================= */}
          {activeTab === 'PRESENTACION' && (
            <div className="space-y-6 relative z-10 flex-1 flex flex-col font-sans">
              <div className="bg-[#0B3C5D] text-[#FFCC00] p-5 rounded-2xl shadow-md border border-[#FFCC00]/20">
                <h2 className="text-lg font-black uppercase tracking-tight mb-1">Estructura Corporativa de Gobierno de Gestión Integrada</h2>
                <p className="text-white text-[9px] font-extrabold uppercase tracking-widest leading-none">Visión de Alto Nivel para Jefaturas y Gerentes</p>
              </div>

              {/* Bento Slides */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-rose-50 border border-rose-200 text-rose-900 p-5 rounded-2xl space-y-3 shadow-3xs">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-rose-800">
                    <AlertCircle size={16} />
                    <span>Riesgos Operativos Mitigados:</span>
                  </div>
                  <ul className="space-y-1.5 text-[9.5px] font-medium leading-relaxed uppercase list-inside list-disc">
                    <li>Pérdidas de egresos fuera de maestro</li>
                    <li>Sanciones de CMF por retraso de B13/B4</li>
                    <li>Falsificación documental de beneficiarios</li>
                    <li>Descuadres crónicos de cierre</li>
                  </ul>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-5 rounded-2xl space-y-3 shadow-3xs">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-emerald-800">
                    <CheckCircle2 size={16} />
                    <span>Fortalezas Estructurales:</span>
                  </div>
                  <ul className="space-y-1.5 text-[9.5px] font-medium leading-relaxed uppercase list-inside list-disc">
                    <li>Normalización automática de datos</li>
                    <li>Trazabilidad inmutable de todas las acciones</li>
                    <li>Auditoría automatizada de RUTs</li>
                    <li>Soporte de Inteligencia Artificial</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-6 rounded-2xl border-l-4 border-[#FFCC00] space-y-3.5">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black uppercase tracking-wider">Certeza Forense (R097001 ERP Benchmark)</h3>
                    <p className="text-[#FFCC00] font-black text-[8px] uppercase tracking-widest">Sincronización robusta con logs inmutables</p>
                  </div>
                  <Lock size={28} className="text-[#FFCC00] opacity-40 animate-pulse" />
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  Toda acción de creación, guardado, rechazo, o aprobación queda guardada con la marca de workstation, el ID de usuario activo, la estampa de secuenciación única y la firma hash cruzada. Cumplimos con el estándar de contraloría forense para defender nuestros saldos en auditorías externas.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: MANUAL DEL ARRENDATARIO A PRUEBA DE ESTÚPIDOS */}
          {/* ========================================================= */}
          {activeTab === 'ARRENDATARIO' && (
            <div className="space-y-6 relative z-10 flex-1 flex flex-col font-sans">
              <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-5 rounded-2xl shadow-md border-b-4 border-rose-800 text-left">
                <h2 className="text-lg font-black uppercase tracking-tight mb-1 flex items-center gap-2">
                  <Sparkles size={20} className="text-yellow-300" />
                  MANUAL DEL ARRENDATARIO (FÁCIL Y SIN COMPLICACIONES)
                </h2>
                <p className="text-rose-100 text-[9px] font-black uppercase tracking-widest leading-none">
                  Guía Visual Paso a Paso para Reportar Fallas Técnicas en 1 Minuto
                </p>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-4 space-y-1 text-left">
                <div className="flex items-center gap-2 text-amber-900 font-black text-[10px] uppercase tracking-wider">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                  <span>REGLA NÚMERO UNO ANTES DE EMPEZAR:</span>
                </div>
                <p className="text-[10px] text-amber-800 font-bold leading-normal uppercase">
                  Este portal es EXCLUSIVO para reportar problemas de habitabilidad (goteras, enchufes malos, chapas trabadas). Si estás aburrido o quieres pedir rebaja de arriendo, habla con tu ejecutivo directamente. ¡Seamos serios!
                </p>
              </div>

              {/* PASO 1 */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all space-y-3 relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 bg-[#0B3C5D] text-[#FFCC00] text-[8px] font-black font-mono uppercase px-3 py-1 rounded-bl-xl">
                  PASO 1
                </div>
                <div className="flex gap-4 items-start">
                  <span className="w-10 h-10 rounded-full bg-[#0B3C5D] text-[#FFCC00] font-black text-lg flex items-center justify-center shrink-0">1</span>
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-slate-900 uppercase">¿Cómo Entrar al Portal?</h3>
                    <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                      En la pantalla de inicio de sesión de AssetFlow, sigue estos pasos absurdamente sencillos:
                    </p>
                    <div className="bg-slate-50 border p-3 rounded-xl space-y-2 mt-2">
                      <p className="text-[9.5px] text-slate-700 font-medium">
                        • En el combo de selección de usuario, selecciona <strong className="text-indigo-650 font-black">"ARRENDATARIO DEMO"</strong>.
                      </p>
                      <p className="text-[9.5px] text-slate-700 font-medium">
                        • En el campo de contraseña, ingresa la clave de pruebas: <strong className="text-emerald-700 font-black underline">tenant123</strong>.
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Lock size={11} /> Seguridad: Tu cuenta está blindada y solo verás tus propios datos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* PASO 2 */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all space-y-3 relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 bg-[#00C853] text-white text-[8px] font-black font-mono uppercase px-3 py-1 rounded-bl-xl">
                  PASO 2
                </div>
                <div className="flex gap-4 items-start">
                  <span className="w-10 h-10 rounded-full bg-[#00C853] text-white font-black text-lg flex items-center justify-center shrink-0">2</span>
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-slate-900 uppercase">Reportar una Falla (Goteras, Eléctrico, etc.)</h3>
                    <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                      Cuando estés adentro, verás un botón verde flotante gigante con el signo <strong className="text-lg font-black text-emerald-600">+</strong>. Tócalo y llena el formulario:
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="bg-slate-50 border p-3 rounded-xl space-y-1">
                        <p className="font-black text-[9px] text-[#0B3C5D] uppercase">✏️ Datos Obligatorios:</p>
                        <ul className="text-[9px] text-slate-600 space-y-1 font-medium list-disc pl-3 leading-relaxed">
                          <li><strong>Propiedad:</strong> Elige tu departamento de la lista.</li>
                          <li><strong>Título:</strong> Pon algo claro (ej: Gotera en baño).</li>
                          <li><strong>Descripción:</strong> Di cuándo empezó y el detalle físico.</li>
                        </ul>
                      </div>

                      <div className="bg-slate-50 border p-3 rounded-xl space-y-1">
                        <p className="font-black text-[9px] text-indigo-700 uppercase">📸 Evidencia Fotográfica (SÚPER IMPORTANTE):</p>
                        <p className="text-[9px] text-slate-500 font-medium leading-snug">
                          Presiona el ícono de la cámara para subir fotos de la falla. Si estás en celular, puedes tomar la foto directamente. ¡El técnico te lo agradecerá eternamente!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PASO 3 */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all space-y-3 relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] font-black font-mono uppercase px-3 py-1 rounded-bl-xl">
                  PASO 3
                </div>
                <div className="flex gap-4 items-start">
                  <span className="w-10 h-10 rounded-full bg-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0">3</span>
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-slate-900 uppercase">Hacer Seguimiento de tu Solicitud</h3>
                    <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                      No es necesario que llames a la oficina cada 5 minutos. El portal te muestra el avance real:
                    </p>
                    <div className="bg-slate-50 border p-3 rounded-xl space-y-2 mt-2 text-[9.5px]">
                      <p className="text-slate-700 font-medium">
                        • <strong className="text-amber-600 uppercase font-bold font-sans">Pendiente:</strong> La administración ya recibió el reporte y está coordinando.
                      </p>
                      <p className="text-slate-700 font-medium">
                        • <strong className="text-blue-600 uppercase font-bold font-sans">En Proceso:</strong> Ya se emitió una Orden de Trabajo (OT) y se asignó un contratista.
                      </p>
                      <p className="text-slate-700 font-medium">
                        • <strong className="text-emerald-700 uppercase font-bold font-sans">Solucionado:</strong> El trabajo fue ejecutado y cerrado. ¡Problema resuelto!
                      </p>
                      <p className="text-slate-500 font-semibold italic mt-1.5 pt-1.5 border-t border-slate-250">
                        * Toca la tarjeta de tu requerimiento en tu pantalla para abrir el historial detallado de notas que dejen los ejecutivos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* PASO 4 */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all space-y-3 relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 bg-[#002D62] text-white text-[8px] font-black font-mono uppercase px-3 py-1 rounded-bl-xl">
                  PASO 4
                </div>
                <div className="flex gap-4 items-start">
                  <span className="w-10 h-10 rounded-full bg-[#002D62] text-white font-black text-lg flex items-center justify-center shrink-0">4</span>
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-slate-900 uppercase">Consultar Historial de Pagos & Descargar Cartola</h3>
                    <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                      En la sección de <strong className="text-[#002D62]">Pagos Realizados</strong> puedes revisar la cartola de cumplimiento de tu contrato:
                    </p>
                    <div className="bg-slate-50 border p-3 rounded-xl space-y-2.5 mt-2 text-[9.5px]">
                      <div className="p-2.5 bg-[#001D42] text-white rounded-lg border border-slate-700 space-y-1">
                        <span className="text-[9px] font-black text-emerald-300 uppercase block">Ficha de Cumplimiento Contractual & Estado de Cuenta</span>
                        <p className="text-[9px] text-slate-200">
                          Muestra tu RUT, Inmueble asignado, Fecha de inicio del contrato, Próxima renovación y la insignia de estado de cumplimiento (<strong className="text-emerald-300">"Al día con sus obligaciones"</strong> o <strong className="text-rose-300">"Saldo Pendiente"</strong>).
                        </p>
                      </div>

                      <div className="space-y-1 text-slate-700">
                        <p>• <strong>Desglose Claro:</strong> Visualiza el <span className="font-bold text-slate-900">Monto Cobrado</span>, el <span className="font-bold text-emerald-800">Monto Pagado</span> y el saldo <span className="font-bold text-amber-800">Por Pagar</span>.</p>
                        <p>• <strong>Descarga Excel (.xlsx):</strong> Toca el botón verde <span className="bg-[#107C41] text-white px-2 py-0.5 rounded text-[8.5px] font-black">Descargar Excel</span> para exportar el historial completo a tu computador o celular.</p>
                        <p>• <strong>Descargar Cartola PDF:</strong> Toca el botón azul <span className="bg-[#002D62] text-white px-2 py-0.5 rounded text-[8.5px] font-black">Descargar Cartola PDF</span> para obtener el certificado timbrado.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RESUMEN DE SEGURIDAD */}
              <div className="bg-indigo-950 text-white p-5 rounded-2xl space-y-2 text-left border-l-4 border-rose-500">
                <h4 className="text-xs font-black uppercase text-yellow-400 flex items-center gap-1.5 font-sans">
                  🛡️ BLINDAJE DE PERMISOS (CISO AUDIT)
                </h4>
                <p className="text-[9.5px] text-indigo-100 leading-relaxed font-medium font-sans">
                  Este portal está completamente aislado del backend administrativo por diseño. El rol de <strong className="text-white">ARRENDATARIO</strong> no tiene acceso a módulos de facturación, libro de compras, caja chica, tasaciones, auditorías de Benford, balances, ni liquidaciones de garantía. Es imposible que alteres o visualices datos ajenos.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: DIAGRAMAS DE FLUJO VISIO (BPMN ENTERPRISE) */}
          {/* ========================================================= */}
          {activeTab === 'DIAGRAMAS_VISIO' && (
            <div className="flex-1 flex flex-col min-h-[600px] -mx-4 -my-4 sm:-mx-8 sm:-my-6">
              <VisioFlowchartsModule />
            </div>
          )}

          {/* ========================================================= */}
          {/* GENERAL REPORT PRINTABLE FOOTER */}
          {/* ========================================================= */}
          <div className="mt-auto pt-8 border-t-2 border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="space-y-0.5 text-center sm:text-left">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 justify-center sm:justify-start">
                <ShieldCheck size={12} className="text-emerald-700" /> Sistema Corporativo de Control Interno
              </div>
              <div className="text-[8px] font-mono text-slate-300 italic">ID_DOCUMENT: PAE-MANUAL-REF-2.0 • Sincronización de Gestión Integrada Homologada</div>
              <div className="text-[8.5px] font-mono mt-1 flex items-center gap-1.5 justify-center sm:justify-start">
                <span className="bg-[#E2ECF5] text-[#143B57] px-1.5 py-0.5 rounded font-black">ÚLTIMA ACTUALIZACIÓN:</span>
                <span className="font-bold text-slate-700">10 de Julio, 2026</span>
                <span className="text-slate-400">|</span>
                <span className="font-bold text-indigo-600">VERSIÓN 2.5 (Estable)</span>
              </div>
            </div>
            
            <div className="w-64 border-t border-slate-200 pt-2 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900">Cristian Muñoz R.</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase leading-none mt-0.5 font-mono">Control Interno Depto Inmobiliario</p>
            </div>
          </div>

        </div>
      </div>

      {showJobSearchManual && (
        <JobSearchManualModal onClose={() => setShowJobSearchManual(false)} />
      )}
    </div>
  );
};

export default ManualModal;
