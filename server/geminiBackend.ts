import { GoogleGenAI, Type } from "@google/genai";

export const SUPPLIER_CATEGORIES = [
  "SERVICIOS BÁSICOS", "CONSTRUCCIÓN Y OBRAS", "INSUMOS DE OFICINA", 
  "MANTENCIÓN TÉCNICA", "CONSULTORÍAS", "GESTIÓN INMOBILIARIA", "SERVICIO DE TASACIONES", "OTROS"
];

export interface JobOffer {
  id: string;
  title: string;
  company: string;
  portal?: string;
  portalUrl?: string;
  directApplyUrl?: string;
  location: string;
  modality?: 'Presencial' | 'Híbrido' | 'Remoto';
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  category?: string;
  description: string;
  requiredSkills?: string[];
  postedDate?: string;
  isDisabilityInclusive?: boolean;
}

const DEFAULT_EXPENSE_ACCOUNTS = [
  '5.1.01: MANTENCIÓN Y REPARACIONES',
  '5.1.02: CONTRIBUCIONES',
  '5.1.03: SEGUROS DE PROPIEDADES',
  '5.2.01: REMUNERACIONES',
  '5.2.02: HONORARIOS PROFESIONALES',
  '5.2.03: GASTOS DE OFICINA'
].join('\n');

export const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

/**
 * Universal GenerateContent Handler
 */
export async function handleGenerateContent(params: {
  model?: string;
  contents: any;
  config?: any;
}) {
  const ai = getAI();
  const model = params.model || 'gemini-3.8-flash';
  const response = await ai.models.generateContent({
    model,
    contents: params.contents,
    config: params.config
  });

  return {
    text: response.text,
    candidates: response.candidates,
    functionCalls: response.functionCalls
  };
}

/**
 * Extrae datos de un documento de caja chica (boleta/factura)
 */
export async function handlePettyCashExpense(input: string, mimeType: string = 'image/jpeg') {
  const expenseAccounts = DEFAULT_EXPENSE_ACCOUNTS;

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        parts: [
          {
            text: `Actúa como un escáner inteligente de documentos financieros para AssetFlow.
            
            TAREAS:
            1. MEJORA DE IMAGEN: Si la imagen es una foto de una boleta o factura, "escanea" el documento. Recórtalo a sus bordes, elimina el fondo innecesario, endereza la perspectiva y ajusta el contraste/brillo para que el texto sea perfectamente legible sobre fondo blanco. Devuelve esta imagen mejorada si es posible.
            
            2. EXTRACCIÓN DE DATOS: Analiza el documento y extrae la información en este formato JSON exacto:
            {
              "date": "YYYY-MM-DD",
              "amount": número,
              "supplierTaxId": "RUT del emisor",
              "documentNumber": "folio o número de documento",
              "documentType": "BOLETA" | "FACTURA" | "COMPROBANTE" | "OTRO",
              "description": "breve descripción de lo comprado",
              "supplierName": "nombre del proveedor",
              "accountCode": "código de la cuenta contable más apropiada"
            }

            CUENTAS CONTABLES DISPONIBLES (Selecciona la más adecuada basada en la descripción):
            ${expenseAccounts}
            
            Devuelve el JSON en la respuesta de texto.`
          },
          {
            inlineData: {
              mimeType,
              data: input.includes(',') ? input.split(',')[1] : input
            }
          }
        ]
      }
    ]
  });

  let extracted: any = {};
  let enhancedImage = null;

  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.text) {
        try {
          const jsonStr = part.text.replace(/```json|```/gi, '').trim();
          extracted = JSON.parse(jsonStr);
        } catch {
          // Fallback parsing regex
          const match = part.text.match(/\{[\s\S]*\}/);
          if (match) {
            try { extracted = JSON.parse(match[0]); } catch {}
          }
        }
      } else if (part.inlineData) {
        enhancedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  return { ...extracted, enhancedImage };
}

/**
 * Extrae datos de contratos de arriendo
 */
