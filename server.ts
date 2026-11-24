import fs from 'fs';
import JSZip from 'jszip';
import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import type { LiveServerMessage } from '@google/genai';
import {
  getAI,
  handleGenerateContent,
  handlePettyCashExpense,
  handleLeaseContract,
  handleQuoteData,
  handleDocumentData,
  handleCategorizeSupplier,
  handleFinancialInsights,
  handleSupplierInsights,
  handleParseOutlookContacts,
  handleGenerateEmailDraft,
  handleMapPropertyExcelHeaders,
  handleSupplierDataFromDocument,
  handleTransactionDataFromDocument,
  handleInsurancePolicyData,
  handleAppraisalData,
  handleWeeklyPaymentCompliance,
  handleMonthlyExpenseReport,
  handleUafBeneficiaryForm,
  handleDomainCertificateData,
  handleSearchLiveChileanJobOffers,
  handlePrioritizeTaskCenter,
  handleDueDiligenceDocument,
  handleSuperpowerAnswer,
  handleSuperpowerPitch
} from './server/geminiBackend.ts';
import { transactionService } from './server/transactionService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Increase JSON and URL-encoded limits for binary documents / image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Healthcheck endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AssetFlow Enterprise API Server'
  });
});

// ============================================================================
// ENTERPRISE HIGH-PERFORMANCE TRANSACTIONS API (/api/transactions/*)
// ============================================================================

// Paged query with aggregations & filters
app.get('/api/transactions', (req: Request, res: Response) => {
  try {
    const result = transactionService.getPaginated({
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      search: req.query.search as string,
      type: req.query.type as any,
      category: req.query.category as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      supplierName: req.query.supplierName as string,
      sortBy: req.query.sortBy as string,
      sortOrder: (req.query.sortOrder as any) || 'desc'
    });
    res.json(result);
  } catch (err: any) {
    console.error('Error in GET /api/transactions:', err);
    res.status(500).json({ error: err?.message || 'Error fetching transactions' });
  }
});

// Streaming CSV export (sub-second download without client-side memory exhaustion)
app.get('/api/transactions/export', (req: Request, res: Response) => {
  try {
    transactionService.streamCsv(res, {
      search: req.query.search as string,
      type: req.query.type as any,
      category: req.query.category as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      supplierName: req.query.supplierName as string,
      sortBy: req.query.sortBy as string,
      sortOrder: (req.query.sortOrder as any) || 'desc'
    });
  } catch (err: any) {
    console.error('Error in GET /api/transactions/export:', err);
    res.status(500).json({ error: err?.message || 'Error streaming transactions' });
  }
});

// Single transaction creation / upsert
app.post('/api/transactions', (req: Request, res: Response) => {
  try {
    const created = transactionService.upsert(req.body);
    res.status(201).json(created);
  } catch (err: any) {
    console.error('Error in POST /api/transactions:', err);
    res.status(500).json({ error: err?.message || 'Error creating transaction' });
  }
});

// Batch insertion for high-throughput ingestion (10.000 tx/day)
app.post('/api/transactions/batch', (req: Request, res: Response) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: 'transactions array required' });
    }
    const result = transactionService.batchUpsert(transactions);
    res.json({ success: true, count: result.count, totalStored: transactionService.getTotalCount() });
  } catch (err: any) {
    console.error('Error in POST /api/transactions/batch:', err);
    res.status(500).json({ error: err?.message || 'Error batch inserting transactions' });
  }
});

// Update transaction
app.put('/api/transactions/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const updated = transactionService.upsert({ ...req.body, id });
    res.json(updated);
  } catch (err: any) {
    console.error('Error in PUT /api/transactions/:id:', err);
    res.status(500).json({ error: err?.message || 'Error updating transaction' });
  }
});

// Delete transaction
app.delete('/api/transactions/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const deleted = transactionService.delete(id);
    if (deleted) {
      res.json({ success: true, deletedId: id });
    } else {
      res.status(404).json({ error: 'Transaction not found' });
    }
  } catch (err: any) {
    console.error('Error in DELETE /api/transactions/:id:', err);
    res.status(500).json({ error: err?.message || 'Error deleting transaction' });
  }
});

// ============================================================================
// CORPORATE INSTALLER DOWNLOAD ENDPOINTS (/api/download/*)
// ============================================================================
app.get('/api/download/install-windows.bat', (_req: Request, res: Response) => {
  const filePath = path.resolve(__dirname, 'install-windows.bat');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/x-bat');
    res.setHeader('Content-Disposition', 'attachment; filename="install-windows.bat"');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).send('install-windows.bat not found');
  }
});

