import React, { useState, useMemo, useEffect } from 'react';
import { 
  Megaphone, Plus, Search, Filter, TrendingUp, DollarSign, Target, 
  Users, BarChart2, CheckCircle2, PauseCircle, Play, Edit3, Trash2, 
  Sparkles, FileSpreadsheet, ArrowUpRight, ArrowDownRight, Eye, MousePointer, 
  Award, Zap, Copy, Globe, Lightbulb, RefreshCw, Layers, Calculator,
  Mail, Phone, UserCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { AdCampaign } from '../types';
import { storage } from '../lib/storageEngine';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface MarketingCampaignsModuleProps {
  currentUser: string;
  userEmail?: string;
  companyLogo?: string | null;
}

const DEFAULT_CAMPAIGNS: AdCampaign[] = [
  {
    id: 'camp-001',
    name: 'Lanzamiento Suite B2B AssetFlow Enterprise - CFOs & Tech Leaders',
    objective: 'CAPTACION_LEADS_B2B',
    channel: 'LINKEDIN_ADS',
    targetAudience: 'CFOs, Gerentes de Operaciones Inmobiliarias & Directores IT',
    segmentRegion: 'Región Metropolitana, Valparaíso y Concepción',
    budget: 3500000,
    spent: 2800000,
    startDate: '2026-07-01',
    endDate: '2026-08-31',
    status: 'ACTIVA',
    impressions: 48500,
    clicks: 1940,
    leadsMql: 86,
    leadsSql: 28,
    closedDeals: 7,
    generatedRevenue: 18900000, // MRR/Contratos anualizados CLP
    adTitle: 'Módulos Inmobiliarios a Medida: Solución Operativa, Contable y Legal',
    adCopyText: 'Desarrollamos e implementamos módulos a medida diseñados para resolver cada requerimiento operativo, contable o legal de tu cartera. A través de una asesoría personalizada entendemos, documentamos y levantamos puntos de control; otorgando fluidez a tus operaciones.',
    callToAction: 'Solicitar Asesoría Personalizada',
    landingUrl: 'https://inmobiliariapro.cl/demo-enterprise',
    keyValueProp: 'Módulos a Medida + Asesoría Personalizada + Control Operativo, Contable y Legal',
    contactEmail: 'cristian.munoz0223@gmail.com',
    contactPhone: '+56961436853',
    contactPerson: 'Cristián Muñoz - Dirección Comercial B2B',
    userCreator: 'samaheim@gmail.com',
    timestamp: Date.now() - 30 * 86400000
  },
  {
    id: 'camp-002',
    name: 'Captación Google Search: Software de Administración Inmobiliaria Chile',
    objective: 'VENTA_DIRECTA_LICENCIAS',
    channel: 'GOOGLE_SEARCH_B2B',
    targetAudience: 'Corredoras de Propiedades, Administradores de Edificios & Family Offices',
    segmentRegion: 'Chile Nacional (Santiago, Antofagasta, Viña del Mar, Puerto Montt)',
    budget: 2200000,
    spent: 1950000,
    startDate: '2026-06-15',
    endDate: '2026-08-15',
    status: 'ACTIVA',
    impressions: 32100,
    clicks: 2250,
    leadsMql: 112,
    leadsSql: 34,
    closedDeals: 11,
    generatedRevenue: 14850000,
    adTitle: 'Módulos Inmobiliarios a Medida: Solución Operativa, Contable y Legal',
    adCopyText: 'Desarrollamos e implementamos módulos a medida diseñados para resolver cada requerimiento operativo, contable o legal de tu cartera. A través de una asesoría personalizada entendemos, documentamos y levantamos puntos de control; otorgando fluidez a tus operaciones.',
    callToAction: 'Cotizar Módulos Personalizados',
    landingUrl: 'https://inmobiliariapro.cl/software-arriendos',
    keyValueProp: 'Módulos a Medida + Asesoría Personalizada + Control Operativo y Contable',
    contactEmail: 'cristian.munoz0223@gmail.com',
    contactPhone: '+56961436853',
    contactPerson: 'Cristián Muñoz - Dirección Comercial B2B',
    userCreator: 'samaheim@gmail.com',
    timestamp: Date.now() - 45 * 86400000
  },
  {
    id: 'camp-003',
    name: 'Cold Email Outreach ABM: Inmobiliarias & Fondos de Inversión High Ticket',
    objective: 'HIGH_TICKET_PROPERTY',
    channel: 'EMAIL_OUTREACH',
    targetAudience: 'Directores de Fondos Inmobiliarios, Asset Managers & Family Offices',
    segmentRegion: 'Santiago (Las Condes, Vitacura, Providencia, Lo Barnechea)',
    budget: 1200000,
    spent: 850000,
    startDate: '2026-07-10',
    endDate: '2026-09-10',
    status: 'ACTIVA',
    impressions: 1250,
    clicks: 680,
    leadsMql: 42,
    leadsSql: 19,
    closedDeals: 5,
    generatedRevenue: 24500000,
    adTitle: 'Soluciones Inmobiliarias a Medida: Asesoría, Control y Fluidez Operativa',
    adCopyText: 'Desarrollamos e implementamos módulos a medida diseñados para resolver cada requerimiento operativo, contable o legal de tu cartera. Entendemos, documentamos y levantamos puntos de control para tu negocio.',
    callToAction: 'Agendar Sesión de Diagnóstico B2B',
    landingUrl: 'https://inmobiliariapro.cl/abm-fondos',
    keyValueProp: 'Adaptación Custom a Medida + Auditoría Benford + Control de Vacancia',
    contactEmail: 'cristian.munoz0223@gmail.com',
    contactPhone: '+56961436853',
    contactPerson: 'Cristián Muñoz - Dirección Comercial B2B',
    userCreator: 'samaheim@gmail.com',
    timestamp: Date.now() - 20 * 86400000
  },
  {
    id: 'camp-004',
    name: 'Webinar Ejecutivo: Ley N° 21.719 de Protección de Datos & Compliance UAF Inmobiliario',
    objective: 'POSICIONAMIENTO_MARCA',
    channel: 'WEBINAR_EJECUTIVO',
    targetAudience: 'Encargados de Cumplimiento, Abogados Inmobiliarios, Gerentes Legales',
    segmentRegion: 'Chile Nacional',
    budget: 1800000,
    spent: 1800000,
    startDate: '2026-05-01',
    endDate: '2026-06-01',
    status: 'COMPLETADA',
    impressions: 21000,
    clicks: 1150,
    leadsMql: 185,
    leadsSql: 45,
    closedDeals: 8,
    generatedRevenue: 9600000,
    adTitle: 'Masterclass On-Demand: Compliance & Software Inmobiliario Adaptable a Medida',
    adCopyText: 'Conoce cómo estructurar flujos legales y normativos UAF con un software 100% adaptable a las particularidades de tu empresa.',
    callToAction: 'Ver Grabación & Agendar Demo Custom',
    landingUrl: 'https://inmobiliariapro.cl/webinar-ley21696',
    keyValueProp: 'Adaptabilidad a Flujos Legales + Módulo UAF e Inteligencia de Datos',
    contactEmail: 'cristian.munoz0223@gmail.com',
    contactPhone: '+56961436853',
    contactPerson: 'Cristián Muñoz - Dirección Comercial B2B',
    userCreator: 'samaheim@gmail.com',
    timestamp: Date.now() - 60 * 86400000
  }
];

export const MarketingCampaignsModule: React.FC<MarketingCampaignsModuleProps> = ({
  currentUser,
  userEmail,
  companyLogo
}) => {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [activeTab, setActiveTab] = useState<'LIST' | 'ROI_DASHBOARD' | 'SIMULATOR' | 'COPYWRITING'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  
  // Modal State for New/Edit Campaign
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<AdCampaign> | null>(null);

  // Simulator Inputs State
  const [simBudget, setSimBudget] = useState<number>(3000000);
  const [simCpc, setSimCpc] = useState<number>(1200); // CLP por clic
  const [simCtr, setSimCtr] = useState<number>(4.2); // %
  const [simMqlConv, setSimMqlConv] = useState<number>(5.5); // % Clics a Leads MQL
  const [simDealConv, setSimDealConv] = useState<number>(8.0); // % MQL a Clientes
  const [simAvgLtv, setSimAvgLtv] = useState<number>(2800000); // CLP LTV Promedio por Cliente

  // Load from storage or default
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const saved = await storage.load('marketing_campaigns', DEFAULT_CAMPAIGNS);
        if (saved && saved.length > 0) {
          // Update phone number & contact info across saved campaigns to reflect user's current direct contact
          const updated = saved.map(c => ({
            ...c,
            contactPhone: '+56961436853',
            contactEmail: c.contactEmail || 'cristian.munoz0223@gmail.com',
            contactPerson: c.contactPerson || 'Cristián Muñoz - Dirección Comercial B2B'
          }));
          setCampaigns(updated);
          await storage.save('marketing_campaigns', updated);
        } else {
          setCampaigns(DEFAULT_CAMPAIGNS);
          await storage.save('marketing_campaigns', DEFAULT_CAMPAIGNS);
        }
      } catch (e) {
        console.error('Error loading campaigns:', e);
        setCampaigns(DEFAULT_CAMPAIGNS);
      }
    };
    loadCampaigns();
  }, []);

  const saveCampaignsState = async (nextList: AdCampaign[]) => {
    setCampaigns(nextList);
    try {
      await storage.save('marketing_campaigns', nextList);
    } catch (e) {
      console.error('Error saving campaigns:', e);
    }
  };

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.targetAudience.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.keyValueProp.toLowerCase().includes(searchTerm.toLowerCase());
      const matchChannel = selectedChannel === 'ALL' || c.channel === selectedChannel;
      const matchStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
      return matchSearch && matchChannel && matchStatus;
    });
  }, [campaigns, searchTerm, selectedChannel, selectedStatus]);

  // Overall Impact & ROI Summary KPIs
  const kpis = useMemo(() => {
    const totalBudget = campaigns.reduce((acc, c) => acc + c.budget, 0);
    const totalSpent = campaigns.reduce((acc, c) => acc + c.spent, 0);
    const totalRevenue = campaigns.reduce((acc, c) => acc + c.generatedRevenue, 0);
    const totalImpressions = campaigns.reduce((acc, c) => acc + c.impressions, 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + c.clicks, 0);
    const totalMql = campaigns.reduce((acc, c) => acc + c.leadsMql, 0);
    const totalSql = campaigns.reduce((acc, c) => acc + c.leadsSql, 0);
    const totalDeals = campaigns.reduce((acc, c) => acc + c.closedDeals, 0);

    const netProfit = totalRevenue - totalSpent;
    const globalRoi = totalSpent > 0 ? (netProfit / totalSpent) * 100 : 0;
    const globalRoas = totalSpent > 0 ? totalRevenue / totalSpent : 0;
    const avgCac = totalDeals > 0 ? totalSpent / totalDeals : 0;
    const avgCpl = totalMql > 0 ? totalSpent / totalMql : 0;
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
      totalBudget,
      totalSpent,
      totalRevenue,
      netProfit,
      globalRoi,
      globalRoas,
      totalImpressions,
      totalClicks,
      totalMql,
      totalSql,
      totalDeals,
      avgCac,
      avgCpl,
      avgCtr
    };
  }, [campaigns]);

  // Data for Recharts: ROI & Revenue by Campaign
  const chartDataByCampaign = useMemo(() => {
    return campaigns.map(c => {
      const profit = c.generatedRevenue - c.spent;
      const roi = c.spent > 0 ? (profit / c.spent) * 100 : 0;
      return {
        name: c.name.length > 22 ? c.name.substring(0, 22) + '...' : c.name,
        Inversion: c.spent,
        Retorno: c.generatedRevenue,
        GananciaNeta: profit,
        ROI_Porcentaje: Math.round(roi)
      };
    });
  }, [campaigns]);

  // Channel Breakdown
  const channelBreakdown = useMemo(() => {
    const channelMap: Record<string, { spent: number; revenue: number; leads: number; deals: number }> = {};
    campaigns.forEach(c => {
      if (!channelMap[c.channel]) {
        channelMap[c.channel] = { spent: 0, revenue: 0, leads: 0, deals: 0 };
      }
      channelMap[c.channel].spent += c.spent;
      channelMap[c.channel].revenue += c.generatedRevenue;
      channelMap[c.channel].leads += c.leadsMql;
      channelMap[c.channel].deals += c.closedDeals;
    });

    return Object.keys(channelMap).map(channelKey => {
      const item = channelMap[channelKey];
      const roi = item.spent > 0 ? ((item.revenue - item.spent) / item.spent) * 100 : 0;
      return {
        channel: channelKey.replace(/_/g, ' '),
        spent: item.spent,
        revenue: item.revenue,
        leads: item.leads,
        deals: item.deals,
        roi: Math.round(roi)
      };
    });
  }, [campaigns]);

  // Simulator Calculated Results
  const simResults = useMemo(() => {
    const clicksEst = Math.floor(simBudget / simCpc);
    const impressionsEst = Math.floor(clicksEst / (simCtr / 100));
    const mqlEst = Math.floor(clicksEst * (simMqlConv / 100));
    const dealsEst = Math.floor(mqlEst * (simDealConv / 100));
    const revenueEst = dealsEst * simAvgLtv;
    const profitEst = revenueEst - simBudget;
    const roiEst = simBudget > 0 ? (profitEst / simBudget) * 100 : 0;
    const roasEst = simBudget > 0 ? revenueEst / simBudget : 0;
    const cacEst = dealsEst > 0 ? simBudget / dealsEst : 0;
    const cplEst = mqlEst > 0 ? simBudget / mqlEst : 0;

    return {
      clicksEst,
      impressionsEst,
      mqlEst,
      dealsEst,
      revenueEst,
      profitEst,
      roiEst,
      roasEst,
      cacEst,
      cplEst
    };
  }, [simBudget, simCpc, simCtr, simMqlConv, simDealConv, simAvgLtv]);

  // Create or Update Campaign
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign || !editingCampaign.name) return;

    const newCampaign: AdCampaign = {
      id: editingCampaign.id || `camp-${Date.now()}`,
      name: editingCampaign.name || 'Nueva Campaña Publicitaria B2B',
      objective: editingCampaign.objective || 'CAPTACION_LEADS_B2B',
      channel: editingCampaign.channel || 'LINKEDIN_ADS',
      targetAudience: editingCampaign.targetAudience || 'CFOs y Gerentes de Operaciones Inmobiliarias',
      segmentRegion: editingCampaign.segmentRegion || 'Región Metropolitana',
      budget: Number(editingCampaign.budget) || 1000000,
      spent: Number(editingCampaign.spent) || 0,
      startDate: editingCampaign.startDate || new Date().toISOString().split('T')[0],
      endDate: editingCampaign.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: editingCampaign.status || 'BORRADOR',
      impressions: Number(editingCampaign.impressions) || 0,
      clicks: Number(editingCampaign.clicks) || 0,
      leadsMql: Number(editingCampaign.leadsMql) || 0,
      leadsSql: Number(editingCampaign.leadsSql) || 0,
      closedDeals: Number(editingCampaign.closedDeals) || 0,
      generatedRevenue: Number(editingCampaign.generatedRevenue) || 0,
      adTitle: editingCampaign.adTitle || '',
      adCopyText: editingCampaign.adCopyText || '',
      callToAction: editingCampaign.callToAction || 'Contactar Asesor B2B',
      landingUrl: editingCampaign.landingUrl || 'https://inmobiliariapro.cl',
      keyValueProp: editingCampaign.keyValueProp || 'Soluciones Tecnológicas Integradas',
      contactEmail: editingCampaign.contactEmail || 'cristian.munoz0223@gmail.com',
      contactPhone: editingCampaign.contactPhone || '+56 9 8765 4321',
      contactPerson: editingCampaign.contactPerson || 'Cristián Muñoz - Dirección Comercial B2B',
      userCreator: currentUser || 'samaheim@gmail.com',
      timestamp: Date.now()
    };

    let nextList: AdCampaign[];
    if (editingCampaign.id) {
      nextList = campaigns.map(c => c.id === editingCampaign.id ? newCampaign : c);
    } else {
      nextList = [newCampaign, ...campaigns];
    }

    await saveCampaignsState(nextList);
    setIsModalOpen(false);
    setEditingCampaign(null);
  };

  // Toggle status in 1 click
  const toggleCampaignStatus = async (id: string) => {
    const nextList = campaigns.map(c => {
      if (c.id === id) {
        const nextStatus: AdCampaign['status'] = c.status === 'ACTIVA' ? 'PAUSADA' : 'ACTIVA';
        return { ...c, status: nextStatus };
      }
      return c;
    });
    await saveCampaignsState(nextList);
  };

  // Delete Campaign
  const handleDeleteCampaign = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar esta campaña publicitaria?')) {
      const nextList = campaigns.filter(c => c.id !== id);
      await saveCampaignsState(nextList);
    }
  };

  // Quick Simulation / Incremental Clicks to test live ROI updates
  const handleSimulateNewLead = async (id: string) => {
    const nextList = campaigns.map(c => {
      if (c.id === id) {
        const addClicks = 15;
        const addMql = 2;
        const addSql = 1;
        const addDeals = Math.random() > 0.5 ? 1 : 0;
        const addRevenue = addDeals * 2100000;
        return {
          ...c,
          impressions: c.impressions + 350,
          clicks: c.clicks + addClicks,
          leadsMql: c.leadsMql + addMql,
          leadsSql: c.leadsSql + addSql,
          closedDeals: c.closedDeals + addDeals,
          generatedRevenue: c.generatedRevenue + addRevenue
        };
      }
      return c;
    });
    await saveCampaignsState(nextList);
  };

  // Export Campaigns Report to Excel
  const exportCampaignsToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Campañas & ROI Publicitario');

    sheet.mergeCells('A1:O1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'ASSETFLOW TECH SOLUTIONS S.A. • INFORME DE CAMPAÑAS PUBLICITARIAS, CONTACTOS & RETORNO (ROI)';
    titleCell.font = { name: 'Arial Black', size: 12, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } }; // Emerald-800
    titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    sheet.getRow(1).height = 28;

    const headers = [
      'Nombre de Campaña', 'Canal', 'Objetivo', 'Estado', 
      'Correo Contacto', 'Teléfono Contacto', 'Responsable Comercial',
      'Presupuesto CLP', 'Gasto Real CLP', 'Retorno Generado CLP', 
      'ROI (%)', 'Impresiones', 'Clics', 'Leads MQL', 'Ventas Cerradas'
    ];

    const hRow = sheet.addRow(headers);
    hRow.height = 24;
    hRow.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
      c.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    campaigns.forEach(c => {
      const net = c.generatedRevenue - c.spent;
      const roi = c.spent > 0 ? (net / c.spent) * 100 : 0;
      const row = sheet.addRow([
        c.name,
        c.channel,
        c.objective,
        c.status,
        c.contactEmail || 'cristian.munoz0223@gmail.com',
        c.contactPhone || '+56 9 8765 4321',
        c.contactPerson || 'Cristián Muñoz',
        c.budget,
        c.spent,
        c.generatedRevenue,
        `${roi.toFixed(1)}%`,
        c.impressions,
        c.clicks,
        c.leadsMql,
        c.closedDeals
      ]);
      row.height = 20;
      row.eachCell((cell, colIdx) => {
        cell.font = { name: 'Arial', size: 9 };
        if (colIdx >= 8 && colIdx <= 10) {
          cell.numFmt = '$#,##0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });
    });

    sheet.columns.forEach(col => { col.width = 20; });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Informe_Campanas_Publicitarias_ROI_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* HEADER BANNER */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 text-slate-900 shadow-xs relative overflow-hidden">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5">
                <Zap size={12} className="text-emerald-700" />
                SaaS & Enterprise B2B Growth Engine
              </span>
              <span className="bg-indigo-50 text-indigo-900 border border-indigo-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5">
                <Sparkles size={12} className="text-indigo-700" />
                Software 100% Adaptable a Medida
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-widest">
                Fast Path: P2026M
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
              <Megaphone className="text-[#0B3C5D] shrink-0" size={32} />
              Centro de Campañas Publicitarias & ROI B2B
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-3xl leading-relaxed">
              Diseña, personaliza y despliega estrategias de marketing digital de alto impacto destacando la <strong className="text-slate-900 font-bold">adaptabilidad total de nuestro software a cada necesidad específica del cliente</strong>. Directo con Cristián Muñoz (<span className="text-emerald-700 font-mono font-bold">+56961436853</span> | <span className="text-indigo-900 font-mono font-bold">cristian.munoz0223@gmail.com</span>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setEditingCampaign({
                  budget: 2500000,
                  spent: 0,
                  status: 'ACTIVA',
                  impressions: 0,
                  clicks: 0,
                  leadsMql: 0,
                  leadsSql: 0,
                  closedDeals: 0,
                  generatedRevenue: 0,
                  objective: 'CAPTACION_LEADS_B2B',
                  channel: 'LINKEDIN_ADS',
                  adTitle: 'Módulos a Medida para la Gestión Inmobiliaria',
                  adCopyText: 'Desarrollamos e implementamos módulos a medida diseñados para resolver cada requerimiento operativo, contable o legal de tu cartera. A través de una asesoría personalizada entendemos, documentamos y levantamos puntos de control; otorgando fluidez a tus operaciones.',
                  keyValueProp: 'Módulos a Medida + Asesoría Personalizada + Control Operativo, Contable y Legal',
                  callToAction: 'Solicitar Asesoría Personalizada',
                  contactEmail: 'cristian.munoz0223@gmail.com',
                  contactPhone: '+56961436853',
                  contactPerson: 'Cristián Muñoz - Dirección Comercial B2B',
                  landingUrl: 'https://inmobiliariapro.cl'
                });
                setIsModalOpen(true);
              }}
              className="px-5 py-3 bg-[#0B3C5D] hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} />
              Nueva Campaña Custom
            </button>

            <button
              onClick={exportCampaignsToExcel}
              className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 border border-slate-300 active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet size={16} className="text-emerald-700" />
              Excel ROI (.xlsx)
            </button>
          </div>
        </div>

        {/* TOP KPI HIGHLIGHT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-8 pt-6 border-t border-slate-200">
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
            <span className="text-[9px] font-black uppercase text-slate-600 tracking-wider block">Gasto Total Ejecutado</span>
            <span className="text-base font-black font-mono text-slate-900 mt-1 block">
              ${kpis.totalSpent.toLocaleString('es-CL')}
            </span>
            <span className="text-[9.5px] font-bold text-slate-500 mt-0.5 block">
              Presup.: ${kpis.totalBudget.toLocaleString('es-CL')}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
            <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wider block">Retorno / Ventas Adjudicadas</span>
            <span className="text-base font-black font-mono text-emerald-700 mt-1 block">
              ${kpis.totalRevenue.toLocaleString('es-CL')}
            </span>
            <span className="text-[9.5px] font-bold text-emerald-800 mt-0.5 block">
              Neto: +${kpis.netProfit.toLocaleString('es-CL')}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
            <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider block">ROI Promedio & ROAS</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-base font-black font-mono text-amber-700">
                +{kpis.globalRoi.toFixed(0)}%
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-800">
                ({kpis.globalRoas.toFixed(1)}x)
              </span>
            </div>
            <span className="text-[9.5px] font-bold text-slate-500 mt-0.5 block">Efectividad Comercial</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
            <span className="text-[9px] font-black uppercase text-slate-600 tracking-wider block">Leads Generados (MQL / SQL)</span>
            <span className="text-base font-black font-mono text-slate-900 mt-1 block">
              {kpis.totalMql} MQL <span className="text-xs text-indigo-700">/ {kpis.totalSql} SQL</span>
            </span>
            <span className="text-[9.5px] font-bold text-indigo-900 mt-0.5 block">
              {kpis.totalDeals} Clientes Convertidos
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
            <span className="text-[9px] font-black uppercase text-slate-600 tracking-wider block">CAC (Costo Adquisición)</span>
            <span className="text-base font-black font-mono text-indigo-900 mt-1 block">
              ${Math.round(kpis.avgCac).toLocaleString('es-CL')}
            </span>
            <span className="text-[9.5px] font-bold text-slate-500 mt-0.5 block">Por Cliente Cerrado</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
            <span className="text-[9px] font-black uppercase text-slate-600 tracking-wider block">CPL (Costo por Lead)</span>
            <span className="text-base font-black font-mono text-teal-800 mt-1 block">
              ${Math.round(kpis.avgCpl).toLocaleString('es-CL')}
            </span>
            <span className="text-[9.5px] font-bold text-slate-500 mt-0.5 block">
              CTR Prom: {kpis.avgCtr.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('LIST')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'LIST' 
                ? 'bg-[#0B3C5D] text-white shadow-xs' 
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Megaphone size={15} />
            Gestión de Campañas ({campaigns.length})
          </button>

          <button
            onClick={() => setActiveTab('ROI_DASHBOARD')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ROI_DASHBOARD' 
                ? 'bg-[#0B3C5D] text-white shadow-xs' 
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BarChart2 size={15} className="text-emerald-600" />
            Indicadores de Impacto & ROI
          </button>

          <button
            onClick={() => setActiveTab('SIMULATOR')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'SIMULATOR' 
                ? 'bg-[#0B3C5D] text-white shadow-xs' 
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Calculator size={15} className="text-indigo-600" />
            Simulador Financiero Proyectado
          </button>

          <button
            onClick={() => setActiveTab('COPYWRITING')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'COPYWRITING' 
                ? 'bg-[#0B3C5D] text-white shadow-xs' 
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sparkles size={15} className="text-amber-600" />
            Personalizador de Copys B2B
          </button>
        </div>

        {activeTab === 'LIST' && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Buscar campaña..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 sm:w-64"
              />
            </div>

            <select
              value={selectedChannel}
              onChange={e => setSelectedChannel(e.target.value)}
              className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">Todos los Canales</option>
              <option value="LINKEDIN_ADS">LinkedIn Ads</option>
              <option value="GOOGLE_SEARCH_B2B">Google Search B2B</option>
              <option value="EMAIL_OUTREACH">Email Outreach ABM</option>
              <option value="WEBINAR_EJECUTIVO">Webinar Ejecutivo</option>
              <option value="META_BUSINESS">Meta Business</option>
              <option value="PRENSA_EVENTOS">Prensa & Eventos</option>
            </select>

            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="ACTIVA">Activas</option>
              <option value="PAUSADA">Pausadas</option>
              <option value="BORRADOR">Borradores</option>
              <option value="COMPLETADA">Completadas</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: LISTA & PERSONALIZACIÓN DE CAMPAÑAS */}
      {activeTab === 'LIST' && (
        <div className="space-y-4">
          {filteredCampaigns.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <Megaphone className="mx-auto text-slate-300" size={48} />
              <h3 className="text-base font-black text-slate-800 uppercase">No se encontraron campañas</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Ajuste los filtros de búsqueda o cree una nueva campaña publicitaria personalizada para su empresa.
              </p>
              <button
                onClick={() => {
                  setEditingCampaign({ status: 'ACTIVA', budget: 2000000, channel: 'LINKEDIN_ADS' });
                  setIsModalOpen(true);
                }}
                className="px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs uppercase rounded-xl inline-flex items-center gap-2"
              >
                <Plus size={14} /> Crear Primera Campaña
              </button>
            </div>
          ) : (
            <div className="bg-[#FAFBFD] border border-[#91A6BA] rounded-sm shadow-sm overflow-hidden flex flex-col">
              {/* ERP Grid Top Info & Batch Toolbar */}
              <div className="bg-[#E9F0F8] border-b border-[#C3D5E6] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                <div className="flex items-center gap-2 text-[#0B3C5D] font-bold">
                  <span className="font-mono bg-[#0B3C5D] text-white px-1.5 py-0.5 rounded text-[9px]">P15MKT</span>
                  <span>Trabajar con Campañas Comerciales y Retorno de Inversión (W15MKTA)</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600 font-mono text-[9.5px]">
                    Registros: <strong className="text-slate-900">{filteredCampaigns.length}</strong> de {campaigns.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingCampaign({ status: "ACTIVA", budget: 2000000, channel: "LINKEDIN_ADS" });
                      setIsModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-[#0B3C5D] hover:bg-[#144f77] text-white rounded text-[9.5px] font-bold flex items-center gap-1 shadow-3xs cursor-pointer"
                  >
                    <Plus size={11} />
                    <span>Nueva Campaña</span>
                  </button>
                  <button
                    onClick={() => {
                      const csvContent = 'data:text/csv;charset=utf-8,' + 
                        ['ID,Nombre,Canal,Propiedad,Estado,Presupuesto,Gasto,ROI,Leads,Conversiones,Inicio,Fin'].concat(
                          filteredCampaigns.map(c => [c.id, '"' + (c.name || '').replace(/"/g, '""') + '"', c.channel, '"' + (c.propertyName || '').replace(/"/g, '""') + '"', c.status, c.budget, c.spent, c.roi, c.leadsGenerated, c.conversions, c.startDate, c.endDate].join(','))
                        ).join('\n');
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement('a');
                      link.setAttribute('href', encodedUri);
                      link.setAttribute('download', 'Campañas_Marketing_P15MKT.csv');
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9.5px] font-bold flex items-center gap-1 shadow-3xs cursor-pointer"
                  >
                    <FileSpreadsheet size={11} />
                    <span>Exportar Excel / CSV</span>
                  </button>
                </div>
              </div>

              {/* Table Container with Horizontal Scroll */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-[#E2ECF5] border-b border-[#91A6BA] text-[#143B57] text-[10px] font-black uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center border-r border-[#B0C4D6]">#</th>
                      <th className="py-2.5 px-3 w-28 border-r border-[#B0C4D6]">Estado</th>
                      <th className="py-2.5 px-3 w-36 border-r border-[#B0C4D6]">Canal</th>
                      <th className="py-2.5 px-3 min-w-[220px] border-r border-[#B0C4D6]">Campaña / Propuesta</th>
                      <th className="py-2.5 px-3 min-w-[180px] border-r border-[#B0C4D6]">Audiencia / Región</th>
                      <th className="py-2.5 px-3 w-32 text-right border-r border-[#B0C4D6]">Inversión (CLP)</th>
                      <th className="py-2.5 px-3 w-32 text-right border-r border-[#B0C4D6]">Ingresos (CLP)</th>
                      <th className="py-2.5 px-3 w-24 text-center border-r border-[#B0C4D6]">ROI %</th>
                      <th className="py-2.5 px-3 w-36 text-center border-r border-[#B0C4D6]">MQL / Deals</th>
                      <th className="py-2.5 px-3 w-40 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5E1ED] text-[11px] font-sans">
                    {filteredCampaigns.map((c, idx) => {
                      const profit = c.generatedRevenue - c.spent;
                      const roi = c.spent > 0 ? (profit / c.spent) * 100 : 0;
                      return (
                        <tr key={c.id} className="hover:bg-[#EDF4FA] transition-colors border-b border-[#E2ECF5]">
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 border-r border-[#E2ECF5]">{idx + 1}</td>
                          <td className="py-2.5 px-3 border-r border-[#E2ECF5]">
                            <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded border ${
                              c.status === "ACTIVA" 
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                                : c.status === "PAUSADA"
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : "bg-slate-100 text-slate-700 border-slate-300"
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#E2ECF5] font-black text-slate-800 uppercase text-[10px]">
                            {c.channel.replace(/_/g, " ")}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#E2ECF5]">
                            <p className="font-black text-slate-900 uppercase leading-snug line-clamp-1">{c.name}</p>
                            <p className="text-[9.5px] text-slate-500 line-clamp-1 italic">"{c.adTitle}"</p>
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#E2ECF5]">
                            <p className="font-bold text-slate-800 text-[10px] line-clamp-1">{c.targetAudience}</p>
                            <p className="text-[9px] text-slate-400">{c.segmentRegion}</p>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 border-r border-[#E2ECF5]">
                            ${c.spent.toLocaleString("es-CL")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 border-r border-[#E2ECF5]">
                            ${c.generatedRevenue.toLocaleString("es-CL")}
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-[#E2ECF5]">
                            <span className={`font-mono font-black text-[10px] px-1.5 py-0.5 rounded ${roi >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-[#E2ECF5] font-mono text-[10px]">
                            <span className="font-black text-indigo-700">{c.leadsMql} MQL</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="font-black text-emerald-700">{c.closedDeals} Cierres</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleSimulateNewLead(c.id)}
                                title="Simular Lead B2B"
                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                              >
                                <Zap size={13} className="animate-pulse" />
                              </button>
                              <button
                                onClick={() => toggleCampaignStatus(c.id)}
                                title={c.status === "ACTIVA" ? "Pausar" : "Activar"}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                              >
                                {c.status === "ACTIVA" ? <PauseCircle size={13} /> : <Play size={13} />}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCampaign(c);
                                  setIsModalOpen(true);
                                }}
                                title="Editar"
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteCampaign(c.id)}
                                title="Eliminar"
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ERP Bottom Status Strip */}
              <div className="bg-[#E9F0F8] border-t border-[#C3D5E6] px-3 py-1.5 flex items-center justify-between text-[9.5px] text-slate-600 font-mono">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    ERP Grid En Línea
                  </span>
                  <span>•</span>
                  <span>Inversión: <strong>${kpis.totalSpent.toLocaleString("es-CL")}</strong></span>
                  <span>•</span>
                  <span>Ingresos: <strong className="text-emerald-700">${kpis.totalRevenue.toLocaleString("es-CL")}</strong></span>
                  <span>•</span>
                  <span>Retorno Global: <strong className="text-emerald-800">+{kpis.globalRoi.toFixed(1)}% ROI</strong></span>
                </div>
                <div>
                  Total Activas: <strong className="text-slate-900">{campaigns.filter(c => c.status === "ACTIVA").length}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ROI DASHBOARD & VISUALIZACIONES */}
      {activeTab === 'ROI_DASHBOARD' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Inversion vs Retorno por Campaña */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">
                    Inversión Publicitaria vs Retorno Financiero Generado
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Comparativo en CLP por cada campaña ejecutada</p>
                </div>
                <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                  ROAS Global: {kpis.globalRoas.toFixed(1)}x
                </span>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataByCampaign}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip 
                      formatter={(val: any) => `$${Number(val).toLocaleString('es-CL')}`}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend />
                    <Bar dataKey="Inversion" name="Gasto Publicitario (CLP)" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Retorno" name="Ventas / Contratos Adjudicados (CLP)" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Desempeño por Canal de Difusión */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">
                    Rendimiento y Retorno por Canal de Difusión B2B
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Comparación entre LinkedIn, Google Search, Email Outreach y Webinars</p>
                </div>
              </div>

              <div className="space-y-3">
                {channelBreakdown.map((ch, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-black text-slate-800">
                      <span>{ch.channel}</span>
                      <span className="text-emerald-600 font-mono">+{ch.roi}% ROI</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(Math.max(ch.roi / 6, 10), 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold pt-1">
                      <span>Gasto: ${ch.spent.toLocaleString('es-CL')}</span>
                      <span>Leads: {ch.leads} MQL</span>
                      <span>Retorno: ${ch.revenue.toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* EMBUDO DE CONVERSIÓN B2B */}
          <div className="bg-white text-slate-900 border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <Zap className="text-amber-600" size={18} />
                  Embudo de Conversión Comercial B2B Integrado
                </h3>
                <p className="text-xs text-slate-600">Paso a paso desde la impresión publicitaria hasta el cierre del contrato</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-1">
                <Eye className="mx-auto text-indigo-700" size={24} />
                <span className="text-[10px] font-black uppercase text-slate-600 block">1. Impresiones</span>
                <span className="text-lg font-black font-mono text-slate-900">{kpis.totalImpressions.toLocaleString()}</span>
                <span className="text-[9.5px] text-slate-500 block">Alcance Ejecutivo</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-1">
                <MousePointer className="mx-auto text-sky-700" size={24} />
                <span className="text-[10px] font-black uppercase text-slate-600 block">2. Clics en Anuncios</span>
                <span className="text-lg font-black font-mono text-sky-800">{kpis.totalClicks.toLocaleString()}</span>
                <span className="text-[9.5px] text-slate-500 block">CTR: {kpis.avgCtr.toFixed(1)}%</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-1">
                <Users className="mx-auto text-amber-700" size={24} />
                <span className="text-[10px] font-black uppercase text-slate-600 block">3. Leads MQL / SQL</span>
                <span className="text-lg font-black font-mono text-amber-800">{kpis.totalMql} MQL</span>
                <span className="text-[9.5px] text-slate-500 block">CPL: ${Math.round(kpis.avgCpl).toLocaleString('es-CL')}</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-1">
                <Award className="mx-auto text-emerald-700" size={24} />
                <span className="text-[10px] font-black uppercase text-slate-600 block">4. Cierres / Contratos</span>
                <span className="text-lg font-black font-mono text-emerald-800">{kpis.totalDeals} Clientes</span>
                <span className="text-[9.5px] text-emerald-900 font-semibold block">CAC: ${Math.round(kpis.avgCac).toLocaleString('es-CL')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SIMULADOR DE RETORNO Y PROYECCIÓN FINANCIERA */}
      {activeTab === 'SIMULATOR' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
              <Calculator className="text-indigo-600" size={20} />
              Simulador Financiero de Retorno e Inversión Publicitaria B2B
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Ajuste los insumos y parámetros proyectados para estimar los clics, leads y contratos adjudicados antes de ejecutar la campaña.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Inputs */}
            <div className="lg:col-span-6 space-y-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Parámetros de Inversión y Conversión</h4>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Presupuesto Inversión ($ CLP):</span>
                  <span className="font-mono text-indigo-700">${simBudget.toLocaleString('es-CL')}</span>
                </div>
                <input
                  type="range"
                  min={500000}
                  max={20000000}
                  step={250000}
                  value={simBudget}
                  onChange={e => setSimBudget(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Costo por Clic Estimado (CPC CLP):</span>
                  <span className="font-mono text-indigo-700">${simCpc.toLocaleString('es-CL')}</span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={5000}
                  step={100}
                  value={simCpc}
                  onChange={e => setSimCpc(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>CTR Estimado de Anuncio (%):</span>
                  <span className="font-mono text-indigo-700">{simCtr.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={10.0}
                  step={0.1}
                  value={simCtr}
                  onChange={e => setSimCtr(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Tasa de Conversión Landing a Lead MQL (%):</span>
                  <span className="font-mono text-indigo-700">{simMqlConv.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={15.0}
                  step={0.5}
                  value={simMqlConv}
                  onChange={e => setSimMqlConv(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Tasa Cierre MQL a Contrato Cliente (%):</span>
                  <span className="font-mono text-indigo-700">{simDealConv.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={25.0}
                  step={0.5}
                  value={simDealConv}
                  onChange={e => setSimDealConv(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Valor Contrato Promedio / LTV Cliente ($ CLP):</span>
                  <span className="font-mono text-indigo-700">${simAvgLtv.toLocaleString('es-CL')}</span>
                </div>
                <input
                  type="range"
                  min={500000}
                  max={10000000}
                  step={250000}
                  value={simAvgLtv}
                  onChange={e => setSimAvgLtv(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Right Output Projections */}
            <div className="lg:col-span-6 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <span className="text-xs font-black uppercase text-emerald-800 tracking-wider">Resultados Financieros Proyectados</span>
                  <span className="text-xs font-mono font-black text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full">
                    ROI +{simResults.roiEst.toFixed(0)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
                    <span className="text-[10px] text-slate-600 uppercase font-bold block">Ventas Est. Generadas</span>
                    <span className="text-xl font-black font-mono text-emerald-700 mt-1 block">
                      ${simResults.revenueEst.toLocaleString('es-CL')}
                    </span>
                    <span className="text-[10px] text-emerald-800 font-semibold block mt-0.5">
                      Utilidad Neta: +${simResults.profitEst.toLocaleString('es-CL')}
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
                    <span className="text-[10px] text-slate-600 uppercase font-bold block">Retorno ROAS</span>
                    <span className="text-xl font-black font-mono text-amber-700 mt-1 block">
                      {simResults.roasEst.toFixed(2)}x
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Múltiplo de inversión</span>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
                    <span className="text-[10px] text-slate-600 uppercase font-bold block">Tráfico Clics Estimado</span>
                    <span className="text-lg font-black font-mono text-slate-900 mt-1 block">
                      {simResults.clicksEst.toLocaleString()} clics
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      ~{simResults.impressionsEst.toLocaleString()} impr.
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
                    <span className="text-[10px] text-slate-600 uppercase font-bold block">Clientes & CAC</span>
                    <span className="text-lg font-black font-mono text-indigo-900 mt-1 block">
                      {simResults.dealsEst} Clientes
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      CAC: ${Math.round(simResults.cacEst).toLocaleString('es-CL')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">💡 Diagnóstico de Rentabilidad</span>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  Con una inversión de <strong>${simBudget.toLocaleString('es-CL')} CLP</strong>, obtendrás aproximadamente <strong>{simResults.mqlEst} leads cualificados (MQL)</strong> y <strong>{simResults.dealsEst} nuevos contratos de clientes</strong>, lo que genera un retorno neto positivo de <strong>+${simResults.profitEst.toLocaleString('es-CL')} CLP</strong>.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 4: PERSONALIZADOR DE COPYS Y PROPUESTAS DE VALOR B2B */}
      {activeTab === 'COPYWRITING' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
              <Sparkles className="text-amber-500" size={20} />
              Personalizador de Copys Publicitarios B2B & Propuestas de Valor
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Seleccione o adapte textos publicitarios alineados con nuestra propuesta de valor de asesoría personalizada y desarrollo a medida.
            </p>
          </div>

          {/* FEATURED MAIN VALUE PROP CARD */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Sparkles size={12} className="text-emerald-400" />
                Propuesta de Valor Principal (Estrategia B2B)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Contacto Comercial: Cristián Muñoz (+56961436853)
              </span>
            </div>

            <div className="space-y-3">
              <h4 className="text-lg font-black text-white leading-snug">
                "Módulos a Medida para la Gestión Inmobiliaria, Operativa, Contable y Legal"
              </h4>
              <p className="text-sm text-slate-200 leading-relaxed font-medium bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 italic">
                “Desarrollamos e implementamos módulos a medida diseñados para resolver cada requerimiento operativo, contable o legal de tu cartera. A través de una asesoría personalizada entendemos, documentamos y levantamos puntos de control; otorgando fluidez a tus operaciones.”
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-slate-300 font-semibold flex items-center gap-2">
                <span>🎯 Ideal para: CFOs, Gerentes Inmobiliarios, Directores Operativos & Legal</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText("Desarrollamos e implementamos módulos a medida diseñados para resolver cada requerimiento operativo, contable o legal de tu cartera. A través de una asesoría personalizada entendemos, documentamos y levantamos puntos de control; otorgando fluidez a tus operaciones.");
                  alert('Propuesta de valor copiada al portapapeles');
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
              >
                Copiar Texto Completo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Template 1: LinkedIn Ads B2B */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-indigo-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                  LinkedIn Ads B2B
                </span>
                <span className="text-[10px] font-bold text-slate-400">Target: CFOs & Operaciones</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-black text-slate-900 leading-snug">
                  "¿Requerimientos específicos en tu cartera inmobiliaria?"
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Desarrollamos e implementamos módulos a medida para cada proceso operativo, contable y legal. Mediante asesoría personalizada establecemos puntos de control estratégicos para otorgar máxima fluidez a tus operaciones.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-indigo-600">
                <span>CTA: Agendar Asesoría Custom</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("Desarrollamos e implementamos módulos a medida diseñados para resolver cada requerimiento operativo, contable o legal de tu cartera. Mediante asesoría personalizada establecemos puntos de control estratégicos para otorgar máxima fluidez a tus operaciones.");
                    alert('Copia de anuncio copiada al portapapeles');
                  }}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-wider text-indigo-700 cursor-pointer"
                >
                  Copiar Texto
                </button>
              </div>
            </div>

            {/* Template 2: Google Search B2B */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  Google Search B2B
                </span>
                <span className="text-[10px] font-bold text-slate-400">Target: Corredoras & Admin</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-black text-slate-900 leading-snug">
                  "Módulos a Medida: Solución Operativa, Contable y Legal"
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Atendemos los requerimientos exactos de tu cartera inmobiliaria. Documentamos y levantamos puntos de control claves para garantizar operaciones fluidas, seguras e integradas.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-emerald-600">
                <span>CTA: Cotizar Módulos a Medida</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("Atendemos los requerimientos exactos de tu cartera inmobiliaria. Documentamos y levantamos puntos de control claves para garantizar operaciones fluidas, seguras e integradas.");
                    alert('Copia de anuncio copiada al portapapeles');
                  }}
                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-[10px] font-black uppercase tracking-wider text-emerald-700 cursor-pointer"
                >
                  Copiar Texto
                </button>
              </div>
            </div>

            {/* Template 3: Email Outreach ABM */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-amber-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                  Email Outreach ABM
                </span>
                <span className="text-[10px] font-bold text-slate-400">Target: Family Offices & Fondos</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-black text-slate-900 leading-snug">
                  "Asesoría Personalizada y Control Operativo Inmobiliario"
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  A través de una asesoría directa entendemos, documentamos y levantamos los puntos de control clave de tu cartera, implementando módulos a medida que simplifican el cumplimiento contable y legal.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-amber-700">
                <span>CTA: Coordinar Diagnóstico B2B</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("A través de una asesoría directa entendemos, documentamos y levantamos los puntos de control clave de tu cartera, implementando módulos a medida que simplifican el cumplimiento contable y legal.");
                    alert('Copia de anuncio copiada al portapapeles');
                  }}
                  className="px-3 py-1 bg-amber-50 hover:bg-amber-100 rounded-lg text-[10px] font-black uppercase tracking-wider text-amber-800 cursor-pointer"
                >
                  Copiar Texto
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR CAMPAÑA PUBLICITARIA */}
      {isModalOpen && editingCampaign && (
        <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 relative my-8">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Megaphone size={20} className="text-emerald-600" />
                <h3 className="text-base font-black text-slate-900 uppercase">
                  {editingCampaign.id ? 'Personalizar Campaña Publicitaria' : 'Crear Nueva Campaña Publicitaria'}
                </h3>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700 uppercase text-[10px]">Nombre de la Campaña:</label>
                  <input
                    type="text"
                    required
                    value={editingCampaign.name || ''}
                    onChange={e => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                    placeholder="Ej: Lanzamiento B2B AssetFlow Enterprise 2026"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase text-[10px]">Canal Publicitario:</label>
                  <select
                    value={editingCampaign.channel || 'LINKEDIN_ADS'}
                    onChange={e => setEditingCampaign({ ...editingCampaign, channel: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="LINKEDIN_ADS">LinkedIn Ads B2B</option>
                    <option value="GOOGLE_SEARCH_B2B">Google Search B2B</option>
                    <option value="EMAIL_OUTREACH">Email Outreach ABM</option>
                    <option value="WEBINAR_EJECUTIVO">Webinar Ejecutivo</option>
                    <option value="META_BUSINESS">Meta Business</option>
                    <option value="PRENSA_EVENTOS">Prensa & Eventos</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase text-[10px]">Objetivo Comercial:</label>
                  <select
                    value={editingCampaign.objective || 'CAPTACION_LEADS_B2B'}
                    onChange={e => setEditingCampaign({ ...editingCampaign, objective: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CAPTACION_LEADS_B2B">Captación de Leads B2B</option>
                    <option value="POSICIONAMIENTO_MARCA">Posicionamiento de Marca</option>
                    <option value="RETENCION_CLIENTES">Retención & Up-sell</option>
                    <option value="VENTA_DIRECTA_LICENCIAS">Venta Directa de Licencias</option>
                    <option value="HIGH_TICKET_PROPERTY">Clientes High Ticket Inmobiliario</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase text-[10px]">Presupuesto Asignado ($ CLP):</label>
                  <input
                    type="number"
                    required
                    value={editingCampaign.budget || 0}
                    onChange={e => setEditingCampaign({ ...editingCampaign, budget: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase text-[10px]">Gasto Real Ejecutado ($ CLP):</label>
                  <input
                    type="number"
                    value={editingCampaign.spent || 0}
                    onChange={e => setEditingCampaign({ ...editingCampaign, spent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2 bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl">
                  <span className="font-black text-emerald-900 uppercase text-[10.5px] block flex items-center gap-1.5">
                    <Mail size={14} className="text-emerald-600" />
                    Datos de Contacto & Responsable Comercial (B2B):
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 text-[9.5px]">Correo de Contacto:</label>
                      <input
                        type="email"
                        required
                        value={editingCampaign.contactEmail || 'cristian.munoz0223@gmail.com'}
                        onChange={e => setEditingCampaign({ ...editingCampaign, contactEmail: e.target.value })}
                        placeholder="cristian.munoz0223@gmail.com"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-mono bg-white focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 text-[9.5px]">Teléfono de Contacto:</label>
                      <input
                        type="text"
                        value={editingCampaign.contactPhone || '+56961436853'}
                        onChange={e => setEditingCampaign({ ...editingCampaign, contactPhone: e.target.value })}
                        placeholder="+56961436853"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-mono bg-white focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 text-[9.5px]">Responsable / Asesor:</label>
                      <input
                        type="text"
                        value={editingCampaign.contactPerson || 'Cristián Muñoz - Dirección Comercial B2B'}
                        onChange={e => setEditingCampaign({ ...editingCampaign, contactPerson: e.target.value })}
                        placeholder="Cristián Muñoz - Dirección Comercial B2B"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700 uppercase text-[10px]">Público / Audiencia Objetivo:</label>
                  <input
                    type="text"
                    value={editingCampaign.targetAudience || ''}
                    onChange={e => setEditingCampaign({ ...editingCampaign, targetAudience: e.target.value })}
                    placeholder="Ej: CFOs, Gerentes Inmobiliarios & Administradores de Edificios"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1 bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                  <span className="font-black text-slate-800 uppercase text-[10px] block">Contenido del Anuncio & Propuesta de Valor:</span>
                  
                  <div>
                    <label className="font-bold text-slate-600 text-[9.5px]">Título del Anuncio:</label>
                    <input
                      type="text"
                      value={editingCampaign.adTitle || ''}
                      onChange={e => setEditingCampaign({ ...editingCampaign, adTitle: e.target.value })}
                      placeholder="Ej: Automatiza tus Contratos y Conciliación Inmobiliaria"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-600 text-[9.5px]">Copia del Anuncio (Ad Copy):</label>
                    <textarea
                      rows={2}
                      value={editingCampaign.adCopyText || ''}
                      onChange={e => setEditingCampaign({ ...editingCampaign, adCopyText: e.target.value })}
                      placeholder="Ej: Optimiza el 100% de la operación de arriendos, generación de comprobantes y cumplimiento tributario SII."
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-600 text-[9.5px]">Llamado a la Acción (CTA):</label>
                      <input
                        type="text"
                        value={editingCampaign.callToAction || ''}
                        onChange={e => setEditingCampaign({ ...editingCampaign, callToAction: e.target.value })}
                        placeholder="Solicitar Demo 15 min"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 text-[9.5px]">Estado de la Campaña:</label>
                      <select
                        value={editingCampaign.status || 'ACTIVA'}
                        onChange={e => setEditingCampaign({ ...editingCampaign, status: e.target.value as any })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold"
                      >
                        <option value="ACTIVA">Activa</option>
                        <option value="PAUSADA">Pausada</option>
                        <option value="BORRADOR">Borrador</option>
                        <option value="COMPLETADA">Completada</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase text-[10px]">Leads Generados (MQL):</label>
                  <input
                    type="number"
                    value={editingCampaign.leadsMql || 0}
                    onChange={e => setEditingCampaign({ ...editingCampaign, leadsMql: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase text-[10px]">Ventas / Contratos Adjudicados:</label>
                  <input
                    type="number"
                    value={editingCampaign.closedDeals || 0}
                    onChange={e => setEditingCampaign({ ...editingCampaign, closedDeals: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700 uppercase text-[10px]">Ingreso / Valor Adjudicado Total ($ CLP):</label>
                  <input
                    type="number"
                    value={editingCampaign.generatedRevenue || 0}
                    onChange={e => setEditingCampaign({ ...editingCampaign, generatedRevenue: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase rounded-xl shadow-md cursor-pointer"
                >
                  Guardar Campaña
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default MarketingCampaignsModule;
