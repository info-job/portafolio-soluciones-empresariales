
const DB_NAME = 'AssetFlow_Resilient_Vault_v24';
const DB_VERSION = 24;
const STORES = [
  'suppliers',
  'addressBookF0101',
  'supplierAddressesF0116',
  'supplierContactsF0111',
  'supplierMasterF0401',
  'supplierBanksF0030',
  'transactions',
  'auditLog',
  'workOrders',
  'properties',
  'contracts',
  'officialDocs',
  'tickets',
  'settings',
  'settings_logo',
  'handles',
  'b13Reports',
  'b4Reports',
  'note14Reports',
  'accountingReconciliations',
  'pettyCashFunds',
  'pettyCashExpenses',
  'dueDiligenceReports',
  'leaseContracts',
  'maintenanceExpedientes',
  'solicitudes',
  'appraisals',
  'securityDeposits',
  'reportTemplates',
  'reportReviews',
  'applicants',
  'propertyInspections',
  'wmsLogistics'
];

export class StorageEngine {
  private db: IDBDatabase | null = null;
  private isHydrating = true;
  private fileHandle: FileSystemFileHandle | null = null;
  private lastFileTimestamp: number = 0;
  private isWriting = false;
  private writePending = false;
  private initPromise: Promise<void> | null = null;
  public sessionId: string = Math.random().toString(36).substring(2, 10).toUpperCase();