app.get('/api/download/instalar-en-mi-pc.bat', (_req: Request, res: Response) => {
  const filePath = path.resolve(__dirname, 'instalar-en-mi-pc.bat');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/x-bat');
    res.setHeader('Content-Disposition', 'attachment; filename="instalar-en-mi-pc.bat"');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).send('instalar-en-mi-pc.bat not found');
  }
});

app.get('/api/download/install.sh', (_req: Request, res: Response) => {
  const filePath = path.resolve(__dirname, 'install.sh');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/x-sh');
    res.setHeader('Content-Disposition', 'attachment; filename="install.sh"');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).send('install.sh not found');
  }
});

app.get('/api/download/deploy-manual.md', (_req: Request, res: Response) => {
  const filePath = path.resolve(__dirname, 'MANUAL_DE_DESPLIEGUE_EMPRESARIAL.md');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="MANUAL_DE_DESPLIEGUE_EMPRESARIAL.md"');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).send('Manual not found');
  }
});

app.get('/api/download/firma-gmail.html', (_req: Request, res: Response) => {
  const publicPath = path.resolve(__dirname, 'public', 'firma-gmail-cristian-munoz.html');
  const distPath = path.resolve(__dirname, 'dist', 'firma-gmail-cristian-munoz.html');
  const filePath = fs.existsSync(publicPath) ? publicPath : distPath;
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Firma_Gmail_Cristian_Munoz_Rojas.html"');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).send('Firma Gmail HTML not found');
  }
});

app.get('/api/download/installer-kit.zip', async (_req: Request, res: Response) => {
  try {
    const zip = new JSZip();
    const filesToInclude = [
      'install-windows.bat',
      'install.sh',
      'deploy-windows.bat',
      'deploy.sh',
      'Dockerfile',
      'docker-compose.yml',
      'nginx.conf',
      'ecosystem.config.cjs',
      '.env.example',
      'MANUAL_DE_DESPLIEGUE_EMPRESARIAL.md'
    ];

    for (const file of filesToInclude) {
      const fullPath = path.resolve(__dirname, file);
      if (fs.existsSync(fullPath)) {
        zip.file(file, fs.readFileSync(fullPath));
      }
    }

    zip.file('INSTRUCCIONES_DE_INSTALACION.txt', `==============================================================================
ASSETFLOW ENTERPRISE ERP - KIT DE INSTALACION MAESTRO PARA SERVIDORES
==============================================================================
Propietario del Sistema: Cristian Andres Munoz Rojas (samaheim@gmail.com)
Estandar Arquitectura: AssetFlow Enterprise 9.11
Certificaciones de Referencia: ISO 9001:2015 / ISO/IEC 27001 / Ley N° 21.595

COMO INSTALAR EN 1 SOLO PASO:

A) EN SERVIDORES WINDOWS SERVER (2016 / 2019 / 2022 / 2025):
   1. Descomprima esta carpeta en C:\\AssetFlow
   2. Haga CLIC DERECHO sobre "install-windows.bat"
   3. Seleccione "Ejecutar como administrador"
   4. El instalador detectara hardware, instalara Node.js si hace falta,
      abrira el puerto 3000 en el Firewall de Windows y dejara el servicio listo.

B) EN SERVIDORES LINUX (Ubuntu Server / Debian / RHEL / Rocky / CentOS):
   1. Suba esta carpeta a /opt/assetflow
   2. Ejecute en su consola:
      chmod +x install.sh
      sudo ./install.sh
   3. Elija en pantalla si desea instalarlo con Docker Compose o PM2.
   4. El instalador creara el archivo SWAP si la memoria es menor a 2GB,
      compilara el sistema y abrira los puertos del Firewall.

ACCESO TRAS LA INSTALACION:
   - Local:  http://localhost:3000
   - Red:    http://[IP-DEL-SERVIDOR]:3000
   - Salud:  http://[IP-DEL-SERVIDOR]:3000/api/health
==============================================================================
`);

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="assetflow-enterprise-kit-instalador.zip"');
    res.send(buffer);
  } catch (err: any) {
    console.error('Error generating installer-kit.zip:', err);
    res.status(500).send('Error generating zip file: ' + err?.message);
  }
});

// ============================================================================
// GEMINI SERVER-SIDE API ROUTES (/api/gemini/*)
// ============================================================================

