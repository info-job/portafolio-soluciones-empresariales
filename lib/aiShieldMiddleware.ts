/**
 * AssetFlow Enterprise - AI Shield & Cost Control Middleware
 * Middleware con Rate-Limiting por Tenant/Usuario, Presupuesto Máximo Bloqueante (CFO Budget Guard)
 * y Botón de Parada de Emergencia (Kill-Switch).
 */

export interface AIShieldConfig {
  monthlyBudgetCapUSD: number;     // Presupuesto mensual máximo asignado (Ej: $45.00 USD)
  maxRequestsPerMinTenant: number; // Límite de peticiones por minuto por tenant (Ej: 15/min)
  maxRequestsPerMinUser: number;   // Límite de peticiones por minuto por usuario (Ej: 5/min)
  maxConcurrentOps: number;        // Máximo de operaciones simultáneas
  isKillSwitchActive: boolean;    // Botón de parada de emergencia activo por el CFO
  forceModelDowngrade: boolean;   // Forzar uso de modelos ligeros (Flash) para optimizar costos
}

export interface AIShieldStats {
  monthKey: string;                // Ej: "2026-08"
  totalRequestsMonth: number;
  inputTokensMonth: number;
  outputTokensMonth: number;
  totalCostUSDMonth: number;
  blockedRequestsCount: number;
  activeConcurrentOps: number;
  lastBlockedReason: string | null;
  lastRequestTimestamp: number | null;
}

export interface ModelPricing {
  inputPer1M: number;  // USD por 1,000,000 tokens de entrada
  outputPer1M: number; // USD por 1,000,000 tokens de salida
}

// Tabla de precios aproximados por modelo Gemini (USD)
const MODEL_PRICING: Record<string, ModelPricing> = {
  'gemini-2.5-flash': { inputPer1M: 0.075, outputPer1M: 0.30 },
  'gemini-2.5-flash-image': { inputPer1M: 0.15, outputPer1M: 0.60 },
  'gemini-3-flash-preview': { inputPer1M: 0.15, outputPer1M: 0.60 },
  'gemini-3.5-flash': { inputPer1M: 0.15, outputPer1M: 0.60 },
  'gemini-1.5-pro': { inputPer1M: 1.25, outputPer1M: 5.00 },
  'gemini-2.5-pro': { inputPer1M: 1.25, outputPer1M: 5.00 },
  'default': { inputPer1M: 0.15, outputPer1M: 0.60 }
};

const STORAGE_CONFIG_KEY = 'assetflow_ai_shield_config_v1';
const STORAGE_STATS_KEY = 'assetflow_ai_shield_stats_v1';

class AIShieldMiddleware {
  private config: AIShieldConfig;
  private stats: AIShieldStats;
  private requestHistory: Array<{ timestamp: number; tenantId: string; userId: string }> = [];
  private activeConcurrency: number = 0;

  constructor() {
    this.config = this.loadConfig();
    this.stats = this.loadStats();
    this.cleanStaleHistory();
  }

