
/**
 * MappingMemory: A simple service to store and retrieve successful header mappings.
 * This implements a "learning" mechanism where the system remembers how headers were mapped previously.
 */

const STORAGE_KEY = 'property_mapping_memory';

export interface MappingMemoryEntry {
  header: string;
  field: string;
  count: number;
  lastUsed: number;
}

export const MappingMemory = {
  /**
   * Retrieves the most likely field for a given header based on history.
   */
  getMapping: (header: string): string | null => {
    try {
      const memory: Record<string, MappingMemoryEntry> = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const entry = memory[header.toLowerCase().trim()];
      return entry ? entry.field : null;
    } catch (e) {
      console.error("Error reading mapping memory:", e);
      return null;
    }
  },

  /**
   * Stores a successful mapping to learn from it.
   */
  saveMapping: (header: string, field: string) => {
    if (!header || !field) return;
    try {
      const memory: Record<string, MappingMemoryEntry> = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const key = header.toLowerCase().trim();
      
      if (memory[key]) {
        // If it's the same field, increment count
        if (memory[key].field === field) {
          memory[key].count += 1;
        } else {
          // If it's a different field, we overwrite but maybe we should keep a list?
          // For simplicity, we overwrite with the latest successful one.
          memory[key].field = field;
          memory[key].count = 1;
        }
        memory[key].lastUsed = Date.now();
      } else {
        memory[key] = {
          header,
          field,
          count: 1,
          lastUsed: Date.now()
        };
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
    } catch (e) {
      console.error("Error saving mapping memory:", e);
    }
  },

  /**
   * Bulk saves mappings from a record.
   */
  saveBulkMappings: (mappings: Record<string, string>) => {
    Object.entries(mappings).forEach(([header, field]) => {
      if (field) MappingMemory.saveMapping(header, field);
    });
  },

  /**
   * Returns all known mappings.
   */
  getAllMappings: (): Record<string, string> => {
    try {
      const memory: Record<string, MappingMemoryEntry> = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const result: Record<string, string> = {};
      Object.entries(memory).forEach(([key, entry]) => {
        result[entry.header] = entry.field;
      });
      return result;
    } catch (e) {
      return {};
    }
  }
};