// Universal Generate Content
app.post('/api/gemini/generate', async (req: Request, res: Response) => {
  try {
    const result = await handleGenerateContent(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/generate:', error);
    res.status(500).json({ error: error?.message || 'Error executing Gemini generateContent' });
  }
});

// Streaming Generate Content (Server-Sent Events)
app.post('/api/gemini/stream', async (req: Request, res: Response) => {
  const { model = 'gemini-3.8-flash', contents, config } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const ai = getAI();
    const stream = await ai.models.generateContentStream({
      model,
      contents,
      config
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Error in /api/gemini/stream:', error);
    res.write(`data: ${JSON.stringify({ error: error?.message || 'Streaming error' })}\n\n`);
    res.end();
  }
});

// Petty Cash Expense
app.post('/api/gemini/petty-cash', async (req: Request, res: Response) => {
  try {
    const { input, mimeType } = req.body;
    const result = await handlePettyCashExpense(input, mimeType);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/petty-cash:', error);
    res.status(500).json({ error: error?.message || 'Error processing petty cash' });
  }
});

// Lease Contract
app.post('/api/gemini/lease-contract', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const result = await handleLeaseContract(text);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/lease-contract:', error);
    res.status(500).json({ error: error?.message || 'Error processing lease contract' });
  }
});

// Quote Data
app.post('/api/gemini/quote', async (req: Request, res: Response) => {
  try {
    const { input, mimeType } = req.body;
    const result = await handleQuoteData(input, mimeType);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/quote:', error);
    res.status(500).json({ error: error?.message || 'Error processing quote' });
  }
});

// Official Document Data
app.post('/api/gemini/document', async (req: Request, res: Response) => {
  try {
    const { input, mimeType } = req.body;
    const result = await handleDocumentData(input, mimeType);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/document:', error);
    res.status(500).json({ error: error?.message || 'Error processing document' });
  }
});

// Categorize Supplier
app.post('/api/gemini/categorize-supplier', async (req: Request, res: Response) => {
  try {
    const { description } = req.body;
    const result = await handleCategorizeSupplier(description);
    res.json({ category: result });
  } catch (error: any) {
    console.error('Error in /api/gemini/categorize-supplier:', error);
    res.status(500).json({ error: error?.message || 'Error categorizing supplier' });
  }
});

// Financial Insights
app.post('/api/gemini/financial-insights', async (req: Request, res: Response) => {
  try {
    const { transactions } = req.body;
    const result = await handleFinancialInsights(transactions);
    res.json({ insights: result });
  } catch (error: any) {
    console.error('Error in /api/gemini/financial-insights:', error);
    res.status(500).json({ error: error?.message || 'Error generating financial insights' });
  }
});

// Supplier Insights
app.post('/api/gemini/supplier-insights', async (req: Request, res: Response) => {
  try {
    const { suppliers } = req.body;
    const result = await handleSupplierInsights(suppliers);
    res.json({ insights: result });
  } catch (error: any) {
    console.error('Error in /api/gemini/supplier-insights:', error);
    res.status(500).json({ error: error?.message || 'Error generating supplier insights' });
  }
});

// Parse Outlook Contacts
app.post('/api/gemini/parse-contacts', async (req: Request, res: Response) => {
  try {
    const { rawText } = req.body;
    const result = await handleParseOutlookContacts(rawText);
    res.json({ contacts: result });
  } catch (error: any) {
    console.error('Error in /api/gemini/parse-contacts:', error);
    res.status(500).json({ error: error?.message || 'Error parsing contacts' });
  }
});

// Email Draft
app.post('/api/gemini/email-draft', async (req: Request, res: Response) => {
  try {
    const { reportType, data, sender } = req.body;
    const result = await handleGenerateEmailDraft(reportType, data, sender);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/email-draft:', error);
    res.status(500).json({ error: error?.message || 'Error generating email draft' });
  }
});

// Map Property Excel Headers
app.post('/api/gemini/map-property-headers', async (req: Request, res: Response) => {
  try {
    const { headers } = req.body;
    const result = await handleMapPropertyExcelHeaders(headers);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/map-property-headers:', error);
    res.status(500).json({ error: error?.message || 'Error mapping property headers' });
  }
});

// Supplier Data From Document
app.post('/api/gemini/supplier-data', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const result = await handleSupplierDataFromDocument(input);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/supplier-data:', error);
    res.status(500).json({ error: error?.message || 'Error extracting supplier data' });
  }
});

// Transaction Data From Document
app.post('/api/gemini/transaction-data', async (req: Request, res: Response) => {
  try {
    const { input, isIncome } = req.body;
    const result = await handleTransactionDataFromDocument(input, isIncome);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/transaction-data:', error);
    res.status(500).json({ error: error?.message || 'Error extracting transaction data' });
  }
});

// Insurance Policy Data
app.post('/api/gemini/insurance-policy', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const result = await handleInsurancePolicyData(input);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/insurance-policy:', error);
    res.status(500).json({ error: error?.message || 'Error extracting insurance policy' });
  }
});

