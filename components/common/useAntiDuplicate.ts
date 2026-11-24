import { useMemo } from 'react';
import { 
  checkDuplicateRUT, 
  checkDuplicateInvoice, 
  checkDuplicatePropertyCode, 
  checkDuplicateFolio,
  cleanRUTString 
} from '../../lib/inputMasks';

export function useAntiDuplicate() {
  const isRutDuplicated = (rut: string, existingList: any[], currentId?: string) => {
    return checkDuplicateRUT(rut, existingList, currentId);
  };

  const isInvoiceDuplicated = (invoice: string, existingWorkOrders: any[], currentId?: string) => {
    return checkDuplicateInvoice(invoice, existingWorkOrders, currentId);
  };

  const isPropertyCodeDuplicated = (code: string, existingProperties: any[], currentId?: string) => {
    return checkDuplicatePropertyCode(code, existingProperties, currentId);
  };

  const isFolioDuplicated = (folio: string, existingList: any[], currentId?: string) => {
    return checkDuplicateFolio(folio, existingList, currentId);
  };

  return {
    isRutDuplicated,
    isInvoiceDuplicated,
    isPropertyCodeDuplicated,
    isFolioDuplicated,
    cleanRUTString
  };
}