  private getMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private loadConfig(): AIShieldConfig {
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error loading AI Shield config:', e);
    }
    return {
      monthlyBudgetCapUSD: 45.00,
      maxRequestsPerMinTenant: 15,
      maxRequestsPerMinUser: 5,
      maxConcurrentOps: 3,
      isKillSwitchActive: false,
      forceModelDowngrade: true
    };
  }

  private loadStats(): AIShieldStats {
    const currentMonth = this.getMonthKey();
    try {
      const saved = localStorage.getItem(STORAGE_STATS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.monthKey === currentMonth) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error loading AI Shield stats:', e);
    }
    return {
      monthKey: currentMonth,
      totalRequestsMonth: 0,
      inputTokensMonth: 0,
      outputTokensMonth: 0,
      totalCostUSDMonth: 0.0,
      blockedRequestsCount: 0,
      activeConcurrentOps: 0,
      lastBlockedReason: null,
      lastRequestTimestamp: null
    };
  }

  private saveConfig() {
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.error('Error saving AI Shield config:', e);
    }
  }

  private saveStats() {
    try {
      localStorage.setItem(STORAGE_STATS_KEY, JSON.stringify(this.stats));
    } catch (e) {
      console.error('Error saving AI Shield stats:', e);
    }
  }

  private cleanStaleHistory() {
    const sixtySecsAgo = Date.now() - 60000;
    this.requestHistory = this.requestHistory.filter(r => r.timestamp > sixtySecsAgo);
  }

  public getConfig(): AIShieldConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AIShieldConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  public getStats(): AIShieldStats {
    // Reset month if new month started
    const currentMonth = this.getMonthKey();
    if (this.stats.monthKey !== currentMonth) {
      this.stats = {
        monthKey: currentMonth,
        totalRequestsMonth: 0,
        inputTokensMonth: 0,
        outputTokensMonth: 0,
        totalCostUSDMonth: 0,
        blockedRequestsCount: 0,
        activeConcurrentOps: this.activeConcurrency,
        lastBlockedReason: null,
        lastRequestTimestamp: null
      };
      this.saveStats();
    }
    return { ...this.stats, activeConcurrentOps: this.activeConcurrency };
  }

  public toggleKillSwitch(active?: boolean): boolean {
    this.config.isKillSwitchActive = active !== undefined ? active : !this.config.isKillSwitchActive;
    this.saveConfig();
    return this.config.isKillSwitchActive;
  }

  public resetMonthlyStats() {
    this.stats = {
      monthKey: this.getMonthKey(),
      totalRequestsMonth: 0,
      inputTokensMonth: 0,
      outputTokensMonth: 0,
      totalCostUSDMonth: 0,
      blockedRequestsCount: 0,
      activeConcurrentOps: 0,
      lastBlockedReason: null,
      lastRequestTimestamp: null
    };
    this.saveStats();
  }

  /**
   * Middleware de Inspección y Protección de Ejecución
   */
  public async executeWithGuard<T>(
    options: {
      modelName: string;
      tenantId?: string;
      userId?: string;
      estimatedInputTokens?: number;
      actionDescription?: string;
    },
    fn: (adjustedModel: string) => Promise<T>
  ): Promise<T> {
    const tenantId = options.tenantId || 'DEFAULT_TENANT';
    const userId = options.userId || 'SISTEMA';
    let requestedModel = options.modelName || 'gemini-2.5-flash';

    // 1. Verificar Botón de Parada de Emergencia (CFO Kill-Switch)
    if (this.config.isKillSwitchActive) {
      this.recordBlocked('BOTON_PARADA_EMERGENCIA_CFO_ACTIVO');
      throw new Error("PRODUCCION_DETENIDA: El Botón de Parada de Emergencia del CFO está activo. Las llamadas a IA Generativa han sido bloqueadas temporalmente para proteger el presupuesto.");
    }

    // 2. Verificar Presupuesto Máximo Bloqueante (CFO Budget Guard)
    const currentStats = this.getStats();
    if (currentStats.totalCostUSDMonth >= this.config.monthlyBudgetCapUSD) {
      this.recordBlocked(`PRESUPUESTO_MENSUAL_EXCEDIDO ($${currentStats.totalCostUSDMonth.toFixed(2)} / $${this.config.monthlyBudgetCapUSD.toFixed(2)} USD)`);
      throw new Error(`PRESUPUESTO_EXCEDED_SECURITY_STOP: Se ha alcanzado el presupuesto máximo mensual asignado de $${this.config.monthlyBudgetCapUSD.toFixed(2)} USD para IA (${currentStats.totalCostUSDMonth.toFixed(2)} USD consumidos). El Middleware ha bloqueado la petición preventivamente.`);
    }

    // 3. Verificar Concurrencia Máxima
    if (this.activeConcurrency >= this.config.maxConcurrentOps) {
      // Esperar brevemente o lanzar error de tasa
      await new Promise(r => setTimeout(r, 600));
      if (this.activeConcurrency >= this.config.maxConcurrentOps) {
        this.recordBlocked('EXCESO_CONCURRENCIA_SIMULTANEA');
        throw new Error("RATE_LIMIT_CONCURRENCY: Superado el límite de 3 operaciones paralelas con IA. La petición fue encolada o bloqueada por seguridad.");
      }
    }

    // 4. Verificar Rate Limiting (Sliding Window per Tenant / User)
    this.cleanStaleHistory();
    const tenantRequestsInLastMin = this.requestHistory.filter(r => r.tenantId === tenantId).length;
    const userRequestsInLastMin = this.requestHistory.filter(r => r.userId === userId).length;

    if (tenantRequestsInLastMin >= this.config.maxRequestsPerMinTenant) {
      this.recordBlocked(`RATE_LIMIT_TENANT (${tenantRequestsInLastMin} req/min)`);
      throw new Error(`RATE_LIMIT_TENANT_EXCEEDED: El tenant '${tenantId}' superó el límite permitido de ${this.config.maxRequestsPerMinTenant} peticiones/minuto a IA.`);
    }

    if (userRequestsInLastMin >= this.config.maxRequestsPerMinUser) {
      this.recordBlocked(`RATE_LIMIT_USER (${userRequestsInLastMin} req/min)`);
      throw new Error(`RATE_LIMIT_USER_EXCEEDED: El usuario superó el límite permitido de ${this.config.maxRequestsPerMinUser} peticiones/minuto a IA.`);
    }

    // 5. Smart Model Downgrade Strategy (Reducción Automática de Costos)
    // Si la opción forzar modelo ligero está activa, degrada modelos Pro a Flash para ahorrar 95%
    if (this.config.forceModelDowngrade && (requestedModel.includes('pro') || requestedModel.includes('1.5'))) {
      console.info(`[AI Shield Middleware] Optimización de costos: Redirigiendo '${requestedModel}' a 'gemini-2.5-flash'.`);
      requestedModel = 'gemini-2.5-flash';
    }

    // 6. Registrar inicio de ejecución
    this.activeConcurrency++;
    this.requestHistory.push({ timestamp: Date.now(), tenantId, userId });

    const startTime = Date.now();
    try {
      const result = await fn(requestedModel);

      // Estimate tokens
      const estInput = options.estimatedInputTokens || 1500;
      const estOutput = 500;

      this.recordUsage(requestedModel, estInput, estOutput);
      return result;
    } finally {
      this.activeConcurrency = Math.max(0, this.activeConcurrency - 1);
    }
  }

  private recordBlocked(reason: string) {
    this.stats.blockedRequestsCount++;
    this.stats.lastBlockedReason = reason;
    this.saveStats();
    console.warn(`[AI Shield Middleware GUARD] Petición a IA Bloqueada: ${reason}`);
  }

  private recordUsage(modelName: string, inputTokens: number, outputTokens: number) {
    const pricing = MODEL_PRICING[modelName] || MODEL_PRICING['default'];
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
    const totalReqCost = inputCost + outputCost;

    this.stats.totalRequestsMonth++;
    this.stats.inputTokensMonth += inputTokens;
    this.stats.outputTokensMonth += outputTokens;
    this.stats.totalCostUSDMonth += totalReqCost;
    this.stats.lastRequestTimestamp = Date.now();

    this.saveStats();
  }

  /**
   * Procesador Throttled para Carga Masiva de Archivos DTE o Documentos en Lote
   */
  public async processBatchWithThrottle<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    onProgress?: (completed: number, total: number, lastResult?: R) => void
  ): Promise<R[]> {
    const results: R[] = [];
    const total = items.length;

    for (let i = 0; i < items.length; i++) {
      // Verificar KillSwitch / Budget antes de cada elemento del lote
      if (this.config.isKillSwitchActive || this.getStats().totalCostUSDMonth >= this.config.monthlyBudgetCapUSD) {
        console.warn(`[AI Shield Batch Processor] Lote detenido en el elemento ${i + 1}/${total} debido a restricción de presupuesto o Parada de Emergencia.`);
        break;
      }

      const result = await processor(items[i], i);
      results.push(result);

      if (onProgress) {
        onProgress(i + 1, total, result);
      }

      // Pausa entre peticiones del lote para amortiguar picos (Throttle Buffer de 500ms)
      if (i < items.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return results;
  }
}

export const aiShield = new AIShieldMiddleware();
