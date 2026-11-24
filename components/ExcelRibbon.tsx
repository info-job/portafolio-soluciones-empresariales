
import React from 'react';
import { 
  FileSpreadsheet, LogOut, Download, Save, ShieldCheck
} from 'lucide-react';

interface ExcelRibbonProps {
  currentUser: string;
  onLogout: () => void;
  onNew: () => void;
  onExport: () => void;
  onOpenManual: () => void;
}

const ExcelRibbon: React.FC<ExcelRibbonProps> = ({ currentUser, onLogout, onNew, onExport, onOpenManual }) => {
  return null; // El nuevo diseño integra estas funciones directamente en App.tsx para evitar confusiones
};

export default ExcelRibbon;
