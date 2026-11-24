
import React, { useState } from 'react';
import { Transaction } from '../types';
import { FileSpreadsheet, Plus, Download, User, ChevronDown, Wallet } from 'lucide-react';

interface HeaderProps {
  transactions: Transaction[];
  currentUser: string;
  onUserChange: (user: string) => void;
  onExport: () => void;
  onNew: () => void;
}

const Header: React.FC<HeaderProps> = ({ transactions, currentUser, onUserChange, onExport, onNew }) => {
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [tempUser, setTempUser] = useState(currentUser);

  const totals = transactions.reduce((acc, curr) => {
    if (curr.type === 'INCOME') acc.income += curr.amount;
    else acc.expense += curr.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const balance = totals.income - totals.expense;

  const handleUserUpdate = () => {
    if (tempUser.trim()) {
      onUserChange(tempUser.trim());
      setIsEditingUser(false);
    }
  };

  return (
    <div className="flex flex-col border-b border-slate-300 shadow-sm z-40 bg-white">
      {/* Top Bar - Microsoft Style */}
      <div className="h-10 bg-green-700 text-white px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-1 rounded">
            <FileSpreadsheet size={16} />
          </div>
          <span className="text-xs font-bold tracking-wide">ASSETFLOW Gestión Financiera e Inmobiliaria - Planilla de Control Multiusuario</span>
        </div>
        <div className="flex items-center gap-4">
           {isEditingUser ? (
            <div className="flex items-center gap-1">
              <input 
                type="text" 
                value={tempUser}
                onChange={(e) => setTempUser(e.target.value)}
                className="bg-green-800 text-white border-none rounded px-2 py-0.5 text-[10px] focus:ring-1 focus:ring-white outline-none"
                onBlur={handleUserUpdate}
                onKeyDown={(e) => e.key === 'Enter' && handleUserUpdate()}
                autoFocus
              />
            </div>
          ) : (
            <button 
              onClick={() => setIsEditingUser(true)}
              className="flex items-center gap-1.5 hover:bg-green-600 px-2 py-1 rounded transition-colors text-[10px] font-bold"
            >
              <User size={12} />
              {currentUser}
              <ChevronDown size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Ribbon / Toolbar Area */}
      <div className="bg-slate-50 px-4 py-2 flex items-center gap-6 border-b border-slate-200">
        <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={onNew}>
          <div className="p-2 bg-white border border-slate-300 rounded group-hover:bg-slate-100 shadow-sm text-green-700">
            <Plus size={20} />
          </div>
          <span className="text-[10px] font-bold text-slate-600">Nuevo</span>
        </div>

        <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={onExport}>
          <div className="p-2 bg-white border border-slate-300 rounded group-hover:bg-slate-100 shadow-sm text-green-700">
            <Download size={20} />
          </div>
          <span className="text-[10px] font-bold text-slate-600">Descargar .xlsx</span>
        </div>

        <div className="h-10 w-[1px] bg-slate-300 mx-2"></div>

        <div className="flex gap-8">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter mb-0.5">Saldo Total</span>
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded ${balance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <Wallet size={14} />
              </div>
              <span className={`text-lg font-black tracking-tight ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ${balance.toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="hidden md:flex gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter mb-0.5">Ingresos</span>
              <span className="text-sm font-bold text-emerald-600">+${totals.income.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter mb-0.5">Egresos</span>
              <span className="text-sm font-bold text-rose-600">-${totals.expense.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