  private memoryFallback: Map<string, any> = new Map();
  private isFallbackMode = false;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn("[StorageEngine] IndexedDB not available in current runtime. Operating in Memory/LocalStorage Failover mode.");
      this.isFallbackMode = true;
      return Promise.resolve();
    }

    console.log(`[StorageEngine] Initializing Resilient JDE DB ${DB_NAME} v${DB_VERSION}`);
    this.initPromise = new Promise((resolve) => {
      let isSettled = false;

      // Watchdog Timer: Guarantee resolution within 1200ms even if browser IDB hangs or blocks
      const watchdog = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          console.warn("[StorageEngine] IDB open timed out (1200ms watchdog). Activating graceful fast-boot fallback.");
          this.isFallbackMode = true;
          resolve();
        }
      }, 1200);

      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onblocked = (e) => {
          console.warn("[StorageEngine] IDB open blocked by pending connection. Resolving immediately to avoid startup freeze.", e);
          if (!isSettled) {
            isSettled = true;
            clearTimeout(watchdog);
            this.isFallbackMode = true;
            resolve();
          }
        };

        request.onupgradeneeded = (event) => {
          console.log(`[StorageEngine] Upgrading DB to v${DB_VERSION}`);
          try {
            const db = (event.target as IDBOpenDBRequest).result;
            STORES.forEach(store => {
              if (!db.objectStoreNames.contains(store)) {
                db.createObjectStore(store);
              }
            });
          } catch (upgradeErr) {
            console.error("[StorageEngine] IDB upgrade error caught gracefully:", upgradeErr);
          }
        };

        request.onsuccess = (event) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(watchdog);
            this.db = (event.target as IDBOpenDBRequest).result;
            resolve();

            // Restore file handle asynchronously in background without blocking DB init
            setTimeout(async () => {
              try {
                const savedHandle = await this.loadHandle();
                if (savedHandle) {
                  const permission = await (savedHandle as any).queryPermission({ mode: 'readwrite' });
                  if (permission === 'granted') {
                    this.fileHandle = savedHandle;
                    const file = await savedHandle.getFile();
                    this.lastFileTimestamp = file.lastModified;
                  }
                }
              } catch (e) {
                console.warn("[StorageEngine] Background handle restore skipped:", e);
              }
            }, 50);
          }
        };

        request.onerror = (e) => {
          console.warn("[StorageEngine] IDB open error, switching to graceful fallback mode:", e);
          if (!isSettled) {
            isSettled = true;
            clearTimeout(watchdog);
            this.isFallbackMode = true;
            resolve(); // Do not reject so the entire app can boot smoothly!
          }
        };
      } catch (fatalErr) {
        console.warn("[StorageEngine] Synchronous indexedDB.open exception caught:", fatalErr);
        if (!isSettled) {
          isSettled = true;
          clearTimeout(watchdog);
          this.isFallbackMode = true;
          resolve();
        }
      }
    });

    return this.initPromise;
  }

  private async saveHandle(handle: FileSystemFileHandle) {
    if (!this.db) return;
    const isMock = (handle as any).isFallback;
    const dataToSave = isMock ? { isFallback: true, name: handle.name } : handle;
    return new Promise((resolve) => {
      const tx = this.db!.transaction(['handles'], 'readwrite');
      tx.objectStore('handles').put(dataToSave, 'active_handle');
      tx.oncomplete = () => resolve(true);
    });
  }

  private async loadHandle(): Promise<FileSystemFileHandle | null> {
    if (!this.db) return null;
    return new Promise((resolve) => {
      const tx = this.db!.transaction(['handles'], 'readonly');
      const request = tx.objectStore('handles').get('active_handle');
      request.onsuccess = () => {
        const res = request.result;
        if (res && res.isFallback) {
          const name = res.name || 'base_datos_inmobiliaria.json';
          const mockHandle = {
            name,
            kind: 'file',
            isFallback: true,
            queryPermission: async () => 'granted',
            getFile: async () => new File([], name),
            createWritable: async () => {
              return {
                write: async (content: string) => {
                  const b = new Blob([content], { type: 'application/json' });
                  const u = URL.createObjectURL(b);
                  const link = document.createElement('a');
                  link.href = u;
                  link.download = name;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(u);
                },
                close: async () => {}
              };
            }
          };
          resolve(mockHandle as any);
        } else {
          resolve(res || null);
        }
      };
      request.onerror = () => resolve(null);
    });
  }

  public async clearHandle() {
    this.fileHandle = null;
    if (!this.db) return;
    return new Promise((resolve) => {
      const tx = this.db!.transaction(['handles'], 'readwrite');
      tx.objectStore('handles').delete('active_handle');
      tx.oncomplete = () => resolve(true);
    });
  }

  // CREAR UN ARCHIVO NUEVO (Para el primer usuario)
  async createNewDatabaseFile(): Promise<boolean> {
    const isIframe = window.self !== window.top;
    if (!('showSaveFilePicker' in window) || isIframe) {
      return this.fallbackCreateFile();
    }
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: 'base_datos_inmobiliaria.json',
        types: [{
          description: 'Archivo de Datos AssetFlow',
          accept: { 'application/json': ['.json'] },
        }],
      });
      this.fileHandle = handle;
      await this.saveHandle(handle);
      await this.syncToCloudFile();
      return true;
    } catch (e: any) {
      if (e.name === 'SecurityError' || e.message?.includes('frame') || e.message?.includes('picker')) {
        console.warn("File System Access API blocked in iframe. Falling back...");
        return this.fallbackCreateFile();
      }
      if (e.name !== 'AbortError') {
        console.error("Error al crear archivo:", e);
        alert("Error al crear el archivo: " + e.message);
      }
      return false;
    }
  }

  private async fallbackCreateFile(): Promise<boolean> {
    try {
      const allData = await this.loadAll();
      allData._metadata = { lastSync: Date.now(), lastUser: this.sessionId };
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'base_datos_inmobiliaria.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.fileHandle = {
        name: 'base_datos_inmobiliaria.json',
        kind: 'file',
        isFallback: true,
        queryPermission: async () => 'granted',
        getFile: async () => new File([blob], 'base_datos_inmobiliaria.json', { type: 'application/json' }),
        createWritable: async () => {
          return {
            write: async (content: string) => {
              const b = new Blob([content], { type: 'application/json' });
              const u = URL.createObjectURL(b);
              const link = document.createElement('a');
              link.href = u;
              link.download = 'base_datos_inmobiliaria.json';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(u);
            },
            close: async () => {}
          };
        }
      } as any;
      await this.saveHandle(this.fileHandle!);
      alert("¡Sincronización Iniciada! Se ha descargado 'base_datos_inmobiliaria.json'. Guárdelo en OneDrive/Dropbox. Al modificar datos relevantes, podrá descargarlos actualizados o realizar un 'Post Lote' contable.");
      return true;
    } catch (err: any) {
      alert("Error al crear archivo de respaldo: " + err.message);
      return false;
    }
  }

  // VINCULAR UNO EXISTENTE (Para los compañeros)
  async linkExistingFile(): Promise<boolean> {
    const isIframe = window.self !== window.top;
    if (!('showOpenFilePicker' in window) || isIframe) {
      return this.fallbackLinkFile();
    }
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{ description: 'Base Datos Inmobiliaria', accept: { 'application/json': ['.json'] } }],
        multiple: false
      });
      const permission = await (handle as any).requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        alert("Se requieren permisos de lectura y escritura para sincronizar.");
        return false;
      }
      this.fileHandle = handle;
      await this.saveHandle(handle);
      const file = await handle.getFile();
      this.lastFileTimestamp = file.lastModified;
      if (file.size > 0) {
        const cloudData = JSON.parse(await file.text());
        await this.restoreAll(cloudData);
      }
      return true;
    } catch (e: any) {
      if (e.name === 'SecurityError' || e.message?.includes('frame') || e.message?.includes('picker')) {
        console.warn("File System Access API blocked in iframe. Falling back...");
        return this.fallbackLinkFile();
      }
      if (e.name !== 'AbortError') {
        console.error("Error al vincular archivo:", e);
        alert("Error al vincular el archivo: " + e.message);
      }
      return false;
    }
  }

  private async fallbackLinkFile(): Promise<boolean> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) {
          resolve(false);
          return;
        }
        try {
          const text = await file.text();
          const cloudData = JSON.parse(text);
          await this.restoreAll(cloudData);
          this.lastFileTimestamp = file.lastModified;
          
          this.fileHandle = {
            name: file.name,
            kind: 'file',
            isFallback: true,
            queryPermission: async () => 'granted',
            getFile: async () => file,
            createWritable: async () => {
              return {
                write: async (content: string) => {
                  const b = new Blob([content], { type: 'application/json' });
                  const u = URL.createObjectURL(b);
                  const link = document.createElement('a');
                  link.href = u;
                  link.download = file.name;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(u);
                },
                close: async () => {}
              };
            }
          } as any;
          await this.saveHandle(this.fileHandle!);
          alert(`¡Base de datos '${file.name}' vinculada y restaurada correctamente en este navegador!`);
          resolve(true);
        } catch (err: any) {
          alert("Error al procesar el archivo seleccionado: " + err.message);
          resolve(false);
        } finally {
          document.body.removeChild(input);
        }
      };
      input.click();
    });
  }

  private safeWriteLocalStorage(storeName: string, data: any): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const payload = Array.isArray(data) && data.length > 50 ? data.slice(0, 50) : data;
      const serialized = JSON.stringify(payload);
      // Avoid saturating 5MB synchronous localStorage quota with multi-MB Base64 attachments (stored in IndexedDB)
      if (serialized.length <= 180000) {
        localStorage.setItem(`jde_store_${storeName}`, serialized);
      }
    } catch {
      console.warn(`[StorageEngine] LocalStorage quota skipped gracefully for ${storeName}`);
    }
  }

  async save(storeName: string, data: any): Promise<void> {
    this.memoryFallback.set(storeName, data);
    this.safeWriteLocalStorage(storeName, data);

    if (this.isHydrating || !this.db) return;
    try {
      await new Promise((resolve) => {
        const tx = this.db!.transaction([storeName], 'readwrite');
        tx.objectStore(storeName).put({ data, updatedAt: Date.now(), lastUser: this.sessionId }, 'master_state');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn(`[StorageEngine] IDB save to ${storeName} error, preserved in memory/localStorage:`, e);
    }
    if (this.fileHandle) this.syncToCloudFile();
  }

  async saveMultiple(entries: { storeName: string; data: any }[]): Promise<void> {
    entries.forEach(e => {
      this.memoryFallback.set(e.storeName, e.data);
      this.safeWriteLocalStorage(e.storeName, e.data);
    });

    if (this.isHydrating || !this.db || entries.length === 0) return;
    const storeNames = entries.map(e => e.storeName);
    try {
      await new Promise((resolve) => {
        const tx = this.db!.transaction(storeNames, 'readwrite');
        entries.forEach(e => {
          tx.objectStore(e.storeName).put({ data: e.data, updatedAt: Date.now(), lastUser: this.sessionId }, 'master_state');
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn("[StorageEngine] IDB saveMultiple error, preserved in memory/localStorage:", e);
    }
    if (this.fileHandle) this.syncToCloudFile();
  }

  async loadStoresSubset(storeList: string[]): Promise<any> {
    try {
      if (!this.db && !this.isFallbackMode) await this.init();
      const validStores = storeList.filter(s => STORES.includes(s) && s !== 'handles');
      if (validStores.length === 0) return {};

      if (!this.db) {
        // Instant failover to Memory and LocalStorage cache
        const subsetData: any = {};
        validStores.forEach(store => {
          if (this.memoryFallback.has(store)) {
            subsetData[store] = this.memoryFallback.get(store);
          } else {
            try {
              const raw = localStorage.getItem(`jde_store_${store}`);
              subsetData[store] = raw ? JSON.parse(raw) : [];
            } catch {
              subsetData[store] = [];
            }
          }
        });
        return subsetData;
      }

      return new Promise((resolve) => {
        const tx = this.db!.transaction(validStores, 'readonly');
        const subsetData: any = {};
        let completed = 0;

        validStores.forEach(store => {
          const request = tx.objectStore(store).get('master_state');
          request.onsuccess = () => {
            subsetData[store] = request.result?.data || [];
            completed++;
            if (completed === validStores.length) {
              resolve(subsetData);
            }
          };
          request.onerror = () => {
            subsetData[store] = [];
            completed++;
            if (completed === validStores.length) {
              resolve(subsetData);
            }
          };
        });
      });
    } catch (e) {
      console.error("[StorageEngine] loadStoresSubset error, using failover cache:", e);
      const fallbackData: any = {};
      storeList.forEach(store => {
        try {
          const raw = localStorage.getItem(`jde_store_${store}`);
          fallbackData[store] = raw ? JSON.parse(raw) : [];
        } catch {
          fallbackData[store] = [];
        }
      });
      return fallbackData;
    }
  }

  async loadAll(): Promise<any> {
    try {
      if (!this.db) await this.init();
      const storesToRead = STORES.filter(store => store !== 'handles');
      return this.loadStoresSubset(storesToRead);
    } catch (e) {
      console.error("[StorageEngine] loadAll error, returning fallback empty state:", e);
      return {};
    }
  }

  public async syncToCloudFile() {
    if (!this.fileHandle || this.isWriting) {
      if (this.isWriting) this.writePending = true;
      return;
    }

    if ((this.fileHandle as any).isFallback) {
      console.log("[StorageEngine] Fallback handle: skipping automatic file-write to avoid multiple downloads.");
      return;
    }
    
    this.isWriting = true;
    this.writePending = false;

    try {
      const allData = await this.loadAll();
      allData._metadata = { lastSync: Date.now(), lastUser: this.sessionId };
      
      const writable = await (this.fileHandle as any).createWritable();
      await writable.write(JSON.stringify(allData, null, 2));
      await writable.close();
      
      const file = await this.fileHandle.getFile();
      this.lastFileTimestamp = file.lastModified;
    } catch (e) {
      console.error("Error de sincronización física:", e);
    } finally {
      this.isWriting = false;
      if (this.writePending) {
        setTimeout(() => this.syncToCloudFile(), 100);
      }
    }
  }

  async checkForRemoteChanges(): Promise<any | null> {
    if (!this.fileHandle || this.isHydrating) return null;
    try {
      const file = await this.fileHandle.getFile();
      if (file.lastModified > this.lastFileTimestamp) {
        const remoteData = JSON.parse(await file.text());
        if (remoteData._metadata?.lastUser !== this.sessionId) {
          this.lastFileTimestamp = file.lastModified;
          return remoteData;
        }
      }
    } catch (e) {}
    return null;
  }

  async restoreAll(fullData: any) {
    if (!this.db) await this.init();
    const storesToRestore = STORES.filter(store => store !== 'handles' && fullData[store]);
    if (storesToRestore.length === 0) return;
    
    await new Promise((resolve) => {
      const tx = this.db!.transaction(storesToRestore, 'readwrite');
      storesToRestore.forEach(store => {
        tx.objectStore(store).put({ data: fullData[store], updatedAt: Date.now(), lastUser: 'REMOTE' }, 'master_state');
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  async load(storeName: string, defaultValue: any): Promise<any> {
    try {
      if (!this.db && !this.isFallbackMode) await this.init();
      if (!this.db) {
        if (this.memoryFallback.has(storeName)) return this.memoryFallback.get(storeName);
        try {
          const raw = localStorage.getItem(`jde_store_${storeName}`);
          return raw ? JSON.parse(raw) : defaultValue;
        } catch {
          return defaultValue;
        }
      }
      return new Promise((resolve) => {
        const tx = this.db!.transaction([storeName], 'readonly');
        const request = tx.objectStore(storeName).get('master_state');
        request.onsuccess = () => resolve(request.result?.data || defaultValue);
        request.onerror = () => resolve(defaultValue);
      });
    } catch (e) {
      console.error(`[StorageEngine] load error for store ${storeName}:`, e);
      if (this.memoryFallback.has(storeName)) return this.memoryFallback.get(storeName);
      try {
        const raw = localStorage.getItem(`jde_store_${storeName}`);
        return raw ? JSON.parse(raw) : defaultValue;
      } catch {
        return defaultValue;
      }
    }
  }

  isSyncActive(): boolean { return this.fileHandle !== null; }
  async isLinked(): Promise<boolean> { return this.fileHandle !== null; }
  setHydrationComplete() { this.isHydrating = false; }
}

export const storage = new StorageEngine();
