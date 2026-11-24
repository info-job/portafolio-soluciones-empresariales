import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  User, ShieldCheck, Lock, Eye, EyeOff, 
  Building2, Search, X, Check, Shield, 
  Briefcase, KeyRound, ShieldAlert, CheckCircle2,
  Ban, ChevronRight, UserCheck, Layers, FileText,
  Server, Database, Globe, ArrowRight, ExternalLink,
  LogOut, Power
} from 'lucide-react';
import { UserAccount, USER_CREDENTIALS, UserRole } from '../types';
import { DEFAULT_ASSETFLOW_SVG } from '../lib/defaultLogo';
import { getUserEffectiveAllowedModules } from '../lib/modulePermissions';

interface UserSessionModalProps {
  onConfirm: (name: string) => void;
  onFailedAttempt?: (name: string) => void;
  onExit?: () => void;
  currentCredentials?: Record<string, UserAccount>;
  onGoogleLogin?: () => void;
  isFirebaseConfigured?: boolean;
  isFirebaseAuthenticated?: boolean;
  companyLogo?: string | null;
}

export const UserSessionModal: React.FC<UserSessionModalProps> = ({ 
  onConfirm, 
  onFailedAttempt,
  onExit,
  currentCredentials, 
  onGoogleLogin, 
  isFirebaseConfigured, 
  isFirebaseAuthenticated,
  companyLogo
}) => {
  // Merge static & dynamic credentials, respecting exclusions
  const effectiveCredentials = useMemo<Record<string, UserAccount>>(() => {
    let deletedList: string[] = [];
    try {
      deletedList = JSON.parse(localStorage.getItem('assetflow_deleted_users') || '[]');
    } catch (e) {
      deletedList = [];
    }

    const merged: Record<string, UserAccount> = {};
    
    // Base accounts
    Object.entries(USER_CREDENTIALS).forEach(([key, val]) => {
      const isProtected = key.includes('PIÑA') || key.includes('PINA') || key === 'CRISTIAN MUÑOZ R.' || key === 'DEVELOPER' || key === 'CLIENTE DEMO';
      if (!deletedList.includes(key) || isProtected) {
        merged[key] = val;
      }
    });

    // Dynamic accounts
    if (currentCredentials && typeof currentCredentials === 'object' && !Array.isArray(currentCredentials)) {
      Object.entries(currentCredentials).forEach(([key, val]) => {
        const isProtected = key.includes('PIÑA') || key.includes('PINA') || key === 'CRISTIAN MUÑOZ R.' || key === 'DEVELOPER' || key === 'CLIENTE DEMO';
        if ((!deletedList.includes(key) || isProtected) && val && typeof val === 'object' && 'password' in val && typeof (val as UserAccount).password === 'string') {
          merged[key] = val as UserAccount;
        }
      });
    }

    // Purge
    deletedList.forEach(u => {
      if (!u.includes('PIÑA') && !u.includes('PINA') && u !== 'CRISTIAN MUÑOZ R.' && u !== 'DEVELOPER' && u !== 'CLIENTE DEMO') {
        delete merged[u];
      }
    });

    if (Object.keys(merged).length === 0) {
      merged["CRISTIAN MUÑOZ R."] = USER_CREDENTIALS["CRISTIAN MUÑOZ R."];
    }

    return merged;
  }, [currentCredentials]);

  // Order users: Admins first, then Jefes, Ejecutivos, Empleo, Arrendatarios
  const users = useMemo(() => {
    const list = Object.keys(effectiveCredentials);
    const roleWeight = (name: string): number => {
      if (name === 'CRISTIAN MUÑOZ R.') return 0;
      if (name === 'DEVELOPER') return 1;
      const acc = effectiveCredentials[name];
      switch (acc?.role) {
        case 'ADMINISTRADOR': return 2;
        case 'JEFE': return 3;
        case 'EJECUTIVO': return 4;
        case 'CLIENTE_DEMO': return 5;
        case 'SOLO_EMPLEO': return 6;
        case 'ARRENDATARIO': return 7;
        default: return 8;
      }
    };
    return list.sort((a, b) => roleWeight(a) - roleWeight(b));
  }, [effectiveCredentials]);
  
  const [selectedUser, setSelectedUser] = useState<string>(() => {
    if (effectiveCredentials["CRISTIAN MUÑOZ R."]) return "CRISTIAN MUÑOZ R.";
    if (effectiveCredentials["DEVELOPER"]) return "DEVELOPER";
    return Object.keys(effectiveCredentials)[0] || "CRISTIAN MUÑOZ R.";
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('TODOS');
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'USERS_DIRECTORY'>('LOGIN');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('JPD911');
  const [selectedJdeRole, setSelectedJdeRole] = useState<string>('*ALL');

  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!effectiveCredentials[selectedUser]) {
      const fallback = effectiveCredentials["CRISTIAN MUÑOZ R."] 
        ? "CRISTIAN MUÑOZ R." 
        : (effectiveCredentials["DEVELOPER"] ? "DEVELOPER" : Object.keys(effectiveCredentials)[0]);
      if (fallback) setSelectedUser(fallback);
    }
  }, [effectiveCredentials, selectedUser]);

  const currentAccount = effectiveCredentials[selectedUser] || effectiveCredentials["CRISTIAN MUÑOZ R."] || effectiveCredentials["DEVELOPER"];

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [failedAttemptsCount, setFailedAttemptsCount] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedClientLink, setCopiedClientLink] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [browserCloseBlocked, setBrowserCloseBlocked] = useState(false);

  const handleExitSystem = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        sessionStorage.removeItem('active_user');
      }
    } catch (e) {
      // ignore
    }
    setPassword('');
    setError(false);
    setIsTerminated(true);
    if (onExit) {
      onExit();
    }
  };

  const handleRestartSession = () => {
    setIsTerminated(false);
    setBrowserCloseBlocked(false);
    setPassword('');
    setError(false);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 150);
  };

  const handleCloseBrowserWindow = () => {
    if (typeof window !== 'undefined') {
      try {
        window.close();
      } catch (e) {
        // blocked
      }
      setBrowserCloseBlocked(true);
    }
  };

  const handleCopyJobLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}?portal=empleo`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      });
    }
  };

  const handleCopyClientDemoLink = () => {
    if (typeof window !== 'undefined') {
      const baseOrigin = window.location.hostname.includes('ais-dev-')
        ? 'https://ais-pre-dz3bxgy56etagjpimmn3xu-188547091868.us-east1.run.app'
        : window.location.origin;
      const url = `${baseOrigin}/?portal=cliente`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedClientLink(true);
        setTimeout(() => setCopiedClientLink(false), 3000);
      });
    }
  };

  const cleanStr = (str?: string) => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/ñ/g, 'n')
      .trim();
  };

  const filteredUsers = useMemo(() => {
    const q = cleanStr(searchQuery);

    return users.filter(userName => {
      const acc = effectiveCredentials[userName];
      const matchesSearch = !q || 
        cleanStr(userName).includes(q) ||
        cleanStr(acc?.firstName).includes(q) ||
        cleanStr(acc?.paternalSurname).includes(q) ||
        cleanStr(acc?.deptTitle).includes(q) ||
        cleanStr(acc?.role).includes(q);
      
      let matchesRole = true;
      if (roleFilter === 'ADMINISTRADOR') matchesRole = acc?.role === 'ADMINISTRADOR';
      else if (roleFilter === 'JEFE') matchesRole = acc?.role === 'JEFE';
      else if (roleFilter === 'EJECUTIVO') matchesRole = acc?.role === 'EJECUTIVO';
      else if (roleFilter === 'CLIENTE_DEMO') matchesRole = acc?.role === 'CLIENTE_DEMO';
      else if (roleFilter === 'SOLO_EMPLEO') matchesRole = acc?.role === 'SOLO_EMPLEO' || userName.includes('PIÑA');
      else if (roleFilter === 'ARRENDATARIO') matchesRole = acc?.role === 'ARRENDATARIO';

      return matchesSearch && matchesRole;
    });
  }, [users, effectiveCredentials, searchQuery, roleFilter]);

  const handleSelectUser = (user: string) => {
    setSelectedUser(user);
    setPassword('');
    setError(false);
    setActiveTab('LOGIN');
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const targetAccount = effectiveCredentials[selectedUser];
    const cleanInput = password.trim();

    if (cleanInput && targetAccount?.password && cleanInput === targetAccount.password) {
      setError(false);
      setFailedAttemptsCount(0);
      onConfirm(selectedUser);
    } else {
      setError(true);
      setFailedAttemptsCount(prev => prev + 1);
      if (onFailedAttempt) {
        onFailedAttempt(selectedUser);
      }
      setTimeout(() => setError(false), 4000);
    }
  };

  const getUserAccessDetails = (user: string, account?: UserAccount) => {
    const role = account?.role || 'EJECUTIVO';
    const effectiveModules = getUserEffectiveAllowedModules(account, account?.email, user);
    const isSoloEmpleo = role === 'SOLO_EMPLEO' || user.includes('PIÑA') || user.includes('PINA');

    let accessTitle = 'Operativo Estándar';
    let badgeStyle = 'bg-slate-100 text-slate-800 border-slate-300';
    let allowedHighlights: string[] = [];
    let restrictions: string[] = [];

    if (isSoloEmpleo) {
      accessTitle = 'Exclusivo Búsqueda de Empleo';
      badgeStyle = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      allowedHighlights = [
        'Búsqueda de Empleo Chile (P09OWJOB)',
        'Match de CV con Inteligencia Artificial',
        'Generador de Cartas de Presentación'
      ];
      restrictions = [
        'Bloqueo total de Finanzas, Contabilidad y Caja Chica',
        'Bloqueo de Órdenes de Trabajo, Recepciones y Proveedores',
        'Bloqueo de Propiedades y Contratos de Arriendo'
      ];
    } else if (role === 'ADMINISTRADOR') {
      accessTitle = 'Control Total (SysAdmin)';
      badgeStyle = 'bg-blue-100 text-[#002D62] border-blue-300 font-bold';
      allowedHighlights = [
        'Acceso Total a Módulos del Sistema (Enterprise 9.11)',
        'Control de Seguridad, Usuarios e ISO 27001 (P98OWSEC)',
        'Gestión Financiera, Facturación DTE y Contabilidad F0911',
        'Bitácora Inmutable de Auditoría Criptográfica F4209'
      ];
      restrictions = [
        'Sin restricciones activas (Facultades de Control Interno / SysAdmin)'
      ];
    } else if (role === 'JEFE') {
      accessTitle = 'Jefatura & Aprobaciones';
      badgeStyle = 'bg-sky-100 text-sky-900 border-sky-300 font-bold';
      allowedHighlights = [
        `${effectiveModules.length} Módulos Habilitados`,
        'V°B° y Autorización de Órdenes de Trabajo y Gastos (P43081)',
        'Validación de Proveedores y Due Diligence (F0101)',
        'Supervisión de Finanzas y Reportes Normados CMF (B.4 / Nota 14)'
      ];
      restrictions = [
        'Sin acceso a reasignar claves maestras de seguridad (P98OWSEC)'
      ];
    } else if (role === 'CLIENTE_DEMO') {
      accessTitle = 'Usuario Básico (Demo Cliente)';
      badgeStyle = 'bg-sky-100 text-sky-900 border-sky-300 font-bold';
      allowedHighlights = [
        `${effectiveModules.length} Módulos de Exhibición (Dashboard, Activos, OT, WMS)`,
        'Exploración segura en sesión local sin escritura en la nube',
        'Ideal para demostración a potenciales clientes'
      ];
      restrictions = [
        'Bloqueo total de Contabilidad, Impuestos SII, CISO, Auditoría y Usuarios',
        'Sin escritura ni modificación sobre la base de datos en la nube'
      ];
    } else if (role === 'ARRENDATARIO') {
      accessTitle = 'Portal Autoatención Residente';
      badgeStyle = 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
      allowedHighlights = [
        'Portal Residente de Autoatención',
        'Ingreso de Requerimientos de Mantención',
        'Consulta de Estado de Cuenta de Arriendo'
      ];
      restrictions = [
        'Aislado totalmente de módulos internos de la administración'
      ];
    } else {
      accessTitle = 'Operativo Estándar';
      badgeStyle = 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
      allowedHighlights = [
        `${effectiveModules.length} Módulos Habilitados`,
        'Gestión de Oficios y Comunicados Institucionales',
        'Emisión de Órdenes de Trabajo y Solicitudes P48201',
        'Catastro de Propiedades y Contratos de Arriendo P15012'
      ];
      restrictions = [
        'Restringido de autorización final en montos sobre umbral jerárquico',
        'Sin acceso a administración de usuarios ni rutas jerárquicas'
      ];
    }

    return {
      role,
      accessTitle,
      badgeStyle,
      isSoloEmpleo,
      modulesCount: effectiveModules.length,
      allowedHighlights,
      restrictions
    };
  };

  const selectedDetails = useMemo(() => {
    return getUserAccessDetails(selectedUser, currentAccount);
  }, [selectedUser, currentAccount]);

  if (isTerminated) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col justify-between items-center p-3 sm:p-6 overflow-y-auto bg-[#0A192F] text-slate-200 select-none font-sans">
        {/* TOP STATUS BAR */}
        <header className="w-full max-w-3xl flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-700/60 pb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-widest text-slate-300 uppercase">AssetFlow Enterprise ERP</span>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-slate-400">Release 9.11</span>
          </div>
          <div className="font-mono text-[10px] text-rose-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Terminal: <strong>DESCONECTADO</strong>
          </div>
        </header>

        {/* LOGOFF CARD */}
        <main className="w-full max-w-xl my-auto py-4">
          <div className="bg-[#FFFFFF] text-slate-800 rounded-sm shadow-2xl border border-slate-400/80 overflow-hidden">
            {/* ORACLE RED TOP STRIPE */}
            <div className="h-1 bg-[#C74634] w-full"></div>

            {/* HEADER BANNER */}
            <div className="bg-[#002D62] text-white px-6 py-4 flex items-center justify-between gap-3 border-b-2 border-[#C74634]">
              <div className="flex items-center gap-3">
                {companyLogo ? (
                  <img 
                    src={companyLogo} 
                    alt="Logo Corporativo" 
                    className="h-8 w-auto object-contain bg-white/95 px-1.5 py-0.5 rounded-xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div 
                    className="h-8 w-28 flex items-center justify-start bg-white/95 px-1.5 py-0.5 rounded-xs"
                    dangerouslySetInnerHTML={{ __html: DEFAULT_ASSETFLOW_SVG }} 
                  />
                )}
                <div className="h-6 w-px bg-white/20 hidden sm:block"></div>
                <div>
                  <span className="text-[13px] font-black tracking-wider uppercase text-white font-sans block">
                    ASSETFLOW ENTERPRISE
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono tracking-tight block">
                    Enterprise ERP Web Client • Sign-Off
                  </span>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="p-6 sm:p-8 space-y-5 text-center">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-700 border-2 border-emerald-500 rounded-full mx-auto flex items-center justify-center shadow-xs">
                <ShieldCheck size={32} />
              </div>

              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                  Sesión Cerrada y Desconexión Segura
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  Sign-Off completado exitosamente en el servidor JAS FastBoot.
                </p>
              </div>

              {/* SECURITY NOTICE BOX */}
              <div className="bg-[#F8FAFC] border border-slate-300 p-4 text-left text-xs font-mono space-y-2 text-slate-700">
                <div className="flex items-center gap-1.5 font-bold text-[#002D62] uppercase text-[11px] border-b border-slate-200 pb-1">
                  <Shield size={13} className="text-[#002D62]" />
                  <span>Protocolo de Seguridad y Control de Acceso (ISO 27001)</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  • Se han purgado de la memoria del navegador todos los tokens, datos de sesión y credenciales temporales.
                </p>
                <p className="text-[11px] leading-relaxed">
                  • El terminal ha quedado desacoplado de las tablas transaccionales (F0101, F0411, F4801 y F4209).
                </p>
                <p className="text-[11px] leading-relaxed text-slate-500 italic">
                  Conforme a la Ley N° 21.459 y las políticas de Control Interno, si se aleja de este equipo, nadie podrá acceder sin una nueva autenticación.
                </p>
              </div>

              {browserCloseBlocked && (
                <div className="bg-amber-50 border border-amber-300 p-2.5 text-[11px] font-mono text-amber-900 text-left">
                  <strong>Aviso del Navegador:</strong> Por políticas de seguridad del explorador web, cierre manualmente esta pestaña o ventana para completar la salida física.
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRestartSession}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#002D62] hover:bg-[#001D42] text-white font-bold text-xs uppercase tracking-wider rounded-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2 border border-[#001D42]"
                >
                  <KeyRound size={14} className="text-emerald-400" />
                  <span>Iniciar Nueva Sesión</span>
                </button>

                <button
                  type="button"
                  onClick={handleCloseBrowserWindow}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xs transition-colors cursor-pointer border border-slate-300 flex items-center justify-center gap-2"
                >
                  <LogOut size={14} className="text-slate-600" />
                  <span>Cerrar Pestaña / Salir</span>
                </button>
              </div>
            </div>

            {/* FOOTER */}
            <footer className="bg-[#F8FAFC] border-t border-slate-300 px-6 py-2.5 text-[10px] text-slate-500 font-mono text-center">
              AssetFlow Enterprise Release 9.11 • Terminal Bloqueado
            </footer>
          </div>
        </main>

        {/* BOTTOM NOTICE */}
        <footer className="w-full max-w-3xl text-center text-[10px] text-slate-500 font-mono py-2">
          © 2026 Inmobiliaria Pro • Control Interno &amp; Auditoría Forense
        </footer>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-between items-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-[#0A192F] text-slate-200 select-none font-sans">
      
      {/* TOP STATUS BAR */}
      <header className="w-full max-w-5xl flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-700/60 pb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-widest text-slate-300 uppercase">AssetFlow Enterprise ERP</span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-emerald-400">Release 9.11</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline font-mono">Tools 9.2.6</span>
        </div>
        <div className="flex items-center gap-2.5 font-mono text-[10px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Server size={12} className="text-blue-400" />
            JAS Server: <strong className="text-slate-200">ONLINE</strong>
          </span>
          {isFirebaseAuthenticated && (
            <span className="text-emerald-400 hidden sm:inline flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              Cloud Sync
            </span>
          )}
          <button
            type="button"
            onClick={handleExitSystem}
            className="hover:text-rose-300 text-slate-400 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors px-2 py-0.5 rounded-xs border border-slate-700 hover:border-rose-500/60 cursor-pointer ml-1"
            title="Cerrar y salir completamente del sistema (Logoff / Desconexión Segura)"
          >
            <LogOut size={11} className="text-rose-400" />
            <span>Cerrar y Salir</span>
          </button>
        </div>
      </header>

      {/* CENTRAL AUTHENTICATION BOX */}
      <main className="w-full max-w-3xl my-auto py-4">
        <div className={`bg-[#FFFFFF] text-slate-800 rounded-sm shadow-2xl border border-slate-400/80 overflow-hidden ${error ? 'animate-shake ring-2 ring-rose-500' : ''}`}>
          
          {/* ORACLE RED TOP STRIPE */}
          <div className="h-1 bg-[#C74634] w-full"></div>

          {/* JDE LOGO & HEADER BANNER */}
          <div className="bg-[#002D62] text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#C74634]">
            <div className="flex items-center gap-3">
              {companyLogo ? (
                <img 
                  src={companyLogo} 
                  alt="Logo Corporativo" 
                  className="h-8 w-auto object-contain bg-white/95 px-1.5 py-0.5 rounded-xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div 
                  className="h-8 w-28 flex items-center justify-start bg-white/95 px-1.5 py-0.5 rounded-xs"
                  dangerouslySetInnerHTML={{ __html: DEFAULT_ASSETFLOW_SVG }} 
                />
              )}
              <div className="h-6 w-px bg-white/20 hidden sm:block"></div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-black tracking-wider uppercase text-white">ASSETFLOW</span>
                  <span className="text-[12px] font-semibold tracking-wide text-slate-200 uppercase">Enterprise ERP 9.11</span>
                </div>
                <p className="text-[10px] text-slate-300 font-mono tracking-tight">
                  SGC AssetFlow Enterprise • HTML Web Client
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] font-mono text-emerald-300 font-bold">
                  JAS FastBoot (&lt;15ms)
                </div>
                <div className="text-[9px] text-slate-300 uppercase font-mono">
                  Entorno: {selectedEnvironment}
                </div>
              </div>

              <button
                type="button"
                onClick={handleExitSystem}
                className="bg-white/10 hover:bg-rose-900/60 text-slate-200 hover:text-white px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-xs border border-white/20 hover:border-rose-400/50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ml-auto sm:ml-0"
                title="Cerrar y salir completamente del sistema"
              >
                <Power size={12} className="text-rose-400" />
                <span>Salir del Sistema</span>
              </button>
            </div>
          </div>

          {/* TAB SELECTOR: LOGIN VS USER MASTER (F0092) */}
          <nav aria-label="Navegación de autenticación" className="bg-[#F1F5F9] border-b border-slate-300 px-6 pt-2 flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('LOGIN')}
                className={`px-4 py-2 border-t-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'LOGIN'
                    ? 'bg-white border-t-[#002D62] text-[#002D62] border-x border-slate-300 -mb-px font-black shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 border-t-transparent hover:bg-slate-200/50'
                }`}
              >
                <Lock size={13} className="text-[#002D62]" />
                <span>Autenticación de Usuario</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('USERS_DIRECTORY')}
                className={`px-4 py-2 border-t-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'USERS_DIRECTORY'
                    ? 'bg-white border-t-[#002D62] text-[#002D62] border-x border-slate-300 -mb-px font-black shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 border-t-transparent hover:bg-slate-200/50'
                }`}
              >
                <Database size={13} className="text-[#002D62]" />
                <span>Maestro de Cuentas (F0092)</span>
                <span className="text-[9px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-xs">
                  {users.length}
                </span>
              </button>
            </div>

            {/* QUICK LINK TO EMPLOYMENT PORTAL (JUAN ANDRÉS PIÑA) */}
            <div className="hidden md:flex items-center gap-1 text-[10px]">
              <span className="text-slate-500 font-mono">Acceso Directo:</span>
              <button
                type="button"
                onClick={() => onConfirm('JUAN ANDRÉS PIÑA')}
                className="text-amber-800 hover:text-amber-950 hover:underline font-bold font-mono uppercase flex items-center gap-1 cursor-pointer"
                title="Acceso directo al Portal de Empleo P09OWJOB"
              >
                <Briefcase size={11} className="text-amber-700" />
                P09OWJOB (Postulantes)
              </button>
            </div>
          </nav>

          {/* TAB CONTENT */}
          {activeTab === 'LOGIN' ? (
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* CURRENT SELECTED USER BADGE */}
              <div className="bg-[#F8FAFC] border border-slate-300 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#002D62] text-white flex items-center justify-center font-bold text-sm rounded-xs shrink-0 font-mono">
                    {selectedDetails.isSoloEmpleo ? <Briefcase size={16} /> : selectedUser.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 uppercase tracking-tight text-sm font-mono">
                        {selectedUser}
                      </span>
                      <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-xs border ${selectedDetails.badgeStyle}`}>
                        {currentAccount?.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">
                      {currentAccount?.deptTitle || 'Personal Autorizado'} {currentAccount?.email ? `• ${currentAccount.email}` : ''}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('USERS_DIRECTORY')}
                  className="px-2.5 py-1 text-[11px] font-bold text-[#002D62] hover:bg-slate-200 border border-slate-300 rounded-xs transition-colors shrink-0 uppercase tracking-wide cursor-pointer font-mono"
                >
                  Cambiar Usuario...
                </button>
              </div>

              {/* JDE FORM GRID */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  
                  {/* USER ID (READ-ONLY DISPLAY OR SWITCH) */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                      User ID (Identificador de Usuario)
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        readOnly
                        value={selectedUser}
                        className="w-full bg-slate-100 border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none cursor-default"
                      />
                      <User size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  {/* PASSWORD INPUT */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                      Password (Contraseña de Acceso)
                    </label>
                    <div className="relative">
                      <input 
                        ref={passwordInputRef}
                        type={showPassword ? "text" : "password"}
                        placeholder="Ingrese contraseña..."
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full bg-white border px-3 py-2 text-xs font-mono text-slate-900 outline-none transition-all ${
                          error 
                            ? 'border-rose-500 bg-rose-50/50 focus:ring-1 focus:ring-rose-500' 
                            : 'border-slate-400 focus:border-[#002D62] focus:ring-1 focus:ring-[#002D62]'
                        }`}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 cursor-pointer"
                        title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* ENVIRONMENT SELECTION */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                      Environment (Entorno Operativo)
                    </label>
                    <select
                      value={selectedEnvironment}
                      onChange={(e) => setSelectedEnvironment(e.target.value)}
                      className="w-full bg-white border border-slate-400 px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-[#002D62]"
                    >
                      <option value="JPD911">JPD911 - Producción Mutucar (Inmobiliaria)</option>
                      <option value="JQA911">JQA911 - Calidad, Cierre IFRS &amp; Auditoría CMF</option>
                      <option value="JDE911">JDE911 - Base Transaccional Enterprise / FastBoot</option>
                    </select>
                  </div>

                  {/* ROLE SELECTION */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                      Role (Rol Activo Asignado)
                    </label>
                    <select
                      value={selectedJdeRole}
                      onChange={(e) => setSelectedJdeRole(e.target.value)}
                      className="w-full bg-white border border-slate-400 px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-[#002D62]"
                    >
                      <option value="*ALL">*ALL - Todos los Roles Autorizados ({selectedDetails.modulesCount} Módulos)</option>
                      <option value="ADMIN">ADMIN - Administrador de Sistema (P98OWSEC)</option>
                      <option value="CONTROLLER">CONTROLLER - Control Interno Inmobiliario</option>
                      <option value="JEFE">JEFE - Aprobaciones Jerárquicas P43081</option>
                      <option value="EJECUTIVO">EJECUTIVO - Analista de Operaciones &amp; Arriendos</option>
                      <option value="POSTULANTE">POSTULANTE - Portal de Empleo P09OWJOB</option>
                    </select>
                  </div>

                </div>

                {/* ERROR NOTIFICATION IN JDE SYSTEM FORMAT */}
                {error && (
                  <div className="p-3 bg-rose-50 border-l-4 border-rose-600 text-rose-900 text-xs font-mono flex items-start gap-2.5">
                    <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase">[ERROR SEC-004]:</span> Credenciales de acceso no válidas para el usuario <strong className="font-bold text-rose-950">{selectedUser}</strong>.
                      <p className="text-[11px] text-rose-800 mt-0.5">
                        El intento fallido ha sido registrado en la bitácora criptográfica forense F4209 con marca de tiempo.
                        {failedAttemptsCount >= 2 && ` (Intentos fallidos consecutivos: ${failedAttemptsCount})`}
                      </p>
                    </div>
                  </div>
                )}

                {/* SUBMIT BUTTONS */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#002D62] hover:bg-[#001D42] active:bg-[#001530] text-white font-bold text-xs uppercase tracking-wider rounded-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2 border border-[#001D42]"
                    >
                      <ShieldCheck size={14} className="text-emerald-400" />
                      <span>Sign In / Iniciar Sesión</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setPassword(''); setError(false); }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xs transition-colors cursor-pointer border border-slate-300"
                    >
                      Restablecer
                    </button>

                    <button
                      type="button"
                      onClick={handleExitSystem}
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs uppercase tracking-wider rounded-xs transition-colors cursor-pointer border border-rose-300 flex items-center justify-center gap-1.5"
                      title="Cerrar y salir completamente del sistema (Logoff / Desconexión Segura)"
                    >
                      <LogOut size={13} className="text-rose-700" />
                      <span>Cerrar y Salir</span>
                    </button>
                  </div>

                  {/* QUICK ACCESS IF JOB ROLE */}
                  {selectedDetails.isSoloEmpleo && (
                    <button
                      type="button"
                      onClick={() => onConfirm(selectedUser)}
                      className="text-xs font-bold text-amber-800 hover:text-amber-950 underline flex items-center gap-1 cursor-pointer font-mono"
                    >
                      <span>Ingreso Directo Portal Laboral</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </form>

              {/* TECHNICAL SECURITY SUMMARY (P98OWSEC AUDIT CARD) */}
              <div className="border border-slate-200 bg-slate-50/60 p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 font-mono text-[11px]">
                  <span className="font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <Shield size={12} className="text-[#002D62]" />
                    Pefil de Seguridad P98OWSEC &amp; RBAC
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    Cláusula ISO 27001 §9.2
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="font-bold text-emerald-800 uppercase text-[10px] block mb-1">
                      ✓ Módulos Autorizados ({selectedDetails.modulesCount})
                    </span>
                    <ul className="space-y-0.5 text-slate-700">
                      {selectedDetails.allowedHighlights.slice(0, 3).map((hl, i) => (
                        <li key={i} className="truncate">• {hl}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-bold text-rose-800 uppercase text-[10px] block mb-1">
                      ✕ Restricciones Activas
                    </span>
                    <ul className="space-y-0.5 text-slate-600">
                      {selectedDetails.restrictions.slice(0, 2).map((res, i) => (
                        <li key={i} className="truncate">• {res}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* GOOGLE CLOUD SYNC OPTION */}
              {isFirebaseConfigured && !isFirebaseAuthenticated && onGoogleLogin && (
                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
                  <span className="text-[11px]">Autenticación Federada Corporativa (SSO):</span>
                  <button 
                    type="button"
                    onClick={onGoogleLogin}
                    className="bg-white hover:bg-slate-50 text-slate-800 py-1 px-3 text-xs font-semibold border border-slate-300 rounded-xs transition-colors flex items-center gap-2 cursor-pointer font-mono"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-3.5 h-3.5" />
                    <span>Iniciar con Google Workspace</span>
                  </button>
                </div>
              )}

            </div>
          ) : (
            /* TAB 2: MAESTRO DE USUARIOS AUTORIZADOS (F0092) */
            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider flex items-center gap-1.5 font-mono">
                    <Database size={13} className="text-[#002D62]" />
                    F0092 - Tabla Maestra de Cuentas Autorizadas
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Haga clic en un registro para cargar el User ID en el formulario de acceso.
                  </p>
                </div>

                {/* BUSCADOR DENTRO DE F0092 */}
                <div className="relative w-full sm:w-64">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por nombre o cargo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#002D62] font-mono"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* FILTER CHIPS */}
              <div className="flex items-center gap-1 text-[10px] font-mono uppercase overflow-x-auto pb-1">
                {[
                  { id: 'TODOS', label: 'Todos' },
                  { id: 'ADMINISTRADOR', label: 'Admin (P98OWSEC)' },
                  { id: 'JEFE', label: 'Jefes (P43081)' },
                  { id: 'EJECUTIVO', label: 'Operaciones' },
                  { id: 'CLIENTE_DEMO', label: 'Demo Cliente (Básico)' },
                  { id: 'SOLO_EMPLEO', label: 'Postulantes (P09OWJOB)' },
                  { id: 'ARRENDATARIO', label: 'Inquilinos' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setRoleFilter(f.id)}
                    className={`px-2 py-1 border transition-colors cursor-pointer shrink-0 ${
                      roleFilter === f.id
                        ? 'bg-[#002D62] text-white border-[#002D62] font-bold'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* USER TABLE (GRID FORMAT LIKE JDE INTERACTIVE GRID) */}
              <div className="border border-slate-300 max-h-72 overflow-y-auto bg-white">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead className="bg-[#E2E8F0] text-slate-700 border-b border-slate-300 sticky top-0 text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3 border-r border-slate-300 font-bold">User ID</th>
                      <th className="py-2 px-3 border-r border-slate-300 font-bold">Nombre / Apellido</th>
                      <th className="py-2 px-3 border-r border-slate-300 font-bold">Departamento / Rol</th>
                      <th className="py-2 px-3 text-center font-bold">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredUsers.map((uName) => {
                      const acc = effectiveCredentials[uName];
                      const isSelected = uName === selectedUser;

                      return (
                        <tr 
                          key={uName}
                          onClick={() => handleSelectUser(uName)}
                          className={`hover:bg-blue-50/70 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50 font-bold' : ''
                          }`}
                        >
                          <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-bold flex items-center gap-1.5">
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#002D62]"></span>}
                            <span>{uName}</span>
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200 text-slate-700">
                            {acc?.firstName && acc?.paternalSurname 
                              ? `${acc.firstName} ${acc.paternalSurname}` 
                              : uName}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200 text-slate-600 text-[11px]">
                            <span className="font-semibold">{acc?.deptTitle || acc?.role}</span>
                            <span className="text-slate-400 ml-1">({acc?.role})</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleSelectUser(uName); }}
                              className="px-2 py-0.5 bg-[#002D62] hover:bg-[#001D42] text-white text-[10px] uppercase tracking-wider rounded-xs cursor-pointer"
                            >
                              Seleccionar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* CLIENTE DEMO DIRECT ACCESS BAR */}
              <div className="bg-sky-50 border border-sky-300 p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-sky-950">
                  <Globe size={14} className="text-sky-700 shrink-0" />
                  <span className="font-semibold">
                    ¿Quiere compartir el sistema con un potencial cliente con permisos de usuario básico?
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyClientDemoLink}
                    className="px-2.5 py-1 bg-white hover:bg-sky-100 border border-sky-300 text-sky-950 text-[11px] font-bold uppercase rounded-xs transition-colors cursor-pointer"
                  >
                    {copiedClientLink ? '¡Enlace Cliente Copiado!' : 'Copiar Enlace Cliente'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirm('CLIENTE DEMO')}
                    className="px-3 py-1 bg-[#002D62] hover:bg-[#001D42] text-white text-[11px] font-bold uppercase rounded-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    Entrar Demo Básico
                  </button>
                </div>
              </div>

              {/* POSTULANTE DIRECT ACCESS BAR */}
              <div className="bg-amber-50 border border-amber-300 p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900">
                  <Briefcase size={14} className="text-amber-700 shrink-0" />
                  <span className="font-semibold">
                    ¿Desea ingresar directamente al Portal de Empleo para revisar ofertas o compartir con un amigo?
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyJobLink}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-950 text-[11px] font-bold uppercase rounded-xs transition-colors cursor-pointer"
                  >
                    {copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirm('JUAN ANDRÉS PIÑA')}
                    className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-bold uppercase rounded-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    Entrar a Empleo
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* AUSTERE ENTERPRISE LEGAL & AUDIT FOOTER */}
          <footer className="bg-[#F8FAFC] border-t border-slate-300 px-6 py-3 text-[10px] text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-center sm:text-left">
              <ShieldCheck size={13} className="text-[#002D62] shrink-0" />
              <span>
                <strong>Acceso Restringido:</strong> Sistema protegido bajo Ley N° 21.459 (Delitos Informáticos) y Ley N° 21.595 (Delitos Económicos).
              </span>
            </div>
            <div className="font-mono text-slate-500 text-right shrink-0">
              ISO/IEC 27001 • CMF B.4/Nota 14 • SHA-256
            </div>
          </footer>

        </div>
      </main>

      {/* BOTTOM SYSTEM NOTICE */}
      <footer className="w-full max-w-5xl text-center text-[10px] text-slate-400 font-mono py-2 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>AssetFlow Enterprise Release 9.11 • HTML Web Client • Sistema de Control Interno</span>
        <span className="text-slate-400">© 2026 Inmobiliaria Pro • Control Interno &amp; Auditoría Forense</span>
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default UserSessionModal;
