
import { AccountingAccount } from '../types';

export const CHART_OF_ACCOUNTS: AccountingAccount[] = [
  // 1. ACTIVOS
  { id: '1', code: '1', name: 'ACTIVOS', type: 'ACTIVO', subType: 'TOTAL', level: 1 },
  { id: '1.1', code: '1.1', name: 'ACTIVOS CORRIENTES', type: 'ACTIVO', subType: 'CORRIENTE', level: 2, parentCode: '1' },
  { id: '1.1.01', code: '1.1.01', name: 'EFECTIVO Y EQUIVALENTES DE EFECTIVO', type: 'ACTIVO', subType: 'CORRIENTE', level: 3, parentCode: '1.1' },
  { id: '1.1.01.01', code: '1.1.01.01', name: 'CAJA GENERAL', type: 'ACTIVO', subType: 'CORRIENTE', level: 4, parentCode: '1.1.01' },
  { id: '1.1.01.02', code: '1.1.01.02', name: 'CAJA CHICA OFICINA', type: 'ACTIVO', subType: 'CORRIENTE', level: 4, parentCode: '1.1.01' },
  { id: '1.1.01.03', code: '1.1.01.03', name: 'BANCO DE CHILE - CTA CTE', type: 'ACTIVO', subType: 'CORRIENTE', level: 4, parentCode: '1.1.01' },
  { id: '1.1.01.04', code: '1.1.01.04', name: 'BANCO ESTADO - CTA VISTA', type: 'ACTIVO', subType: 'CORRIENTE', level: 4, parentCode: '1.1.01' },
  
  { id: '1.1.02', code: '1.1.02', name: 'CUENTAS POR COBRAR COMERCIALES', type: 'ACTIVO', subType: 'CORRIENTE', level: 3, parentCode: '1.1' },
  { id: '1.1.02.01', code: '1.1.02.01', name: 'ARRIENDOS POR COBRAR', type: 'ACTIVO', subType: 'CORRIENTE', level: 4, parentCode: '1.1.02' },
  { id: '1.1.02.02', code: '1.1.02.02', name: 'GASTOS COMUNES POR COBRAR', type: 'ACTIVO', subType: 'CORRIENTE', level: 4, parentCode: '1.1.02' },
  { id: '1.1.02.03', code: '1.1.02.03', name: 'PROVISIÓN DEUDORES INCOBRABLES', type: 'ACTIVO', subType: 'CORRIENTE', level: 4, parentCode: '1.1.02' },

  { id: '1.2', code: '1.2', name: 'ACTIVOS NO CORRIENTES', type: 'ACTIVO', subType: 'NO CORRIENTE', level: 2, parentCode: '1' },
  { id: '1.2.01', code: '1.2.01', name: 'PROPIEDADES DE INVERSIÓN', type: 'ACTIVO', subType: 'NO CORRIENTE', level: 3, parentCode: '1.2' },
  { id: '1.2.01.01', code: '1.2.01.01', name: 'TERRENOS', type: 'ACTIVO', subType: 'NO CORRIENTE', level: 4, parentCode: '1.2.01' },
  { id: '1.2.01.02', code: '1.2.01.02', name: 'EDIFICIOS Y CONSTRUCCIONES', type: 'ACTIVO', subType: 'NO CORRIENTE', level: 4, parentCode: '1.2.01' },
  { id: '1.2.01.03', code: '1.2.01.03', name: 'DEPRECIACIÓN ACUMULADA', type: 'ACTIVO', subType: 'NO CORRIENTE', level: 4, parentCode: '1.2.01' },

  // 2. PASIVOS
  { id: '2', code: '2', name: 'PASIVOS', type: 'PASIVO', subType: 'TOTAL', level: 1 },
  { id: '2.1', code: '2.1', name: 'PASIVOS CORRIENTES', type: 'PASIVO', subType: 'CORRIENTE', level: 2, parentCode: '2' },
  { id: '2.1.01', code: '2.1.01', name: 'CUENTAS POR PAGAR COMERCIALES', type: 'PASIVO', subType: 'CORRIENTE', level: 3, parentCode: '2.1' },
  { id: '2.1.01.01', code: '2.1.01.01', name: 'PROVEEDORES NACIONALES', type: 'PASIVO', subType: 'CORRIENTE', level: 4, parentCode: '2.1.01' },
  { id: '2.1.01.02', code: '2.1.01.02', name: 'HONORARIOS POR PAGAR', type: 'PASIVO', subType: 'CORRIENTE', level: 4, parentCode: '2.1.01' },
  
  { id: '2.1.02', code: '2.1.02', name: 'OBLIGACIONES CON INSTITUCIONES FINANCIERAS', type: 'PASIVO', subType: 'CORRIENTE', level: 3, parentCode: '2.1' },
  { id: '2.1.02.01', code: '2.1.02.01', name: 'PRÉSTAMOS BANCARIOS CORTO PLAZO', type: 'PASIVO', subType: 'CORRIENTE', level: 4, parentCode: '2.1.02' },

  // 3. PATRIMONIO
  { id: '3', code: '3', name: 'PATRIMONIO', type: 'PATRIMONIO', subType: 'TOTAL', level: 1 },
  { id: '3.1', code: '3.1', name: 'CAPITAL PAGADO', type: 'PATRIMONIO', subType: 'CAPITAL', level: 2, parentCode: '3' },
  { id: '3.2', code: '3.2', name: 'RESERVAS', type: 'PATRIMONIO', subType: 'RESERVAS', level: 2, parentCode: '3' },
  { id: '3.3', code: '3.3', name: 'RESULTADOS ACUMULADOS', type: 'PATRIMONIO', subType: 'RESULTADOS', level: 2, parentCode: '3' },

  // 4. INGRESOS
  { id: '4', code: '4', name: 'INGRESOS', type: 'INGRESOS', subType: 'TOTAL', level: 1 },
  { id: '4.1', code: '4.1', name: 'INGRESOS POR ARRIENDOS', type: 'INGRESOS', subType: 'OPERACIONAL', level: 2, parentCode: '4' },
  { id: '4.1.01', code: '4.1.01', name: 'ARRIENDOS HABITACIONALES', type: 'INGRESOS', subType: 'OPERACIONAL', level: 3, parentCode: '4.1' },
  { id: '4.1.02', code: '4.1.02', name: 'ARRIENDOS COMERCIALES', type: 'INGRESOS', subType: 'OPERACIONAL', level: 3, parentCode: '4.1' },
  { id: '4.2', code: '4.2', name: 'INGRESOS FINANCIEROS', type: 'INGRESOS', subType: 'NO OPERACIONAL', level: 2, parentCode: '4' },
  { id: '4.2.01', code: '4.2.01', name: 'INTERESES GANADOS', type: 'INGRESOS', subType: 'NO OPERACIONAL', level: 3, parentCode: '4.2' },

  // 5. EGRESOS
  { id: '5', code: '5', name: 'EGRESOS', type: 'EGRESOS', subType: 'TOTAL', level: 1 },
  { id: '5.1', code: '5.1', name: 'COSTOS DE EXPLOTACIÓN', type: 'EGRESOS', subType: 'OPERACIONAL', level: 2, parentCode: '5' },
  { id: '5.1.01', code: '5.1.01', name: 'MANTENCIÓN Y REPARACIONES', type: 'EGRESOS', subType: 'OPERACIONAL', level: 3, parentCode: '5.1' },
  { id: '5.1.02', code: '5.1.02', name: 'CONTRIBUCIONES', type: 'EGRESOS', subType: 'OPERACIONAL', level: 3, parentCode: '5.1' },
  { id: '5.1.03', code: '5.1.03', name: 'SEGUROS DE PROPIEDADES', type: 'EGRESOS', subType: 'OPERACIONAL', level: 3, parentCode: '5.1' },
  
  { id: '5.2', code: '5.2', name: 'GASTOS DE ADMINISTRACIÓN', type: 'EGRESOS', subType: 'ADMINISTRATIVO', level: 2, parentCode: '5' },
  { id: '5.2.01', code: '5.2.01', name: 'REMUNERACIONES', type: 'EGRESOS', subType: 'ADMINISTRATIVO', level: 3, parentCode: '5.2' },
  { id: '5.2.02', code: '5.2.02', name: 'HONORARIOS PROFESIONALES', type: 'EGRESOS', subType: 'ADMINISTRATIVO', level: 3, parentCode: '5.2' },
  { id: '5.2.03', code: '5.2.03', name: 'GASTOS DE OFICINA', type: 'EGRESOS', subType: 'ADMINISTRATIVO', level: 3, parentCode: '5.2' },
];