export async function handleLeaseContract(text: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        text: `Analiza este contrato de arriendo chileno y extrae la información técnica.
        
        INSTRUCCIONES DE EXTRACCIÓN:
        1. IDENTIFICACIÓN: Busca al 'Arrendatario' (quien paga por el uso).
        2. RUT: Extrae el RUT del Arrendatario. Formato: XX.XXX.XXX-X.
        3. MONTO: Busca la cláusula de 'Renta' o 'Canon'. Extrae el valor numérico mensual.
        4. VIGENCIA: Busca la fecha de inicio y término. Si es indefinido, deja 'endDate' vacío.
        5. FORMATO: Responde estrictamente en JSON.

        TEXTO DEL CONTRATO:
        ${text.substring(0, 40000)}`
      }
    ],
    config: {
      systemInstruction: "Eres un analista experto en contratos legales chilenos para AssetFlow. Si un dato no es explícito, búscalo en el contexto de las cláusulas.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tenantName: { type: Type.STRING, description: "Nombre completo de la persona o institución arrendataria" },
          tenantTaxId: { type: Type.STRING, description: "RUT del arrendatario con puntos y guion" },
          monthlyAmount: { type: Type.NUMBER, description: "Monto numérico de la renta mensual" },
          startDate: { type: Type.STRING, description: "Fecha de inicio en formato YYYY-MM-DD" },
          endDate: { type: Type.STRING, description: "Fecha de término en formato YYYY-MM-DD (opcional)" },
          renewalDate: { type: Type.STRING, description: "Fecha de próxima renovación (opcional)" },
          currency: { type: Type.STRING, enum: ["CLP", "UF"], description: "Moneda del contrato" }
        },
        required: ["tenantName", "tenantTaxId", "monthlyAmount", "startDate"]
      }
    }
  });

  const resultText = response.text;
  if (!resultText) throw new Error("La IA no devolvió texto para el contrato");
  return JSON.parse(resultText);
}

/**
 * Extrae datos de cotizaciones u ofertas de proveedores
 */
export async function handleQuoteData(input: string, mimeType: string = 'application/pdf') {
  const ai = getAI();
  const isPlain = mimeType === 'text/plain';
  const cleanData = input.includes(',') ? input.split(',')[1] : input;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        parts: [
          ...(isPlain ? [{ text: cleanData }] : [{ inlineData: { data: cleanData, mimeType } }]),
          {
            text: `Extract technical quote/proposal data. Return JSON with this structure:
            {
              "supplierName": "string",
              "supplierTaxId": "string (RUT)",
              "quoteNumber": "string",
              "date": "YYYY-MM-DD",
              "netAmount": number,
              "vatAmount": number,
              "totalAmount": number,
              "items": [
                {
                  "description": "string",
                  "quantity": number,
                  "unitPrice": number,
                  "total": number
                }
              ],
              "paymentConditions": "string",
              "validityDays": number
            }`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text.replace(/```json|```/gi, '').trim());
}

/**
 * Extrae datos de documentos oficiales
 */
export async function handleDocumentData(input: string, mimeType: string = 'application/pdf') {
  const ai = getAI();
  const cleanData = input.includes(',') ? input.split(',')[1] : input;
  const isPlain = mimeType === 'text/plain';

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        parts: [
          ...(isPlain ? [{ text: cleanData }] : [{ inlineData: { data: cleanData, mimeType } }]),
          {
            text: `Analiza este documento oficial y extrae los metadatos relevantes. Devuelve JSON:
            {
              "documentType": "OFICIO" | "CIRCULAR" | "RESOLUCION" | "CONTRATO" | "ACTA" | "OTRO",
              "folio": "número o identificador",
              "date": "YYYY-MM-DD",
              "sender": "organismo o persona emisora",
              "recipient": "destinatario",
              "subject": "materia o resumen del documento",
              "priority": "ALTA" | "MEDIA" | "BAJA",
              "requiresAction": boolean,
              "deadline": "YYYY-MM-DD (si aplica)"
            }`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text.replace(/```json|```/gi, '').trim());
}

/**
 * Clasifica un proveedor
 */
export async function handleCategorizeSupplier(description: string) {
  const ai = getAI();
  const categoriesList = SUPPLIER_CATEGORIES.join(", ");
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: `Clasifica al siguiente proveedor en una de las siguientes categorías exactas: ${categoriesList}.
    Descripción/Giro del proveedor: "${description}"
    Responde ÚNICAMENTE con el nombre de la categoría elegida, sin puntuación ni texto adicional.`
  });

  return response.text?.trim() || SUPPLIER_CATEGORIES[0];
}

