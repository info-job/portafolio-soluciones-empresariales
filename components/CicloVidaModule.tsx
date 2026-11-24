import React, { useState } from 'react';
import { 
  GitFork, HelpCircle, FileText, CheckCircle2, Download, ShieldAlert, 
  ArrowRight, Landmark, Building, FileSignature, ShieldCheck, Mail, Wrench, 
  UserCheck, ClipboardCheck, DollarSign
} from 'lucide-react';
import jsPDF from 'jspdf';

interface CicloVidaModuleProps {
  currentUser: string;
}

export const CicloVidaModule: React.FC<CicloVidaModuleProps> = ({ currentUser }) => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const stepsData = [
    {
      phase: "Fase 1",
      title: "PRE-ARRIENDO Y EVALUACIÓN DE SOLVENCIA",
      subtitle: "Evaluación de postulantes y pre-reserva de propiedad",
      icon: <UserCheck size={20} className="text-indigo-600" />,
      color: "indigo",
      module: "EVALUACION_POSTULANTES",
      steps: [
        "Ingrese al módulo 'EVALUACION_POSTULANTES' en la barra lateral izquierda.",
        "Presione el botón 'Nueva Postulación' en la esquina superior derecha.",
        "Ingrese el RUT, Nombre Completo, Correo Electrónico, Teléfono e Ingresos Líquidos Mensuales del postulante.",
        "Suba los documentos de respaldo requeridos: Liquidaciones de sueldo, cotizaciones previsionales e Informe Comercial DICOM en formato PDF.",
        "Presione el botón 'Evaluar con IA' para analizar la viabilidad financiera del postulante en base al ratio de ingresos versus canon.",
        "Si los resultados son óptimos, cambie el estado de la postulación a 'APROBADO', lo que generará una pre-reserva e inmovilizará la propiedad en el pool."
      ],
      legalNote: "REGLA DE CONTROL CRÍTICA: El trámite de Debida Diligencia (Due Diligence) se aplica ÚNICAMENTE a Proveedores y Terceros que prestan servicios a AssetFlow S.A. (módulo 'PROVEEDORES' / 'DUE_DILIGENCIA'). NUNCA se debe aplicar Debida Diligencia a clientes postulantes de arriendos, quienes son calificados exclusivamente mediante su análisis de solvencia en este módulo.",
      buttonLabel: "Ir a Evaluación de Postulantes"
    },
    {
      phase: "Fase 2",
      title: "REVISIÓN DE ENTREGA (CHECK-IN) DEL INMUEBLE",
      subtitle: "Inventario físico inicial y acta con registro fotográfico",
      icon: <ClipboardCheck size={20} className="text-emerald-600" />,
      color: "emerald",
      module: "REVISION_PROPIEDADES",
      steps: [
        "Diríjase al módulo 'REVISION_PROPIEDADES' ('Revisión de Propiedades' en el menú lateral).",
        "Presione el botón 'Nueva Acta / Revisión' en la esquina superior derecha.",
        "Seleccione el contrato de arriendo respectivo (esto auto-rellenará los datos del arrendatario y propiedad).",
        "Agregue el inventario detallado de cada área (Living, Cocina, Dormitorios, etc.) utilizando los diagnósticos del listado desplegable para evitar inconsistencias de datos.",
        "Suba el set de fotos físicas de respaldo arrastrándolas directamente a la zona de carga del sistema.",
        "Firme digitalmente ingresando el nombre del ejecutivo y del inquilino, grabe el acta, y presione 'Enviar Acta' para despachar un correo certificado.",
        "El arrendatario recibirá el acta en su correo y podrá aceptarla o rechazarla formalmente en el sistema."
      ],
      legalNote: "REGLA DE CONTROL CRÍTICA: Ningún contrato de arriendo puede ser validado sin antes contar con el Acta de Entrega debidamente firmada o aceptada electrónicamente por el arrendatario, respaldando el estado inicial del activo.",
      buttonLabel: "Ir a Revisión de Propiedades"
    },
    {
      phase: "Fase 3",
      title: "SUSCRIPCIÓN DE CONTRATO Y FIANZA DE GARANTÍA",
      subtitle: "Formalización contractual y resguardo de fondos",
      icon: <FileSignature size={20} className="text-amber-600" />,
      color: "amber",
      module: "CONTRATOS_ARRIENDO",
      steps: [
        "Diríjase al módulo 'CONTRATOS_ARRIENDO' en el menú de navegación lateral.",
        "Presione el botón 'Nuevo Contrato' en la barra superior de acciones.",
        "Arrastre o cargue la copia escaneada del Contrato de Arriendo Firmado en formato PDF en la zona izquierda.",
        "Presione el botón 'Ejecutar Análisis Inteligente' para que la IA extraiga los campos Nombre, RUT, Monto y Vigencia automáticamente.",
        "En el Buscador Progresivo de la derecha, seleccione secuencialmente Región -> Comuna -> Conjunto -> Propiedad disponible.",
        "Presione 'Grabar Contrato en Base de Datos' para registrar el contrato (esto cambia la propiedad a estado 'Alquilado').",
        "REGLA DE GARANTÍA (Solo PDI): Si el inquilino es personal PDI, diríjase al módulo 'GARANTIAS', busque la garantía generada automáticamente, ingrese los datos de la transferencia y presione 'Confirmar Recepción de Fondo' para pasar a 'En Custodia'."
      ],
      legalNote: "REGLA DE CONTROL CRÍTICA: Las garantías del personal de la Policía de Investigaciones (PDI) quedan automáticamente en estado 'Pendiente de Pago' al registrar el contrato de arriendo, debiendo ser validadas en el módulo de Garantías una vez que ingrese la transferencia bancaria.",
      buttonLabel: "Ir a Contratos de Arriendo"
    },
    {
      phase: "Fase 4",
      title: "FACTURACIÓN BATCH MENSUAL R15132 Y SMTP",
      subtitle: "Automatización de cobranzas y despachos masivos",
      icon: <Mail size={20} className="text-teal-600" />,
      color: "teal",
      module: "CONTRATOS_ARRIENDO",
      steps: [
        "Ingrese al módulo 'CONTRATOS_ARRIENDO' desde el menú lateral principal.",
        "Presione el botón amarillo 'Enviar Cobros Masivos (PDI)' en la esquina superior derecha.",
        "En la consola de procesamiento, revise la lista de contratos activos vigentes que van a ser facturados.",
        "Presione el botón 'Ejecutar Proceso Batch R15132' para procesar los cobros masivos.",
        "El servidor generará de forma automática las facturas o cargos, y despachará notificaciones vía SMTP certficadas adjuntando el pre-aviso de cobro en formato PDF directamente al correo del arrendatario.",
        "Diríjase al módulo 'LIBROS_AUXILIARES' o al Libro Diario para auditar centralizadamente los ingresos contables resultantes."
      ],
      legalNote: "REGLA DE CONTROL CRÍTICA: El proceso Batch R15132 debe ser ejecutado los primeros 5 días hábiles de cada mes para mantener una correcta salud financiera y de caja en AssetFlow S.A.",
      buttonLabel: "Ir a Procesador de Facturación"
    },
    {
      phase: "Fase 5",
      title: "MANTENCIONES, REPARACIONES Y ÓRDENES DE TRABAJO",
      subtitle: "Gestión de incidencias físicas del patrimonio inmobiliario",
      icon: <Wrench size={20} className="text-rose-600" />,
      color: "rose",
      module: "ORDENES",
      steps: [
        "Diríjase al módulo 'ORDENES' en la barra lateral izquierda.",
        "Presione el botón 'Nueva Orden de Trabajo' en la barra superior de acciones.",
        "Seleccione el proveedor respectivo (previamente validado en el módulo 'PROVEEDORES' con su respectiva Debida Diligencia).",
        "Rellene los campos críticos del formulario: Categoría (Copropietario / Inquilino), Especialidad (Techumbres, Plomería, Pintura, Alfombras) y asocie el folio del documento tributario en el campo 'associatedInvoice'.",
        "Suba el presupuesto aprobado o informe técnico en formato PDF.",
        "Si los trabajos requieren pagos inmediatos pequeños, diríjase al módulo 'CAJA_CHICA', registre el egreso e impútelo directamente a la Orden de Trabajo.",
        "Una vez terminadas las reparaciones, presione 'Validar y Cerrar OT' para registrar formalmente el gasto."
      ],
      legalNote: "REGLA DE CONTROL CRÍTICA: El campo 'associatedInvoice' (Factura Asociada) y 'specialty' (Especialidad / Rubro) son obligatorios para garantizar la transparencia fiscal y permitir la deducción correspondiente en la liquidación del arriendo.",
      buttonLabel: "Ir a Órdenes de Trabajo"
    },
    {
      phase: "Fase 6",
      title: "RESTITUCIÓN, LIQUIDACIÓN Y DEVOLUCIÓN DE GARANTÍA",
      subtitle: "Término formal del arriendo, conciliación de gastos y reembolso",
      icon: <Landmark size={20} className="text-blue-600" />,
      color: "blue",
      module: "GARANTIAS",
      steps: [
        "TÉRMINO: El arrendatario desocupa la propiedad. Diríjase a 'REVISION_PROPIEDADES' y genere un acta del tipo 'Restitución (Check-Out)' para constatar el estado físico de entrega comparándolo con el inicial.",
        "LIQUIDACIÓN: Diríjase al módulo 'GARANTIAS' desde el menú principal.",
        "Busque la garantía correspondiente en estado 'En Custodia' y presione el botón 'Iniciar Proceso de Liquidación'.",
        "Presione 'Cargar Historial de OTs' para importar de forma automática todas las deudas u Órdenes de Trabajo ejecutadas debido a daños imputables al inquilino.",
        "Asocie los folios de las facturas ingresadas por daños para justificar las deducciones extraordinarias.",
        "Presione 'Calcular Balance de Devolución' para determinar el remanente neto a favor del cliente.",
        "Proceda a la devolución bancaria, asiente los datos de la transferencia, y presione 'Consolidar y Finalizar' para cambiar el contrato a 'Finiquitado' y liberar automáticamente la propiedad a estado 'Disponible'."
      ],
      legalNote: "REGLA DE CONTROL CRÍTICA: Bajo ninguna circunstancia se debe devolver una garantía sin antes cotejar el acta de restitución física (Check-out) y descontar las OTs pendientes del inquilino asentadas con facturas válidas.",
      buttonLabel: "Ir a Liquidación de Garantías"
    }
  ];

  // PDF Generator Function updated with refined precise instructions and due diligence logic correction
  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const margin = 15;
    
    // Page 1 Header
    doc.setFillColor(11, 60, 93); // AssetFlow Slate-Blue
    doc.rect(10, 10, 190, 25, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("ASSETFLOW S.A. - DEPARTAMENTO INMOBILIARIO", margin, 20);
    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    doc.text("Diagrama y Manual Operativo del Ciclo de Vida del Arriendo v3.0", margin, 28);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-CL')} | Autor: CONTROL INTERNO ASSETFLOW (ID: ${currentUser.toUpperCase()}) | Estado: ACTIVO`, 15, 42);
    
    // Render 6 Stages Boxes on Page 1
    const pdfStages = [
      { num: "Fase 1", title: "PRE-ARRIENDO & EVALUACIÓN COMERCIAL", desc: "Registro, análisis de solvencia con IA. No aplica Debida Diligencia (exclusivo para Proveedores).", mods: "Modulo: EVALUACION_POSTULANTES", y: 48 },
      { num: "Fase 2", title: "REVISIÓN FÍSICA DE ENTREGA (CHECK-IN)", desc: "Creación de Acta, inventario por lista desplegable de precisión y fotos inmutables.", mods: "Modulo: REVISION_PROPIEDADES", y: 82 },
      { num: "Fase 3", title: "SUSCRIPCIÓN Y FIANZA DE GARANTÍA", desc: "Carga de PDF de contrato, extracción de campos con IA, custodia de garantías PDI.", mods: "Modulos: CONTRATOS_ARRIENDO, GARANTIAS", y: 116 },
      { num: "Fase 4", title: "FACTURACIÓN BATCH MENSUAL R15132", desc: "Emisión de cargos, envío masivo certificado vía SMTP con PDF de pre-aviso.", mods: "Modulos: CONTRATOS_ARRIENDO (Billing), LIBROS_AUXILIARES", y: 150 },
      { num: "Fase 5", title: "REPARACIONES Y ÓRDENES DE TRABAJO", desc: "Mantenciones por Especialidad, egresos de Caja Chica, y registro obligatorio 'associatedInvoice'.", mods: "Modulos: ORDENES, CAJA_CHICA", y: 184 },
      { num: "Fase 6", title: "RESTITUCIÓN (CHECK-OUT) & LIQUIDACIÓN", desc: "Acta de restitución, carga de historial de OTs imputables, finiquito y liberación a Disponible.", mods: "Modulos: REVISION_PROPIEDADES, GARANTIAS", y: 218 }
    ];

    pdfStages.forEach((st, idx) => {
      // Box body
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.4);
      doc.rect(20, st.y, 170, 24, 'FD');
      
      // Indigo decoration
      doc.setFillColor(79, 70, 229);
      doc.rect(20, st.y, 3, 24, 'F');
      
      // Texts
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(79, 70, 229);
      doc.text(st.num, 26, st.y + 6);
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(st.title, 42, st.y + 6);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(st.desc, 26, st.y + 12);
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(st.mods, 26, st.y + 19);
      
      // Connective arrow
      if (idx < pdfStages.length - 1) {
        const nextY = pdfStages[idx + 1].y;
        const startY = st.y + 24;
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.4);
        doc.line(105, startY, 105, nextY);
        doc.setFillColor(148, 163, 184);
        doc.triangle(102, nextY - 3, 108, nextY - 3, 105, nextY, 'F');
      }
    });

    // Database core
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(20, 250, 170, 12, 'FD');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("NÚCLEO DE DATOS CENTRALIZADO: FIRESTORE DB / REGISTROS DE TRAZABILIDAD AUDITABLES", 105, 255, { align: "center" });
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("SISTEMA INTEGRADO DE GESTION DE PROPIEDADES ASSETFLOW", margin, 285);
    doc.text("Página 1 de 3", 195, 285, { align: "right" });

    // ==========================================
    // PAGE 2: MANUAL DETALLADO FASES 1, 2, 3
    // ==========================================
    doc.addPage();
    let page2Y = 20;

    doc.setFillColor(11, 60, 93);
    doc.rect(10, 10, 190, 14, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("MANUAL DE PROCESOS: DETALLE DE FASES OPERATIVAS (1/2)", 15, 19);

    // Section 1
    page2Y = 35;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(11, 60, 93);
    doc.text("FASE 1: PRE-ARRIENDO Y EVALUACIÓN DE SOLVENCIA COMERCIAL", margin, page2Y);
    page2Y += 5;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    const f1Texts = [
      "• Objetivo: Pre-evaluar la solvencia del postulante evitando el doble arriendo de la unidad física.",
      "• INSTRUCCIONES DE SISTEMA PASO A PASO:",
      "  1. Ingrese al módulo 'EVALUACION_POSTULANTES' en la barra lateral.",
      "  2. Presione el botón 'Nueva Postulación' e ingrese el RUT, Nombre, Correo, Teléfono e Ingresos Líquidos.",
      "  3. Cargue los documentos requeridos: Liquidaciones de sueldo, cotizaciones previsionales e Informe Commercial DICOM.",
      "  4. Presione 'Evaluar con IA'. Si califica financieramente, asigne el estado 'APROBADO' para pre-reservar la propiedad.",
      "• REGLA DE CONTROL CRÍTICA: El trámite de Debida Diligencia (Due Diligence) se aplica ÚNICAMENTE a proveedores",
      "  de servicios en el módulo PROVEEDORES y NUNCA a clientes que arriendan propiedades."
    ];
    f1Texts.forEach(line => {
      const split = doc.splitTextToSize(line, 180);
      doc.text(split, margin, page2Y);
      page2Y += (split.length * 4) + 1;
    });

    // Section 2
    page2Y += 4;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(11, 60, 93);
    doc.text("FASE 2: REVISIÓN DE ENTREGA (CHECK-IN) DEL INMUEBLE", margin, page2Y);
    page2Y += 5;

    const f2Texts = [
      "• Objetivo: Certificar el estado inicial de conservación física de la vivienda mediante acta detallada y fotos.",
      "• INSTRUCCIONES DE SISTEMA PASO A PASO:",
      "  1. Ingrese al módulo 'REVISION_PROPIEDADES' en el menú lateral principal.",
      "  2. Presione el botón 'Nueva Acta / Revisión' en la barra de acciones superior.",
      "  3. Seleccione el contrato del arrendatario respectivo para auto-completar los datos.",
      "  4. Agregue el inventario detallado de cada área (Living, Cocina, Baños) usando los listados desplegables obligatorios.",
      "  5. Cargue el set de fotos inmutables de respaldo arrastrándolas directamente a la pantalla.",
      "  6. Firme digitalmente y presione 'Enviar Acta' para notificar al arrendatario por correo certificado para su aceptación."
    ];
    f2Texts.forEach(line => {
      const split = doc.splitTextToSize(line, 180);
      doc.text(split, margin, page2Y);
      page2Y += (split.length * 4) + 1;
    });

    // Section 3
    page2Y += 4;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(11, 60, 93);
    doc.text("FASE 3: CONTRATO DE ARRIENDO Y FIANZA DE GARANTÍA", margin, page2Y);
    page2Y += 5;

    const f3Texts = [
      "• Objetivo: Suscribir legalmente el arrendamiento e ingresar la garantía de resguardo.",
      "• INSTRUCCIONES DE SISTEMA PASO A PASO:",
      "  1. Diríjase al módulo 'CONTRATOS_ARRIENDO' en el menú principal.",
      "  2. Presione 'Nuevo Contrato' y cargue la copia firmada en PDF en el sector de la izquierda.",
      "  3. Presione 'Ejecutar Análisis Inteligente' para extraer mediante IA los campos críticos de forma automática.",
      "  4. Seleccione secuencialmente en el buscador: Región -> Comuna -> Conjunto -> Propiedad disponible.",
      "  5. Guarde los datos (la propiedad pasará a estado 'Alquilado' automáticamente).",
      "  6. GARANTÍA (Solo PDI): Ingrese al módulo 'GARANTIAS', abra la fianza generada en estado 'Pendiente de Pago',",
      "     asiente los datos de la transferencia de garantía y presione 'Confirmar Recepción de Fondo' para pasar a 'En Custodia'."
    ];
    f3Texts.forEach(line => {
      const split = doc.splitTextToSize(line, 180);
      doc.text(split, margin, page2Y);
      page2Y += (split.length * 4) + 1;
    });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("SISTEMA INTEGRADO DE GESTION DE PROPIEDADES ASSETFLOW", margin, 285);
    doc.text("Página 2 de 3", 195, 285, { align: "right" });

    // ==========================================
    // PAGE 3: MANUAL DETALLADO FASES 4, 5, 6
    // ==========================================
    doc.addPage();
    let page3Y = 20;

    doc.setFillColor(11, 60, 93);
    doc.rect(10, 10, 190, 14, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("MANUAL DE PROCESOS: DETALLE DE FASES OPERATIVAS (2/2)", 15, 19);

    // Section 4
    page3Y = 35;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(11, 60, 93);
    doc.text("FASE 4: FACTURACIÓN BATCH MENSUAL R15132", margin, page3Y);
    page3Y += 5;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    const f4Texts = [
      "• Objetivo: Automatizar el cargo mensual de arriendo de manera masiva con envío inmediato.",
      "• INSTRUCCIONES DE SISTEMA PASO A PASO:",
      "  1. Ingrese al módulo 'CONTRATOS_ARRIENDO' en el menú lateral principal.",
      "  2. Presione el botón amarillo 'Enviar Cobros Masivos (PDI)'.",
      "  3. Verifique la nómina de arrendatarios vigentes y presione 'Ejecutar Proceso Batch R15132'.",
      "  4. El servidor procesará los cargos y despachará los avisos en formato PDF vía SMTP directamente al cliente."
    ];
    f4Texts.forEach(line => {
      const split = doc.splitTextToSize(line, 180);
      doc.text(split, margin, page3Y);
      page3Y += (split.length * 4) + 1;
    });

    // Section 5
    page3Y += 4;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(11, 60, 93);
    doc.text("FASE 5: MANTENCIONES, REPARACIONES Y ÓRDENES DE TRABAJO (OT)", margin, page3Y);
    page3Y += 5;

    const f5Texts = [
      "• Objetivo: Gestionar reparaciones físicas respaldando tributariamente cada egreso mediante control de Especialidades.",
      "• INSTRUCCIONES DE SISTEMA PASO A PASO:",
      "  1. Diríjase al módulo 'ORDENES' en el menú lateral principal.",
      "  2. Presione el botón 'Nueva Orden de Trabajo' en la parte superior derecha.",
      "  3. Seleccione obligatoriamente la Categoría (Copropietario/Inquilino), Especialidad (Plomería, Techumbres, Pintura, etc.)",
      "     y cargue el folio de la factura fiscal en el campo 'associatedInvoice'.",
      "  4. Suba el presupuesto aprobado en PDF y asocie la propiedad respectiva.",
      "  5. Si el trabajo es menor, use el módulo 'CAJA_CHICA' e impute el egreso de efectivo directamente a la Orden de Trabajo."
    ];
    f5Texts.forEach(line => {
      const split = doc.splitTextToSize(line, 180);
      doc.text(split, margin, page3Y);
      page3Y += (split.length * 4) + 1;
    });

    // Section 6
    page3Y += 4;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(11, 60, 93);
    doc.text("FASE 6: TÉRMINO, REVISIÓN DE RESTITUCIÓN Y LIQUIDACIÓN DE GARANTÍA", margin, page3Y);
    page3Y += 5;

    const f6Texts = [
      "• Objetivo: Finiquitar ordenadamente el contrato, evaluar deterioros físicos finales y descontar reparaciones antes de reembolsar.",
      "• INSTRUCCIONES DE SISTEMA PASO A PASO:",
      "  1. CHECK-OUT: Diríjase a 'REVISION_PROPIEDADES' y levante un acta del tipo 'Restitución de la Vivienda' detallando deterioros.",
      "  2. LIQUIDACIÓN: Ingrese al módulo 'GARANTIAS' desde el menú principal.",
      "  3. Busque la garantía correspondiente en estado 'En Custodia' y presione 'Iniciar Proceso de Liquidación'.",
      "  4. Presione 'Cargar Historial de OTs' para importar las reparaciones imputadas al arrendatario asentadas con facturas.",
      "  5. Presione 'Calcular Balance de Devolución' para establecer el saldo final a devolver.",
      "  6. Registre los datos del reembolso bancario y presione 'Consolidar y Finalizar' (libera la propiedad automáticamente)."
    ];
    f6Texts.forEach(line => {
      const split = doc.splitTextToSize(line, 180);
      doc.text(split, margin, page3Y);
      page3Y += (split.length * 4) + 1;
    });

    // Control sign-off
    page3Y += 10;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, page3Y, 180, 20, 'FD');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("CERTIFICACIÓN OPERATIVA DE CONTROL INTERNO - ASSETFLOW S.A.", 20, page3Y + 6);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text("Este manual ha sido revisado por la Dirección de Control Interno, certificando que la debida diligencia aplica únicamente a proveedores", 20, page3Y + 11);
    doc.text("y no a clientes, y que las actas físicas por lista desplegable son de uso obligatorio para Check-in y Check-out.", 20, page3Y + 15);

    // Footer Page 3
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("SISTEMA INTEGRADO DE GESTION DE PROPIEDADES ASSETFLOW", margin, 285);
    doc.text("Página 3 de 3", 195, 285, { align: "right" });

    // Download PDF trigger
    doc.save("Manual_Ciclo_Vida_Arriendos_AssetFlow_Refinado.pdf");
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      
      {/* HEADER BAR */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitFork size={24} className="text-indigo-600 animate-spin-slow" />
            <h1 className="text-xl font-extrabold font-sans text-slate-800 uppercase tracking-tight">
              Ciclo de Vida y Manual del Arriendo
            </h1>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
            Relación de Módulos e Instrucciones Operativas de Control Interno - AssetFlow S.A.
          </p>
        </div>
        <button
          onClick={handleGeneratePDF}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-lg border border-emerald-700 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Download size={15} />
          Descargar Manual PDF Completo (3 Págs)
        </button>
      </div>

      {/* WARNING ALERT FOR DUE DILIGENCE CLARIFICATION (User Request 4) */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex gap-3.5 items-start">
        <ShieldAlert size={22} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="text-xs font-black text-amber-800 uppercase block tracking-wider">
            Aclaración de Cumplimiento & Debida Diligencia (Control Interno)
          </span>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            Se rectifica la lógica del sistema conforme a la normativa de Auditoría: <strong>El trámite de Debida Diligencia (Due Diligence) se aplica exclusivamente a los Proveedores</strong> que prestan servicios técnicos a AssetFlow S.A. (Especialidades de mantención), y <strong>NUNCA se debe aplicar a los clientes arrendatarios</strong> de las propiedades, quienes únicamente son calificados mediante su análisis crediticio y solvencia laboral en el módulo de Postulantes.
          </p>
        </div>
      </div>

      {/* ROADMAP GRAPHICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Interactive Timeline */}
        <div className="lg:col-span-1 bg-white p-5 rounded-lg border border-slate-200 shadow-3xs flex flex-col gap-4">
          <span className="text-xs font-black text-slate-700 uppercase tracking-widest block border-b border-slate-100 pb-2">
            Fases del Ciclo de Vida
          </span>
          <div className="flex flex-col gap-3">
            {stepsData.map((step, idx) => (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  activeStep === idx 
                    ? 'bg-indigo-50/50 border-indigo-400 shadow-2xs' 
                    : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className={`p-1.5 rounded bg-white border ${activeStep === idx ? 'border-indigo-300' : 'border-slate-200'}`}>
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{step.phase}</span>
                    {activeStep === idx && <CheckCircle2 size={11} className="text-indigo-600" />}
                  </div>
                  <span className="text-xs font-black text-slate-800 block truncate uppercase mt-0.5">{step.title}</span>
                  <span className="text-[10px] text-slate-500 block truncate mt-0.5">{step.subtitle}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Step Details and Step-by-step Instructions (User Request 6) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-slate-200 shadow-3xs flex flex-col gap-6">
          
          {/* Step Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="flex gap-3 items-center">
              <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-600">
                {stepsData[activeStep].icon}
              </div>
              <div>
                <span className="text-[10px] font-black text-indigo-600 tracking-wider uppercase">
                  Instrucciones Detalladas de la {stepsData[activeStep].phase}
                </span>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mt-0.5">
                  {stepsData[activeStep].title}
                </h2>
                <span className="text-xs text-slate-500 block mt-0.5 font-medium">
                  {stepsData[activeStep].subtitle}
                </span>
              </div>
            </div>
            
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-[10px] font-extrabold text-slate-700 uppercase font-mono">
              <Building size={11} className="text-slate-500" />
              Módulo: {stepsData[activeStep].module}
            </span>
          </div>

          {/* Operational Checklist */}
          <div>
            <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-widest block mb-3.5">
              Pasos e Instrucciones del Sistema (Guía Paso a Paso)
            </span>
            <div className="flex flex-col gap-3">
              {stepsData[activeStep].steps.map((st, sIdx) => (
                <div key={sIdx} className="flex gap-3.5 items-start bg-slate-50/50 p-3 rounded-lg border border-slate-200/55 hover:border-slate-300 transition-all">
                  <div className="h-5 w-5 bg-white border border-slate-300 rounded-full flex items-center justify-center font-bold text-slate-600 text-[10px] shrink-0 shadow-3xs">
                    {sIdx + 1}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {st}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Legal / Control Note */}
          <div className="mt-auto bg-slate-900 text-slate-200 p-4 rounded-lg border border-slate-800">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-black text-white uppercase tracking-wider block">
                  Mandato y Control Interno
                </span>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {stepsData[activeStep].legalNote}
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default CicloVidaModule;
