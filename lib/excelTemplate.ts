
import { Property } from '../types';

declare const XLSX: any;

export const downloadPropertyTemplate = () => {
  const headers = [
    'Edificio / Proyecto',
    'Unidad / Código',
    'Piso',
    'Dirección Completa',
    'Comuna',
    'Tipo de Inmueble (DEPARTAMENTO, OFICINA, LOCAL, BODEGA, ESTACIONAMIENTO, CASA)',
    'Propietario',
    'Superficie Terreno (m2)',
    'Superficie Construida (m2)',
    'Año Construcción',
    'Destino (HABITACIONAL, NO_HABITACIONAL)',
    'Uso (ARRIENDO, PROPIO, MIXTO)',
    'ROL de Propiedad',
    'Valor Tasación',
    'Canon Arriendo'
  ];

  const sampleData = [
    [
      'CENTENARIO',
      'DEP-101',
      '1',
      'Av. Libertad 1234',
      'SANTIAGO',
      'DEPARTAMENTO',
      'ASSETFLOW',
      '0',
      '45',
      '2015',
      'HABITACIONAL',
      'ARRIENDO',
      '123-456',
      '45000000',
      '450000'
    ],
    [
      'CENTENARIO',
      'EST-22',
      '-1',
      'Av. Libertad 1234',
      'SANTIAGO',
      'ESTACIONAMIENTO',
      'ASSETFLOW',
      '0',
      '12',
      '2015',
      'NO_HABITACIONAL',
      'ARRIENDO',
      '123-789',
      '15000000',
      '80000'
    ]
  ];

  const data = [headers, ...sampleData];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "arriendos");
  
  // Set column widths
  ws['!cols'] = headers.map(() => ({ wch: 20 }));

  XLSX.writeFile(wb, "Plantilla_Carga_Propiedades.xlsx");
};