/**
 * Insights financieros ejecutivos
 */
export async function handleFinancialInsights(transactions: any[]) {
  const ai = getAI();
  const summary = transactions.slice(0, 100).map(t => ({
    tipo: t.type,
    monto: t.amount,
    categoria: t.category,
    fecha: t.date,
    descripcion: t.description
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: `Analiza este resumen de transacciones financieras recientes de AssetFlow y genera un informe de insights ejecutivos (máximo 3 párrafos y 4 viñetas clave).
    Datos: ${JSON.stringify(summary)}`
  });

  return response.text || "No fue posible generar insights en este momento.";
}

/**
 * Insights de proveedores
 */
export async function handleSupplierInsights(suppliers: any[]) {
  const ai = getAI();
  const summary = suppliers.slice(0, 50).map(s => ({
    nombre: s.name,
    categoria: s.category,
    riesgo: s.riskLevel,
    estado: s.complianceStatus
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: `Analiza esta nómina de proveedores de AssetFlow y genera un resumen ejecutivo sobre cumplimiento, riesgos UAF/CMF y recomendaciones operativas.
    Datos: ${JSON.stringify(summary)}`
  });

  return response.text || "Análisis de proveedores completado con éxito.";
}

/**
 * Extrae contactos de Outlook
 */
export async function handleParseOutlookContacts(rawText: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: `Extrae la lista de contactos del siguiente texto de Outlook o libreta de direcciones.
    Devuelve un JSON array con objetos: { "name": string, "email": string, "phone": string, "company": string, "role": string }
    Texto:
    ${rawText.substring(0, 30000)}`,
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || '[]';
  return JSON.parse(text.replace(/```json|```/gi, '').trim());
}

/**
 * Genera borrador de correo electrónico
 */
export async function handleGenerateEmailDraft(reportType: string, data: any[], sender: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: `Genera un borrador formal de correo electrónico en español de Chile para el reporte tipo "${reportType}".
    Remitente: "${sender}".
    Datos del reporte: ${JSON.stringify(data.slice(0, 15))}.
    Devuelve JSON: { "subject": "asunto claro y profesional", "body": "cuerpo del correo con formato y saludo cordial" }`,
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text.replace(/```json|```/gi, '').trim());
}

/**
 * Mapeo de cabeceras de Excel de propiedades
 */
export async function handleMapPropertyExcelHeaders(headers: string[]) {
  const ai = getAI();
  const standardFields = [
    "code", "name", "address", "commune", "region", "type", "surfaceTotal", 
    "surfaceUseful", "appraisalValue", "currentTenant", "status", "destination"
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: `Mapea las siguientes cabeceras de una planilla Excel inmobiliaria a los campos estándar del sistema AssetFlow:
    Cabeceras detectadas: ${JSON.stringify(headers)}
    Campos estándar objetivo: ${JSON.stringify(standardFields)}
    Devuelve un JSON objeto donde cada clave es la cabecera original y el valor es el campo estándar correspondiente (o null si no aplica).`,
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text.replace(/```json|```/gi, '').trim());
}

/**
 * Extrae datos de proveedor desde documento
 */
export async function handleSupplierDataFromDocument(input: string) {
  const ai = getAI();
  const isPlain = !input.includes('data:');
  const cleanData = input.includes(',') ? input.split(',')[1] : input;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        parts: [
          ...(isPlain ? [{ text: cleanData }] : [{ inlineData: { data: cleanData, mimeType: "application/pdf" } }]),
          {
            text: `Analiza este documento de acreditación o inicio de actividades y extrae los datos del proveedor.
            Devuelve JSON:
            {
              "name": "Razón Social",
              "taxId": "RUT con formato XX.XXX.XXX-X",
              "businessCategory": "Giro o actividad económica",
              "address": "Dirección completa",
              "legalRepresentative": "Nombre del representante legal",
              "repTaxId": "RUT del representante",
              "constitutionDate": "YYYY-MM-DD (si se menciona)"
            }`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text.replace(/```json|```/gi, '').trim());
}

/**
 * Extrae transacciones desde documento
 */
export async function handleTransactionDataFromDocument(input: string, isIncome: boolean = false) {
  const ai = getAI();
  const cleanData = input.includes(',') ? input.split(',')[1] : input;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        parts: [
          { inlineData: { data: cleanData, mimeType: "application/pdf" } },
          {
            text: `Extrae la información contable de este comprobante de ${isIncome ? 'INGRESO' : 'EGRESO/GASTO'}.
            Devuelve JSON:
            {
              "date": "YYYY-MM-DD",
              "amount": número,
              "description": "descripción clara",
              "category": "categoría operativa",
              "documentNumber": "folio o referencia",
              "entityName": "nombre de la contraparte o cliente",
              "entityTaxId": "RUT de la contraparte",
              "paymentMethod": "TRANSFERENCIA" | "CHEQUE" | "EFECTIVO" | "OTRO"
            }`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text.replace(/```json|```/gi, '').trim());
}

/**
 * Extrae datos de póliza de seguro
 */
export async function handleInsurancePolicyData(input: string) {
  const ai = getAI();
  const cleanData = input.includes(',') ? input.split(',')[1] : input;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        parts: [
          { inlineData: { data: cleanData, mimeType: "application/pdf" } },
          {
            text: `Analiza esta póliza de seguro de propiedad o activo y extrae los datos clave.
            Devuelve JSON:
            {
              "policyNumber": "número de póliza",
              "insurer": "compañía de seguros",
              "insuredPropertyCode": "código o dirección de propiedad asegurada",
              "coverageType": "INCENDIO" | "SISMO" | "RESPONSABILIDAD_CIVIL" | "TODO_RIESGO",
              "insuredAmountUF": número en UF,
              "premiumAmountCLP": número en CLP,
              "startDate": "YYYY-MM-DD",
              "endDate": "YYYY-MM-DD",
              "deductible": "deducible estipulado"
            }`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text.replace(/```json|```/gi, '').trim());
}

/**
 * Extrae datos de informe de tasación
 */
export async function handleAppraisalData(input: string, fileName: string = '') {
  const ai = getAI();
  const cleanData = input.includes(',') ? input.split(',')[1] : input;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        parts: [
          { inlineData: { data: cleanData, mimeType: "application/pdf" } },
          {
            text: `Analiza este informe de tasación inmobiliaria en Chile (archivo: ${fileName}).
            Extrae los valores comerciales, catastrales y características del bien raíz.
            Devuelve JSON:
            {
              "propertyCode": "rol o código de inmueble",
              "address": "dirección completa",
              "commune": "comuna",
              "appraiserName": "nombre del tasador o consultora",
              "appraisalDate": "YYYY-MM-DD",
              "commercialValueUF": número en UF,
              "commercialValueCLP": número en CLP,
              "fiscalValueCLP": número en CLP (si aparece),
              "surfaceLand": número m2 terreno,
              "surfaceBuilt": número m2 construidos,
              "conservationState": "BUENO" | "REGULAR" | "EXCELENTE" | "MALO",
              "liquidationValueUF": número en UF (si aparece)
            }`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text.replace(/```json|```/gi, '').trim());
}

/**
 * Análisis de cumplimiento de pagos semanales
 */
export async function handleWeeklyPaymentCompliance(input: any) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: `Eres el auditor de control de pagos semanales de AssetFlow.
    Analiza esta nómina semanal de pagos a proveedores y evalúa:
    1. Pagos duplicados o anómalos.
    2. Proveedores con inconsistencias en RUT o riesgo UAF.
    3. Resumen y alertas directivas.
    Nómina: ${JSON.stringify(input)}
    Devuelve JSON:
    {
      "auditScore": número (1-100),
      "approvedCount": número,
      "flaggedCount": número,
      "totalAmount": número,
      "alerts": ["alerta 1", "alerta 2"],
      "executiveSummary": "resumen en un párrafo",
      "flags": [
        { "supplierName": "...", "reason": "...", "severity": "ALTA" | "MEDIA" | "BAJA" }
      ]
    }`,
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text.replace(/```json|```/gi, '').trim());
}

/**
 * Análisis de informe mensual de gastos
 */
export async function handleMonthlyExpenseReport(input: any) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: `Analiza este cierre mensual de gastos por propiedad y centro de costos.
    Datos: ${JSON.stringify(input)}
    Devuelve JSON:
    {
      "monthlyVarianceAnalysis": "análisis de desviaciones presupuestarias",
      "topCostDrivers": ["principal conductor 1", "conductor 2"],
      "savingsOpportunities": ["oportunidad 1", "oportunidad 2"],
      "cfoRiskAssessment": "evaluación de riesgo para el CFO"
    }`,
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text.replace(/```json|```/gi, '').trim());
}

/**
 * Extrae formulario de beneficiario final UAF
 */
export async function handleUafBeneficiaryForm(input: string, fileName: string = '') {
  const ai = getAI();
  const cleanData = input.includes(',') ? input.split(',')[1] : input;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        parts: [
          { inlineData: { data: cleanData, mimeType: "application/pdf" } },
          {
            text: `Analiza esta declaración jurada de beneficiario final UAF (Ley N° 19.913) - archivo: ${fileName}.
            Extrae las personas naturales con participación igual o superior al 10% y personas expuestas políticamente (PEP).
            Devuelve JSON:
            {
              "companyName": "Razón social declarante",
              "companyTaxId": "RUT declarante",
              "declarationDate": "YYYY-MM-DD",
              "beneficiaries": [
                {
                  "name": "Nombre completo",
                  "taxId": "RUT",
                  "nationality": "Nacionalidad",
                  "ownershipPercentage": número,
                  "isPep": boolean,
                  "pepPosition": "cargo público si aplica"
                }
              ],
              "hasPepInvolved": boolean,
              "complianceConclusion": "APROBADO_SIN_OBSERVACIONES" | "REQUIERE_DEBIDA_DILIGENCIA_AMPLIADA" | "RECHAZADO"
            }`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text.replace(/```json|```/gi, '').trim());
}

/**
 * Extrae certificado de dominio vigente CBR
 */
export async function handleDomainCertificateData(input: string, fileName: string = '') {
  const ai = getAI();
  const cleanData = input.includes(',') ? input.split(',')[1] : input;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        parts: [
          { inlineData: { data: cleanData, mimeType: "application/pdf" } },
          {
            text: `Analiza este Certificado de Dominio Vigente o Copia de Inscripción del Conservador de Bienes Raíces (archivo: ${fileName}).
            Devuelve JSON:
            {
              "cbrName": "Conservador de Bienes Raíces de ...",
              "fojas": "fojas",
              "numero": "número",
              "ano": número año,
              "commune": "comuna",
              "currentOwner": "nombre titular del dominio",
              "ownerTaxId": "RUT del titular si aparece",
              "issueDate": "YYYY-MM-DD",
              "hasMortgagesOrLiens": boolean (indica si se mencionan gravámenes o hipotecas),
              "verificationCode": "código de validación electrónica si posee"
            }`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text.replace(/```json|```/gi, '').trim());
}

/**
 * Búsqueda de empleo en Chile con Google Search Grounding
 */
export async function handleSearchLiveChileanJobOffers(candidateSkills: string[] = []) {
  const ai = getAI();
  const todayDateStr = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const prompt = `Actúa como un rastreador especializado de ofertas de empleo y concursos públicos en Chile.
Fecha de consulta: ${todayDateStr}.
Busca convocatorias vigentes y reales publicadas hoy o en los últimos días en:
1. Portales de empleo chilenos: Empleos Públicos (Estado de Chile), Servicio Civil / ADP, Mercado Público, Trabajando.com, Laborum, Chiletrabajos, Computrabajo, Get on Board, FirstJob, LinkedIn Empleos Chile.
2. Páginas corporativas oficiales de empresas en Chile (sección "Trabaja con Nosotros" / ATS).

Perfiles objetivos para búsqueda:
- Ingeniero Civil Industrial
- Control Interno, Auditoría Gubernamental, Auditoría CMF / UAF / CGR
- Operaciones, Gestión Inmobiliaria, Administración de Activos
- Supply Chain, Logística, Inventarios Rotativos IRA ($0 diferencias), S&OP, Working Capital
- Transformación Digital, Full-Stack, Power BI, SQL, Automatización con IA
- Jefaturas, Subgerencias y Gerencias (Sector Privado y Sector Público)

Genera un JSON con entre 6 y 10 ofertas de empleo reales y vigentes con esta estructura exacta:
[
  {
    "id": "job-live-...",
    "title": "título exacto del cargo",
    "company": "empresa o institución pública",
    "portal": "nombre del portal o canal oficial",
    "portalUrl": "URL de la oferta o portal",
    "directApplyUrl": "URL directa de postulación en sitio oficial si aplica",
    "location": "ciudad o región en Chile",
    "modality": "Presencial" | "Híbrido" | "Remoto",
    "salaryMin": 3400000,
    "salaryMax": 4600000,
    "currency": "CLP",
    "category": "Control Interno & Auditoría" | "Supply Chain & Logística" | "Operaciones & Inmobiliario" | "Transformación Digital & IT" | "Gerencia & Dirección" | "Sector Público & Gobierno",
    "description": "resumen sintético de responsabilidades, requisitos y objetivos del cargo",
    "requiredSkills": ["habilidad 1", "habilidad 2", "habilidad 3"],
    "postedDate": "Publicado hoy (${todayDateStr})",
    "isDisabilityInclusive": true
  }
]
Devuelve únicamente el bloque JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const text = response.text || '';
  const cleanText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
  const firstBracket = cleanText.indexOf('[');
  const lastBracket = cleanText.lastIndexOf(']');

  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const jsonArrStr = cleanText.substring(firstBracket, lastBracket + 1);
    const parsed = JSON.parse(jsonArrStr);
    return { newOffers: parsed, verifiedCount: parsed.length, source: 'GEMINI_SEARCH' as const };
  }

  throw new Error("No se encontraron ofertas en formato JSON");
}

/**
 * Priorización de Tareas con IA
 */
export async function handlePrioritizeTaskCenter(tasks: any[]) {
  const ai = getAI();
  const prompt = `Analiza estas tareas pendientes del sistema AssetFlow y clasifícalas por nivel de urgencia y retorno operacional.
  Tareas: ${JSON.stringify(tasks.slice(0, 30))}
  Devuelve JSON:
  {
    "prioritizedItems": [
      {
        "id": "id de la tarea",
        "rank": 1,
        "priorityScore": número (1-100),
        "urgencyLabel": "URGENCIA INMEDIATA (SLA CRÍTICO)" | "ALTA PRIORIDAD" | "PRIORIDAD MEDIA" | "MONITOREO PREVENTIVO",
        "aiRationale": "justificación técnica",
        "recommendedAction": "acción recomendada"
      }
    ],
    "executiveSummary": "resumen ejecutivo del estado de las tareas"
  }`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text.replace(/```json|```/gi, '').trim());
}

/**
 * Análisis de Debida Diligencia para DueDiligenceModule
 */
export async function handleDueDiligenceDocument(content: string, mimeType: string = 'text/plain') {
  const ai = getAI();
  const isText = mimeType === 'text/plain';
  const cleanData = content.includes(',') ? content.split(',')[1] : content;

  const prompt = `Eres un experto en cumplimiento y debida diligencia en Chile. Analiza el siguiente ${isText ? 'texto' : 'documento'} y extrae la información estructurada para un informe de Due Diligence.

  REGLAS CRÍTICAS:
  1. El 'taxId' del proveedor es el RUT chileno. Debe incluir puntos y guión (ej: 12.345.678-9).
  2. La 'date' del informe debe ser la fecha de emisión en formato YYYY-MM-DD.
  3. El 'riskLevel' debe ser uno de: "RIESGO BAJO", "RIESGO MEDIO", "RIESGO ALTO".
  4. Resume los hallazgos en una lista de strings.
  5. Idioma: Español.`;

  const parts: any[] = [{ text: prompt }];
  if (isText) {
    parts.push({ text: cleanData.substring(0, 30000) });
  } else {
    parts.push({ inlineData: { data: cleanData, mimeType } });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [{ parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          supplier: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              taxId: { type: Type.STRING },
              address: { type: Type.STRING },
              category: { type: Type.STRING },
              contactName: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING }
            },
            required: ["name", "taxId"]
          },
          report: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "Fecha de emisión en formato YYYY-MM-DD" },
              riskLevel: { type: Type.STRING, enum: ["RIESGO BAJO", "RIESGO MEDIO", "RIESGO ALTO"] },
              summary: { type: Type.STRING },
              backgroundCheck: { type: Type.STRING },
              financialAnalysis: { type: Type.STRING },
              legalStatus: { type: Type.STRING },
              reputationCheck: { type: Type.STRING },
              findings: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendations: { type: Type.STRING }
            },
            required: ["date", "riskLevel", "summary"]
          }
        },
        required: ["supplier", "report"]
      }
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text);
}

/**
 * Superpower Answer para postulaciones laborales
 */
export async function handleSuperpowerAnswer(params: {
  job: any;
  question: string;
  tone?: 'EXECUTIVE' | 'QUANTITATIVE' | 'INNOVATOR';
}) {
  const { job, question, tone = 'EXECUTIVE' } = params;
  const ai = getAI();

  const toneInstructions = {
    EXECUTIVE: 'Tono ejecutivo, seguro, cálido, profesional y humanizado. Muestra liderazgo estratégico y madurez profesional.',
    QUANTITATIVE: 'Tono enfocado en cifras duras, ahorros en pesos chilenos ($2.000M CLP), KPI de auditoría (0 observaciones) y precisión (99.5%).',
    INNOVATOR: 'Tono enfocado en la rareza del perfil híbrido: ingeniería, tecnología full-stack e IA Generativa.'
  }[tone];

  const prompt = `Actúa como Cristian Andrés Muñoz Rojas, Ingeniero Civil Industrial chileno de destacada trayectoria profesional con perfil híbrido (Ingeniería + IA + Control Interno/Auditoría CMF + Supply Chain).
Postulando al cargo: "${job.title || 'el cargo'}" en "${job.company || 'la empresa'}".
Descripción del puesto: "${job.description || ''}".
Pregunta del reclutador: "${question}".

Directrices:
1. Responde de forma concisa, elocuente y humanizada (120-200 palabras).
2. Conecta las responsabilidades del puesto con tus logros reales (AssetFlow, $2.000M CLP optimizados en Essity, 10 meses $0 diferencias IRA, 0 observaciones CMF/CGR con 1.849 propiedades).
3. ${toneInstructions}
4. Redacta en primera persona singular sin preámbulos.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt
  });

  return { answer: response.text?.trim() || '' };
}

/**
 * Superpower Pitch para reclutadores
 */
export async function handleSuperpowerPitch(params: {
  job: any;
  recruiterName?: string;
}) {
  const { job, recruiterName } = params;
  const ai = getAI();

  const prompt = `Actúa como Cristian Andrés Muñoz Rojas, Ingeniero Civil Industrial chileno.
Escribe un Elevator Pitch o mensaje directo de presentación ejecutiva para postular a "${job.title || 'el cargo'}" en "${job.company || 'la empresa'}".
${job.description ? `Descripción: "${job.description.substring(0, 300)}"` : ''}
${recruiterName ? `Destinatario: ${recruiterName}` : ''}
Máximo 4 a 5 líneas (60-90 palabras). Tono directo, sobrio, respetuoso y humano.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt
  });

  return { pitch: response.text?.trim() || '' };
}