// Appraisal Data
app.post('/api/gemini/appraisal', async (req: Request, res: Response) => {
  try {
    const { input, fileName } = req.body;
    const result = await handleAppraisalData(input, fileName);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/appraisal:', error);
    res.status(500).json({ error: error?.message || 'Error extracting appraisal data' });
  }
});

// Weekly Payment Compliance
app.post('/api/gemini/weekly-compliance', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const result = await handleWeeklyPaymentCompliance(input);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/weekly-compliance:', error);
    res.status(500).json({ error: error?.message || 'Error analyzing weekly compliance' });
  }
});

// Monthly Expense Report
app.post('/api/gemini/monthly-expense', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const result = await handleMonthlyExpenseReport(input);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/monthly-expense:', error);
    res.status(500).json({ error: error?.message || 'Error analyzing monthly expenses' });
  }
});

// UAF Beneficiary Form
app.post('/api/gemini/uaf-beneficiary', async (req: Request, res: Response) => {
  try {
    const { input, fileName } = req.body;
    const result = await handleUafBeneficiaryForm(input, fileName);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/uaf-beneficiary:', error);
    res.status(500).json({ error: error?.message || 'Error extracting UAF beneficiary form' });
  }
});

// Domain Certificate CBR
app.post('/api/gemini/domain-certificate', async (req: Request, res: Response) => {
  try {
    const { input, fileName } = req.body;
    const result = await handleDomainCertificateData(input, fileName);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/domain-certificate:', error);
    res.status(500).json({ error: error?.message || 'Error extracting domain certificate' });
  }
});

// Search Chilean Job Offers
app.post('/api/gemini/search-jobs', async (req: Request, res: Response) => {
  try {
    const { candidateSkills } = req.body;
    const result = await handleSearchLiveChileanJobOffers(candidateSkills);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/search-jobs:', error);
    res.status(500).json({ error: error?.message || 'Error searching job offers' });
  }
});

// Prioritize Task Center
app.post('/api/gemini/task-assistant', async (req: Request, res: Response) => {
  try {
    const { tasks } = req.body;
    const result = await handlePrioritizeTaskCenter(tasks);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/task-assistant:', error);
    res.status(500).json({ error: error?.message || 'Error prioritizing tasks' });
  }
});

// Due Diligence Document Analysis
app.post('/api/gemini/due-diligence', async (req: Request, res: Response) => {
  try {
    const { content, mimeType } = req.body;
    const result = await handleDueDiligenceDocument(content, mimeType);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/due-diligence:', error);
    res.status(500).json({ error: error?.message || 'Error analyzing due diligence document' });
  }
});

// Superpower Answer
app.post('/api/gemini/superpower-answer', async (req: Request, res: Response) => {
  try {
    const { job, question, tone } = req.body;
    const result = await handleSuperpowerAnswer({ job, question, tone });
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/superpower-answer:', error);
    res.status(500).json({ error: error?.message || 'Error generating superpower answer' });
  }
});

// Superpower Pitch
app.post('/api/gemini/superpower-pitch', async (req: Request, res: Response) => {
  try {
    const { job, recruiterName } = req.body;
    const result = await handleSuperpowerPitch({ job, recruiterName });
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/superpower-pitch:', error);
    res.status(500).json({ error: error?.message || 'Error generating superpower pitch' });
  }
});

// ============================================================================
// GEMINI LIVE API WEBSOCKET BRIDGE
// ============================================================================
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/api/gemini/live' || url.pathname === '/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  try {
    const ai = getAI();
    const session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: 'Eres AssetFlow AI, el copiloto inteligente de gestión inmobiliaria y financiera.',
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ audio }));
          }
          if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
          }
        }
      },
    });

    clientWs.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
        if (parsed.text) {
          session.sendRealtimeInput({
            text: parsed.text,
          });
        }
      } catch (err) {
        console.error('Error processing Live API message:', err);
      }
    });

    clientWs.on('close', () => {
      try {
        session.close();
      } catch {}
    });
  } catch (error: any) {
    console.error('Error connecting to Gemini Live API:', error);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ error: error?.message || 'Error connecting to Gemini Live' }));
      clientWs.close();
    }
  }
});

// ============================================================================
// FRONTEND STATIC / VITE MIDDLEWARE
// ============================================================================
const isProduction = process.env.NODE_ENV === 'production';
const parseCliPort = (): number | null => {
  const idx = process.argv.indexOf('--port');
  if (idx !== -1 && process.argv[idx + 1]) {
    const parsed = parseInt(process.argv[idx + 1], 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return null;
};
const PORT = parseCliPort() ?? (isProduction && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

async function bootstrap() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ AssetFlow Enterprise server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
