import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Contractor, ContractorWageContract, ContractorFinancialTransaction } from '../types';
import { 
  Building2, Receipt, ArrowDownRight, ArrowUpLeft, Calculator,
  Calendar, FileSpreadsheet, Printer, Plus, Trash2, Edit3, 
  CheckCircle2, AlertTriangle, Scale, Coins, Layers, Download,
  Filter, FileText, ChevronRight, X, Search, CreditCard, PieChart
} from 'lucide-react';
import { formatCurrency } from '../utils/security';

interface ContractorFinancialStatementModalProps {
  contractor: Contractor;
  isOpen: boolean;
  onClose: () => void;
}

export const ContractorFinancialStatementModal: React.FC<ContractorFinancialStatementModalProps> = ({
  contractor,
  isOpen,
  onClose,
}) => {
  const {
    contractorContracts,
    contractorTransactions,
    addContractorTransaction,
    deleteContractorTransaction,
    addContractorContract,
    updateContractorContract,
    deleteContractorContract,
    getContractorFinancialSummary,
    projects,
    currentUser,
    companyName,
    hasActionPermission,
  } = useApp();

  const printRef = useRef<HTMLDivElement>(null);

  // Active sub-tab inside statement modal
  const [activeTab, setActiveTab] = useState<'statement' | 'contracts' | 'new_transaction' | 'new_contract'>('statement');
  
  // Filters for the Statement Ledger
  const [dateFilterStart, setDateFilterStart] = useState('');
  const [dateFilterEnd, setDateFilterEnd] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Transaction Form State
  const [txType, setTxType] = useState<ContractorFinancialTransaction['type']>('Payment');
  const [txDocNumber, setTxDocNumber] = useState(`FIN-${Math.floor(1000 + Math.random() * 9000)}`);
  const [txDate, setTxDate] = useState(new Date().toLocaleDateString('fa-IR'));
  const [txDescription, setTxDescription] = useState('');
  const [txContractId, setTxContractId] = useState('');
  const [txProjectId, setTxProjectId] = useState('');
  const [txProductionQty, setTxProductionQty] = useState<number | ''>('');
  const [txScrapQty, setTxScrapQty] = useState<number | ''>('');
  const [txUnitWage, setTxUnitWage] = useState<number | ''>(contractor.defaultUnitWage || '');
  const [txAmount, setTxAmount] = useState<number | ''>('');
  const [txPaymentMethod, setTxPaymentMethod] = useState<'BankTransfer' | 'Cheque' | 'Cash' | 'PettyCash'>('BankTransfer');
  const [txTrackingNumber, setTxTrackingNumber] = useState('');
  const [txNotes, setTxNotes] = useState('');

  // New Contract Form State
  const [cntrNumber, setCntrNumber] = useState(`WAGE-1404-${Math.floor(10 + Math.random() * 90)}`);
  const [cntrTitle, setCntrTitle] = useState('');
  const [cntrProjectId, setCntrProjectId] = useState('');
  const [cntrStepId, setCntrStepId] = useState('');
  const [cntrCalcType, setCntrCalcType] = useState<'PerPiece' | 'Fixed' | 'Batch'>('PerPiece');
  const [cntrWagePerUnit, setCntrWagePerUnit] = useState<number | ''>(contractor.defaultUnitWage || '');
  const [cntrScrapPenalty, setCntrScrapPenalty] = useState<number | ''>('');
  const [cntrAgreedQty, setCntrAgreedQty] = useState<number | ''>('');
  const [cntrStartDate, setCntrStartDate] = useState(new Date().toLocaleDateString('fa-IR'));
  const [cntrEndDate, setCntrEndDate] = useState('');
  const [cntrNotes, setCntrNotes] = useState('');

  const canEdit = hasActionPermission('edit');
  const canViewPrices = currentUser?.canViewPrices !== false;

  // Contracts & Transactions belonging to this contractor
  const contracts = useMemo(() => {
    return contractorContracts.filter(c => c.contractorId === contractor.id);
  }, [contractorContracts, contractor.id]);

  const rawTransactions = useMemo(() => {
    return contractorTransactions
      .filter(t => t.contractorId === contractor.id)
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [contractorTransactions, contractor.id]);

  // Comprehensive Financial Summary
  const summary = useMemo(() => {
    return getContractorFinancialSummary(contractor.id);
  }, [getContractorFinancialSummary, contractor.id, contractorTransactions, contractorContracts]);

  // Compute Running Balance for Double-Entry Ledger (صورتحساب دفتری دوبل)
  const statementLedger = useMemo(() => {
    let runningBalance = contractor.initialBalance || 0; // positive = credit, negative = debit
    
    // We will include initial balance row if non-zero
    const rows: Array<{
      id: string;
      docNumber: string;
      date: string;
      description: string;
      type: string;
      productionQuantity?: number;
      scrapQuantity?: number;
      unitWage?: number;
      debit: number;
      credit: number;
      balance: number;
      balanceStatus: 'بستانکار' | 'بدهکار' | 'تسویه';
      projectName?: string;
      registeredBy?: string;
      notes?: string;
      rawTx?: ContractorFinancialTransaction;
    }> = [];

    if (contractor.initialBalance && contractor.initialBalance !== 0) {
      const isCredit = contractor.initialBalance > 0;
      rows.push({
        id: 'row-init',
        docNumber: 'سند افتتاحیه',
        date: 'ابتدای دوره',
        description: 'مانده حساب انتقالی از دوره‌های قبل',
        type: 'InitialBalance',
        debit: !isCredit ? Math.abs(contractor.initialBalance) : 0,
        credit: isCredit ? contractor.initialBalance : 0,
        balance: Math.abs(runningBalance),
        balanceStatus: runningBalance > 0 ? 'بستانکار' : runningBalance < 0 ? 'بدهکار' : 'تسویه',
        registeredBy: 'حسابداری کل',
      });
    }

    rawTransactions.forEach(tx => {
      // In contractor accounting:
      // Credit = Our debt to contractor (Carried earnings from production wage)
      // Debit = Contractor debt to us (Payments made, penalties, tax deductions)
      // Balance = Total Credit - Total Debit (Positive => We owe contractor, Negative => Contractor owes us)
      runningBalance = runningBalance + (tx.credit || 0) - (tx.debit || 0);

      const proj = projects.find(p => p.id === tx.projectId);

      rows.push({
        id: tx.id,
        docNumber: tx.docNumber,
        date: tx.date,
        description: tx.description,
        type: tx.type,
        productionQuantity: tx.productionQuantity,
        scrapQuantity: tx.scrapQuantity,
        unitWage: tx.unitWage,
        debit: tx.debit || 0,
        credit: tx.credit || 0,
        balance: Math.abs(runningBalance),
        balanceStatus: runningBalance > 0 ? 'بستانکار' : runningBalance < 0 ? 'بدهکار' : 'تسویه',
        projectName: proj?.name || proj?.code,
        registeredBy: tx.registeredBy,
        notes: tx.notes,
        rawTx: tx,
      });
    });

    return rows;
  }, [rawTransactions, contractor.initialBalance, projects]);

  // Filtered rows for UI
  const filteredRows = useMemo(() => {
    return statementLedger.filter(row => {
      if (typeFilter !== 'all' && row.type !== typeFilter) return false;
      if (projectFilter !== 'all' && row.rawTx?.projectId !== projectFilter) return false;
      if (dateFilterStart && row.date < dateFilterStart) return false;
      if (dateFilterEnd && row.date > dateFilterEnd) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = 
          row.docNumber.toLowerCase().includes(q) ||
          row.description.toLowerCase().includes(q) ||
          (row.projectName && row.projectName.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [statementLedger, typeFilter, projectFilter, dateFilterStart, dateFilterEnd, searchQuery]);

  // Auto-calculate wage when qty and rate change in transaction form
  const handleQtyWageChange = (qty: number | '', wage: number | '') => {
    if (typeof qty === 'number' && typeof wage === 'number' && txType === 'WagePayable') {
      setTxAmount(qty * wage);
    }
  };

  // Submit Transaction
  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDocNumber || !txDescription) return;

    const amountNum = Number(txAmount) || 0;
    const isCreditType = txType === 'WagePayable';
    
    addContractorTransaction({
      docNumber: txDocNumber,
      date: txDate || new Date().toLocaleDateString('fa-IR'),
      contractorId: contractor.id,
      contractId: txContractId || undefined,
      projectId: txProjectId || undefined,
      type: txType,
      description: txDescription,
      productionQuantity: txProductionQty ? Number(txProductionQty) : undefined,
      scrapQuantity: txScrapQty ? Number(txScrapQty) : undefined,
      unitWage: txUnitWage ? Number(txUnitWage) : undefined,
      debit: !isCreditType ? amountNum : 0,
      credit: isCreditType ? amountNum : 0,
      paymentMethod: !isCreditType ? txPaymentMethod : undefined,
      trackingNumber: txTrackingNumber || undefined,
      registeredBy: currentUser.fullName || 'مسئول مالی',
      notes: txNotes || undefined,
    });

    // Reset form
    setTxDocNumber(`FIN-${Math.floor(1000 + Math.random() * 9000)}`);
    setTxDescription('');
    setTxAmount('');
    setTxProductionQty('');
    setTxScrapQty('');
    setTxNotes('');
    setTxTrackingNumber('');
    setActiveTab('statement');
  };

  // Submit Contract
  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cntrNumber || !cntrTitle || !cntrWagePerUnit) return;

    addContractorContract({
      contractorId: contractor.id,
      contractNumber: cntrNumber,
      title: cntrTitle,
      projectId: cntrProjectId || undefined,
      stepId: cntrStepId || undefined,
      calculationType: cntrCalcType,
      wagePerUnit: Number(cntrWagePerUnit),
      scrapPenaltyPerUnit: cntrScrapPenalty ? Number(cntrScrapPenalty) : undefined,
      agreedQuantity: cntrAgreedQty ? Number(cntrAgreedQty) : undefined,
      status: 'Active',
      startDate: cntrStartDate,
      endDate: cntrEndDate || undefined,
      notes: cntrNotes || undefined,
    });

    // Reset form
    setCntrNumber(`WAGE-1404-${Math.floor(10 + Math.random() * 90)}`);
    setCntrTitle('');
    setCntrWagePerUnit('');
    setCntrScrapPenalty('');
    setCntrAgreedQty('');
    setCntrNotes('');
    setActiveTab('contracts');
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'ردیف', 'شماره سند', 'تاریخ', 'شرح عملیات / کارمزد', 'نوع سند', 
      'تیراژ تولید (عدد)', 'نرخ کارمزد (ریال)', 'بدهکار / واریزی ما (ریال)', 
      'بستانکار / کارمزد استحقاقی (ریال)', 'مانده حساب (ریال)', 'وضعیت مانده'
    ];

    const csvRows = filteredRows.map((r, idx) => [
      idx + 1,
      `"${r.docNumber}"`,
      `"${r.date}"`,
      `"${r.description.replace(/"/g, '""')}"`,
      `"${r.type}"`,
      r.productionQuantity || 0,
      r.unitWage || 0,
      r.debit || 0,
      r.credit || 0,
      r.balance || 0,
      `"${r.balanceStatus}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `صورتحساب_پیمانکار_${contractor.code}_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-slate-800 text-amber-300 border border-amber-500/30 rounded-md">
                  {contractor.code}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  صورتحساب مالی و کارمزد تولید: {contractor.name}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>تخصص: {contractor.specialty}</span>
                {contractor.contactPerson && <span>• رابط: {contractor.contactPerson}</span>}
                {contractor.phone && <span className="font-mono text-slate-300">• تلفن: {contractor.phone}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="خروجی اکسل و CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>خروجی اکسل</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="چاپ صورتحساب رسمی"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>چاپ فرم</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial KPI Highlights Banner (Accounting View) */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          {/* Total Produced Units */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>کل تیراژ تولید شده</span>
              <Layers className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-lg font-extrabold text-slate-900">
                {summary.totalProducedQuantity.toLocaleString('fa-IR')}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">عدد قطعه</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              مجموع رسیدهای ثبت شده
            </div>
          </div>

          {/* Total Credit (Wage Earned) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>کل کارمزد استحقاقی (بستانکار)</span>
              <ArrowDownRight className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-lg font-extrabold text-emerald-700">
                {canViewPrices ? summary.totalCredit.toLocaleString('fa-IR') : '***'}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">ریال</span>
            </div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
              بدهی کارخانه به پیمانکار
            </div>
          </div>

          {/* Total Debit (Paid / Deductions) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>کل پرداختی و کسورات (بدهکار)</span>
              <ArrowUpLeft className="w-4 h-4 text-rose-600" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-lg font-extrabold text-rose-700">
                {canViewPrices ? summary.totalDebit.toLocaleString('fa-IR') : '***'}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">ریال</span>
            </div>
            <div className="text-[10px] text-rose-600 font-medium mt-0.5">
              واریزی، پیش‌پرداخت، مالیات
            </div>
          </div>

          {/* Net Outstanding Balance */}
          <div className={`border rounded-xl p-3 shadow-2xs ${
            summary.status === 'Creditor' 
              ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
              : summary.status === 'Debtor' 
                ? 'bg-blue-50/70 border-blue-200 text-blue-900' 
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>مانده نهایی طلب / بدهی</span>
              <Scale className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-lg font-black">
                {canViewPrices ? summary.balance.toLocaleString('fa-IR') : '***'}
              </span>
              <span className="text-[10px] font-bold">ریال</span>
            </div>
            <div className="text-[11px] font-bold mt-0.5">
              {summary.status === 'Creditor' && '🟢 پیمانکار طلبکار است (مانده بستانکار)'}
              {summary.status === 'Debtor' && '🔵 پیمانکار بدهکار است (مانده بدهکار)'}
              {summary.status === 'Settled' && '✅ حساب کاملاً تسویه و صفر است'}
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('statement')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'statement'
                  ? 'border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>صورتحساب و کاردکس مالی دوبل</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 font-mono">
                {statementLedger.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('contracts')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'contracts'
                  ? 'border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>قراردادهای کارمزد و نرخ‌ها</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 font-mono">
                {contracts.length}
              </span>
            </button>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2 pb-2">
              <button
                onClick={() => setActiveTab('new_transaction')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                  activeTab === 'new_transaction'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ثبت سند مالی جدید</span>
              </button>

              <button
                onClick={() => setActiveTab('new_contract')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                  activeTab === 'new_contract'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تعریف قرارداد کارمزد</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
          
          {/* TAB 1: STATEMENT LEDGER (صورتحساب دفتری دوبل طبق اصول حسابداری) */}
          {activeTab === 'statement' && (
            <div className="space-y-4">
              
              {/* Filter Toolbars */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="relative min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="جستجوی شماره سند، شرح، پروژه..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-3 pr-8 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">نوع سند:</span>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="p-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="all">همه اسناد مالی</option>
                      <option value="WagePayable">کارمزد تولیدی (بستانکار)</option>
                      <option value="Payment">پرداخت وجه و تسویه (بدهکار)</option>
                      <option value="Prepayment">پیش‌پرداخت (بدهکار)</option>
                      <option value="TaxDeduction">کسورات بیمه و مالیات</option>
                      <option value="ScrapPenalty">جریمه ضایعات</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">پروژه:</span>
                    <select
                      value={projectFilter}
                      onChange={(e) => setProjectFilter(e.target.value)}
                      className="p-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="all">همه پروژه‌ها</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-medium">
                  نمایش {filteredRows.length} ردیف از {statementLedger.length} سند مالی
                </div>
              </div>

              {/* Ledger Table (Printing Target) */}
              <div ref={printRef} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden print:border-none print:shadow-none">
                
                {/* Printable Header (Visible only in print) */}
                <div className="hidden print:block p-6 border-b border-slate-300 text-slate-900">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <div>
                      <h1 className="text-xl font-bold">{companyName || 'سامانه مدیریت جامع انبارداری و تولید'}</h1>
                      <h2 className="text-base font-semibold text-slate-700 mt-1">
                        صورتحساب کارمزد و وضعیت بدهکاری/بستانکاری پیمانکار
                      </h2>
                    </div>
                    <div className="text-left font-mono text-xs space-y-1">
                      <div>تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}</div>
                      <div>کد پیمانکار: {contractor.code}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div><strong>نام پیمانکار:</strong> {contractor.name}</div>
                    <div><strong>زمینه تخصص:</strong> {contractor.specialty}</div>
                    <div><strong>تلفن:</strong> {contractor.phone}</div>
                    <div><strong>شماره شبا/حساب:</strong> {contractor.bankAccountInfo || 'ثبت نشده'}</div>
                    <div><strong>شناسه ملی/کد اقتصادی:</strong> {contractor.nationalId || '---'}</div>
                    <div><strong>آدرس:</strong> {contractor.address || '---'}</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                        <th className="py-3 px-3">ردیف</th>
                        <th className="py-3 px-3">شماره سند</th>
                        <th className="py-3 px-3">تاریخ</th>
                        <th className="py-3 px-4">شرح سند / عملیات کارمزد تولید</th>
                        <th className="py-3 px-2 text-center">تیراژ تولید</th>
                        <th className="py-3 px-2 text-center">نرخ کارمزد</th>
                        <th className="py-3 px-3 text-rose-700 text-center">بدهکار (واریزی ما)</th>
                        <th className="py-3 px-3 text-emerald-700 text-center">بستانکار (کارمزد استحقاقی)</th>
                        <th className="py-3 px-3 text-center">مانده طلب / بدهی</th>
                        <th className="py-3 px-3 text-center">وضعیت</th>
                        {canEdit && <th className="py-3 px-2 text-center print:hidden">عملیات</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-400 font-medium">
                            سند مالی یا کارمزدی برای این پیمانکار با فیلترهای انتخابی یافت نشد.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row, idx) => (
                          <tr 
                            key={row.id} 
                            className={`hover:bg-amber-50/40 transition-colors ${
                              row.type === 'InitialBalance' ? 'bg-slate-50/80 font-semibold' : ''
                            }`}
                          >
                            <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                              {idx + 1}
                            </td>

                            <td className="py-3 px-3 font-mono font-bold text-slate-800 text-[11px]">
                              {row.docNumber}
                            </td>

                            <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                              {row.date}
                            </td>

                            <td className="py-3 px-4 text-slate-800">
                              <div className="font-medium">{row.description}</div>
                              {row.projectName && (
                                <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                                  پروژه: {row.projectName}
                                </div>
                              )}
                              {row.notes && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  یادداشت: {row.notes}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-2 text-center font-mono font-bold text-slate-700">
                              {row.productionQuantity ? (
                                <div>
                                  <span>{row.productionQuantity.toLocaleString('fa-IR')}</span>
                                  {row.scrapQuantity ? (
                                    <span className="text-[9px] text-rose-500 block font-normal">
                                      ({row.scrapQuantity} ضایعات)
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            <td className="py-3 px-2 text-center font-mono text-slate-600">
                              {row.unitWage ? (
                                <span>{canViewPrices ? row.unitWage.toLocaleString('fa-IR') : '***'}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            {/* Debit (بدهکار) */}
                            <td className="py-3 px-3 text-center font-mono font-bold text-rose-600 bg-rose-50/20">
                              {row.debit > 0 ? (
                                <span>{canViewPrices ? row.debit.toLocaleString('fa-IR') : '***'}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            {/* Credit (بستانکار) */}
                            <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 bg-emerald-50/20">
                              {row.credit > 0 ? (
                                <span>{canViewPrices ? row.credit.toLocaleString('fa-IR') : '***'}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            {/* Running Balance */}
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                              {canViewPrices ? row.balance.toLocaleString('fa-IR') : '***'}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                row.balanceStatus === 'بستانکار'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : row.balanceStatus === 'بدهکار'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {row.balanceStatus}
                              </span>
                            </td>

                            {/* Actions */}
                            {canEdit && (
                              <td className="py-3 px-2 text-center print:hidden">
                                {row.rawTx && (
                                  <button
                                    onClick={() => {
                                      if (confirm(`آیا از حذف سند مالی شماره "${row.docNumber}" اطمینان دارید؟`)) {
                                        deleteContractorTransaction(row.rawTx!.id);
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="حذف سند مالی"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300 text-xs">
                        <td colSpan={4} className="py-3.5 px-4 text-left">
                          مجموع کل مبالغ صورتحساب و مانده نهایی طلب پیمانکار:
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono text-indigo-700">
                          {filteredRows.reduce((s, r) => s + (r.productionQuantity || 0), 0).toLocaleString('fa-IR')}
                        </td>
                        <td className="py-3.5 px-2 text-center text-slate-400">-</td>
                        <td className="py-3.5 px-3 text-center font-mono text-rose-700">
                          {canViewPrices ? filteredRows.reduce((s, r) => s + r.debit, 0).toLocaleString('fa-IR') : '***'}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-emerald-700">
                          {canViewPrices ? filteredRows.reduce((s, r) => s + r.credit, 0).toLocaleString('fa-IR') : '***'}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-base font-extrabold text-slate-900">
                          {canViewPrices ? summary.balance.toLocaleString('fa-IR') : '***'}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-amber-800">
                          {summary.status === 'Creditor' ? 'مانده بستانکار' : summary.status === 'Debtor' ? 'مانده بدهکار' : 'تسویه'}
                        </td>
                        {canEdit && <td className="print:hidden"></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Accounting Signatures for Print */}
                <div className="hidden print:grid grid-cols-4 gap-4 p-8 pt-12 border-t border-slate-300 text-center text-xs text-slate-700 font-semibold">
                  <div className="space-y-12">
                    <div>تنظیم‌کننده و انباردار</div>
                    <div className="border-t border-slate-400 pt-1">امضاء و اثر انگشت</div>
                  </div>
                  <div className="space-y-12">
                    <div>مسئول کنترل کیفیت و تولید</div>
                    <div className="border-t border-slate-400 pt-1">امضاء و تاییدیه</div>
                  </div>
                  <div className="space-y-12">
                    <div>امور مالی و حسابداری صنعتی</div>
                    <div className="border-t border-slate-400 pt-1">امضاء و مهر</div>
                  </div>
                  <div className="space-y-12">
                    <div>نماینده قانونی پیمانکار</div>
                    <div className="border-t border-slate-400 pt-1">امضاء و مهر شرکت</div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: CONTRACTS & WAGE AGREEMENTS (قراردادهای کارمزد) */}
          {activeTab === 'contracts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">قراردادهای فعال کارمزد و نرخ‌های توافق شده</h3>
                  <p className="text-xs text-slate-500">لیست نرخ‌های دستمزد به ازای هر قطعه سالم و جریمه ضایعات برای هر مرحله خط تولید</p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => setActiveTab('new_contract')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>افزودن قرارداد کارمزد جدید</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contracts.length === 0 ? (
                  <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                    قرارداد کارمزدی برای این پیمانکار ثبت نشده است. می‌توانید با کلیک بر روی دکمه بالا قرارداد جدید ایجاد کنید.
                  </div>
                ) : (
                  contracts.map(cntr => {
                    const proj = projects.find(p => p.id === cntr.projectId);
                    return (
                      <div key={cntr.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3 hover:border-amber-300 transition-all">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                          <div>
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                              {cntr.contractNumber}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm mt-1">{cntr.title}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              cntr.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {cntr.status === 'Active' ? 'فعال و جاری' : 'خاتمه‌یافته'}
                            </span>
                            {canEdit && (
                              <button
                                onClick={() => {
                                  if (confirm(`آیا از حذف قرارداد شماره "${cntr.contractNumber}" اطمینان دارید؟`)) {
                                    deleteContractorContract(cntr.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-slate-500 text-[11px] block">نرخ کارمزد به ازای هر قطعه سالم</span>
                            <span className="font-mono text-sm font-extrabold text-emerald-700">
                              {canViewPrices ? cntr.wagePerUnit.toLocaleString('fa-IR') : '***'} ریال
                            </span>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-slate-500 text-[11px] block">جریمه به ازای هر عدد ضایعات</span>
                            <span className="font-mono text-sm font-extrabold text-rose-700">
                              {cntr.scrapPenaltyPerUnit && canViewPrices ? `${cntr.scrapPenaltyPerUnit.toLocaleString('fa-IR')} ریال` : 'بدون جریمه'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                          {proj && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">پروژه مرتبط:</span>
                              <span className="font-semibold text-slate-800">{proj.name} ({proj.code})</span>
                            </div>
                          )}
                          {cntr.agreedQuantity && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">تیراژ کل قرارداد:</span>
                              <span className="font-mono font-bold text-slate-800">{cntr.agreedQuantity.toLocaleString('fa-IR')} عدد</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">تاریخ شروع:</span>
                            <span className="font-mono">{cntr.startDate}</span>
                          </div>
                          {cntr.notes && (
                            <div className="text-[11px] text-slate-500 bg-amber-50/50 p-2 rounded-lg border border-amber-100 mt-2">
                              {cntr.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: REGISTER NEW FINANCIAL TRANSACTION (ثبت سند دوبل و کارمزد) */}
          {activeTab === 'new_transaction' && (
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">ثبت سند مالی و کارمزد جدید برای پیمانکار</h3>
                    <p className="text-xs text-slate-500">ثبت کارمزد تولید قطعات سالم، پرداخت وجه، پیش‌پرداخت، یا کسورات قانونی</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('statement')}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  بازگشت به صورتحساب
                </button>
              </div>

              <form onSubmit={handleCreateTransaction} className="space-y-4 text-xs">
                
                {/* Transaction Type Selector */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">نوع سند مالی و حسابداری*</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'WagePayable', label: 'کارمزد تولید قطعات (بستانکار)', icon: ArrowDownRight, color: 'text-emerald-700 border-emerald-300 bg-emerald-50/50' },
                      { id: 'Payment', label: 'پرداخت وجه و تسویه (بدهکار)', icon: ArrowUpLeft, color: 'text-rose-700 border-rose-300 bg-rose-50/50' },
                      { id: 'Prepayment', label: 'پیش‌پرداخت قرارداد (بدهکار)', icon: ArrowUpLeft, color: 'text-indigo-700 border-indigo-300 bg-indigo-50/50' },
                      { id: 'TaxDeduction', label: 'کسر مالیات و بیمه ماده ۳۸', icon: Scale, color: 'text-amber-700 border-amber-300 bg-amber-50/50' },
                      { id: 'ScrapPenalty', label: 'جریمه کسر ضایعات غیرمجاز', icon: AlertTriangle, color: 'text-rose-800 border-rose-400 bg-rose-50' },
                      { id: 'Adjustment', label: 'سند تعدیل و اصلاحیه حسابداری', icon: Scale, color: 'text-slate-700 border-slate-300 bg-slate-50' },
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTxType(item.id as any)}
                        className={`p-2.5 rounded-xl border text-right font-bold flex items-center gap-2 transition-all ${
                          txType === item.id 
                            ? `${item.color} ring-2 ring-amber-500` 
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="text-[11px] leading-tight">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">شماره سند مالی*</label>
                    <input
                      type="text"
                      required
                      value={txDocNumber}
                      onChange={(e) => setTxDocNumber(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">تاریخ ثبت سند*</label>
                    <input
                      type="text"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">قرارداد مرتبط (اختیاری)</label>
                    <select
                      value={txContractId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        setTxContractId(cid);
                        const selCntr = contracts.find(c => c.id === cid);
                        if (selCntr) {
                          setTxUnitWage(selCntr.wagePerUnit);
                          if (selCntr.projectId) setTxProjectId(selCntr.projectId);
                        }
                      }}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">-- بدون قرارداد اختصاصی --</option>
                      {contracts.map(c => (
                        <option key={c.id} value={c.id}>{c.contractNumber} - {c.title} (فی: {c.wagePerUnit.toLocaleString('fa-IR')})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">پروژه مرتبط</label>
                    <select
                      value={txProjectId}
                      onChange={(e) => setTxProjectId(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">-- بدون ارتباط مستقیم با پروژه --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Wage Calculation Fields (If Type is WagePayable) */}
                {txType === 'WagePayable' && (
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-emerald-800 text-xs">
                      <Calculator className="w-4 h-4" />
                      <span>محاسبه هوشمند کارمزد بر اساس تیراژ تولید سالم</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">تعداد تولید سالم (عدد)*</label>
                        <input
                          type="number"
                          placeholder="مثال: 200"
                          value={txProductionQty}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            setTxProductionQty(val);
                            handleQtyWageChange(val, txUnitWage);
                          }}
                          className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">تعداد ضایعات (عدد)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={txScrapQty}
                          onChange={(e) => setTxScrapQty(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">نرخ کارمزد هر عدد (ریال)*</label>
                        <input
                          type="number"
                          placeholder="90000"
                          value={txUnitWage}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            setTxUnitWage(val);
                            handleQtyWageChange(txProductionQty, val);
                          }}
                          className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    مبلغ سند (ریال)* {txType === 'WagePayable' ? '(حاصل ضرب تیراژ در فی کارمزد)' : ''}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      placeholder="مبلغ به ریال..."
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="absolute left-3 top-3 text-slate-400 font-bold text-xs">ریال</span>
                  </div>
                  {typeof txAmount === 'number' && txAmount > 0 && (
                    <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
                      معادل: {txAmount.toLocaleString('fa-IR')} ریال
                    </span>
                  )}
                </div>

                {/* Payment method if paying out */}
                {(txType === 'Payment' || txType === 'Prepayment') && (
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">روش پرداخت</label>
                      <select
                        value={txPaymentMethod}
                        onChange={(e) => setTxPaymentMethod(e.target.value as any)}
                        className="w-full p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="BankTransfer">انتقال بانکی / پایا / ساتنا</option>
                        <option value="Cheque">چک صیادی / شرکتی</option>
                        <option value="Cash">نقدی از صندوق</option>
                        <option value="PettyCash">تنخواه‌گردان</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">شماره پیگیری / شماره چک</label>
                      <input
                        type="text"
                        placeholder="TRK-9842104"
                        value={txTrackingNumber}
                        onChange={(e) => setTxTrackingNumber(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">شرح کامل سند حسابداری*</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تسویه کارمزد تحویل پارت اول برد SMD پروژه PRJ-101"
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">توضیحات و ملاحظات تکمیلی</label>
                  <textarea
                    rows={2}
                    placeholder="یادداشت‌های فنی، شماره بارنامه یا شماره رسید انبار..."
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('statement')}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ثبت سند مالی در دفتر دوبل</span>
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* TAB 4: DEFINE NEW CONTRACT (تعریف قرارداد کارمزد) */}
          {activeTab === 'new_contract' && (
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-800 text-white rounded-xl">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">تعریف قرارداد کارمزد جدید برای پیمانکار</h3>
                    <p className="text-xs text-slate-500">تنظیم نرخ واحد دستمزد تولید، جریمه ضایعات و تیراژ توافق شده</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('contracts')}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  بازگشت به لیست قراردادها
                </button>
              </div>

              <form onSubmit={handleCreateContract} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">شماره قرارداد*</label>
                    <input
                      type="text"
                      required
                      value={cntrNumber}
                      onChange={(e) => setCntrNumber(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">عنوان قرارداد*</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: کارمزد مونتاژ ماشینی برد SMD"
                      value={cntrTitle}
                      onChange={(e) => setCntrTitle(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">پروژه خط تولید</label>
                    <select
                      value={cntrProjectId}
                      onChange={(e) => setCntrProjectId(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">-- قابل استفاده در تمامی پروژه‌ها --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">نوع محاسبه کارمزد</label>
                    <select
                      value={cntrCalcType}
                      onChange={(e) => setCntrCalcType(e.target.value as any)}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="PerPiece">فی به ازای هر قطعه سالم تولید شده (قطعه‌ای)</option>
                      <option value="Fixed">مبلغ مقطوع و ثابت مرحله</option>
                      <option value="Batch">به ازای هر پارت و بچ تولیدی</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">نرخ کارمزد واحد (ریال)*</label>
                    <input
                      type="number"
                      required
                      placeholder="90000"
                      value={cntrWagePerUnit}
                      onChange={(e) => setCntrWagePerUnit(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-xl font-mono text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">جریمه هر عدد ضایعات (ریال)</label>
                    <input
                      type="number"
                      placeholder="185000"
                      value={cntrScrapPenalty}
                      onChange={(e) => setCntrScrapPenalty(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">تیراژ توافق شده (عدد)</label>
                    <input
                      type="number"
                      placeholder="500"
                      value={cntrAgreedQty}
                      onChange={(e) => setCntrAgreedQty(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">تاریخ شروع قرارداد</label>
                    <input
                      type="text"
                      value={cntrStartDate}
                      onChange={(e) => setCntrStartDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">تاریخ انقضاء / خاتمه</label>
                    <input
                      type="text"
                      placeholder="1404/12/29"
                      value={cntrEndDate}
                      onChange={(e) => setCntrEndDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ملاحظات و شرایط تسویه حساب</label>
                  <textarea
                    rows={2}
                    placeholder="شرایط پذیرش کنترل کیفیت، درصد بیمه و مالیات تکلیفی..."
                    value={cntrNotes}
                    onChange={(e) => setCntrNotes(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('contracts')}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>ثبت و فعال‌سازی قرارداد</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
