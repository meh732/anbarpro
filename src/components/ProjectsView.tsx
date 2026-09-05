import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Project, ProjectStatus, ProjectStep } from '../types';
import { 
  Factory, Plus, CheckCircle2, Clock, PlayCircle, 
  ChevronDown, ChevronUp, User, Users, Calendar, X, GitBranch, Building2,
  Trash2, ArrowUp, ArrowDown, Cpu, ArrowRightLeft, AlertTriangle, Layers,
  Boxes, Warehouse, Check, FileCheck, ShieldAlert, Sparkles,
  PieChart, BarChart3, FolderTree, FileText, Search, DollarSign, Layers3,
  Pencil, Edit, Eye, Calculator, Zap, Home, Archive, LayoutGrid, List,
  SlidersHorizontal, CheckSquare, Package, TrendingUp, FileSpreadsheet
} from 'lucide-react';
import { SmartStageScalingModal } from './SmartStageScalingModal';
import { ProjectBOMEditor, BOMRowItem, StepBOMConfig } from './ProjectBOMEditor';
import { 
  StepMaterialHandoverModal, 
  StepOutputReceiptModal, 
  ProjectStageProgressReportModal 
} from './ProjectStageModals';

// Sub-stage dedicated harmonious color palettes for visual separation & ergonomics
export interface SubStageTheme {
  name: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  borderRight: string;
  cardBg: string;
  cardBorder: string;
  cardHoverBorder: string;
  indicatorBg: string;
  indicatorText: string;
  indicatorBorder: string;
  accentDot: string;
  connectorLine: string;
  treeCardBg: string;
  treeCardBorder: string;
}

export const SUB_STAGE_THEMES: SubStageTheme[] = [
  // 1. Sky / Blue
  {
    name: 'آبی آسمانی',
    badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
    badgeText: 'text-sky-900',
    badgeBorder: 'border-sky-300',
    borderRight: 'border-r-sky-500',
    cardBg: 'bg-sky-50/50 hover:bg-sky-50/80',
    cardBorder: 'border-sky-200/90',
    cardHoverBorder: 'hover:border-sky-300',
    indicatorBg: 'bg-sky-100 text-sky-900 border-sky-300',
    indicatorText: 'text-sky-900',
    indicatorBorder: 'border-sky-300',
    accentDot: 'bg-sky-500',
    connectorLine: 'bg-sky-500',
    treeCardBg: 'bg-sky-50/80',
    treeCardBorder: 'border-sky-300 ring-1 ring-sky-200'
  },
  // 2. Purple / Violet
  {
    name: 'بنفش ارغوانی',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    badgeText: 'text-purple-900',
    badgeBorder: 'border-purple-300',
    borderRight: 'border-r-purple-500',
    cardBg: 'bg-purple-50/50 hover:bg-purple-50/80',
    cardBorder: 'border-purple-200/90',
    cardHoverBorder: 'hover:border-purple-300',
    indicatorBg: 'bg-purple-100 text-purple-900 border-purple-300',
    indicatorText: 'text-purple-900',
    indicatorBorder: 'border-purple-300',
    accentDot: 'bg-purple-500',
    connectorLine: 'bg-purple-500',
    treeCardBg: 'bg-purple-50/80',
    treeCardBorder: 'border-purple-300 ring-1 ring-purple-200'
  },
  // 3. Amber / Warm Gold
  {
    name: 'کهربایی زرین',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-300',
    borderRight: 'border-r-amber-500',
    cardBg: 'bg-amber-50/50 hover:bg-amber-50/80',
    cardBorder: 'border-amber-200/90',
    cardHoverBorder: 'hover:border-amber-300',
    indicatorBg: 'bg-amber-100 text-amber-900 border-amber-300',
    indicatorText: 'text-amber-900',
    indicatorBorder: 'border-amber-300',
    accentDot: 'bg-amber-500',
    connectorLine: 'bg-amber-500',
    treeCardBg: 'bg-amber-50/80',
    treeCardBorder: 'border-amber-300 ring-1 ring-amber-200'
  },
  // 4. Emerald / Mint
  {
    name: 'سبز زمردی',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    badgeText: 'text-emerald-900',
    badgeBorder: 'border-emerald-300',
    borderRight: 'border-r-emerald-500',
    cardBg: 'bg-emerald-50/50 hover:bg-emerald-50/80',
    cardBorder: 'border-emerald-200/90',
    cardHoverBorder: 'hover:border-emerald-300',
    indicatorBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    indicatorText: 'text-emerald-900',
    indicatorBorder: 'border-emerald-300',
    accentDot: 'bg-emerald-500',
    connectorLine: 'bg-emerald-500',
    treeCardBg: 'bg-emerald-50/80',
    treeCardBorder: 'border-emerald-300 ring-1 ring-emerald-200'
  },
  // 5. Rose / Coral
  {
    name: 'گلبهی مرجانی',
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
    badgeText: 'text-rose-900',
    badgeBorder: 'border-rose-300',
    borderRight: 'border-r-rose-500',
    cardBg: 'bg-rose-50/50 hover:bg-rose-50/80',
    cardBorder: 'border-rose-200/90',
    cardHoverBorder: 'hover:border-rose-300',
    indicatorBg: 'bg-rose-100 text-rose-900 border-rose-300',
    indicatorText: 'text-rose-900',
    indicatorBorder: 'border-rose-300',
    accentDot: 'bg-rose-500',
    connectorLine: 'bg-rose-500',
    treeCardBg: 'bg-rose-50/80',
    treeCardBorder: 'border-rose-300 ring-1 ring-rose-200'
  },
  // 6. Teal / Cyan
  {
    name: 'فیروزه‌ای دریایی',
    badgeBg: 'bg-teal-100 text-teal-900 border-teal-300',
    badgeText: 'text-teal-900',
    badgeBorder: 'border-teal-300',
    borderRight: 'border-r-teal-500',
    cardBg: 'bg-teal-50/50 hover:bg-teal-50/80',
    cardBorder: 'border-teal-200/90',
    cardHoverBorder: 'hover:border-teal-300',
    indicatorBg: 'bg-teal-100 text-teal-900 border-teal-300',
    indicatorText: 'text-teal-900',
    indicatorBorder: 'border-teal-300',
    accentDot: 'bg-teal-500',
    connectorLine: 'bg-teal-500',
    treeCardBg: 'bg-teal-50/80',
    treeCardBorder: 'border-teal-300 ring-1 ring-teal-200'
  },
  // 7. Orange / Tangerine
  {
    name: 'نارنجی پرتغالی',
    badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
    badgeText: 'text-orange-900',
    badgeBorder: 'border-orange-300',
    borderRight: 'border-r-orange-500',
    cardBg: 'bg-orange-50/50 hover:bg-orange-50/80',
    cardBorder: 'border-orange-200/90',
    cardHoverBorder: 'hover:border-orange-300',
    indicatorBg: 'bg-orange-100 text-orange-900 border-orange-300',
    indicatorText: 'text-orange-900',
    indicatorBorder: 'border-orange-300',
    accentDot: 'bg-orange-500',
    connectorLine: 'bg-orange-500',
    treeCardBg: 'bg-orange-50/80',
    treeCardBorder: 'border-orange-300 ring-1 ring-orange-200'
  },
  // 8. Indigo / Violet
  {
    name: 'نیلی لاجوردی',
    badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    badgeText: 'text-indigo-900',
    badgeBorder: 'border-indigo-300',
    borderRight: 'border-r-indigo-500',
    cardBg: 'bg-indigo-50/50 hover:bg-indigo-50/80',
    cardBorder: 'border-indigo-200/90',
    cardHoverBorder: 'hover:border-indigo-300',
    indicatorBg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    indicatorText: 'text-indigo-900',
    indicatorBorder: 'border-indigo-300',
    accentDot: 'bg-indigo-500',
    connectorLine: 'bg-indigo-500',
    treeCardBg: 'bg-indigo-50/80',
    treeCardBorder: 'border-indigo-300 ring-1 ring-indigo-200'
  }
];

export const getSubStageTheme = (subIndex: number = 0, depth: number = 1): SubStageTheme => {
  const index = Math.abs((depth - 1) * 3 + subIndex) % SUB_STAGE_THEMES.length;
  return SUB_STAGE_THEMES[index];
};

// Helper Component for True 2D Graphical Organizational Tree Diagram with Connecting Branch Lines
const GraphicalOrgTreeNode: React.FC<{
  step: ProjectStep;
  projectId: string;
  codePrefix: string;
  items: any[];
  boms: any[];
  contractors: any[];
  statusFilter: string;
  typeFilter: string;
  depth?: number;
  subIndex?: number;
  updateProjectStep: (projectId: string, stepId: string, status: 'Pending' | 'InProgress' | 'Completed') => void;
  setAddingSubStepTo: (val: { projectId: string; parentStepId: string } | null) => void;
  onEditStep?: (step: ProjectStep, projectId: string) => void;
  onDeleteStep?: (stepId: string, projectId: string) => void;
}> = ({
  step,
  projectId,
  codePrefix,
  items,
  boms,
  contractors,
  statusFilter,
  typeFilter,
  depth = 0,
  subIndex = 0,
  updateProjectStep,
  setAddingSubStepTo,
  onEditStep,
  onDeleteStep,
}) => {
  const [isTreeExpanded, setIsTreeExpanded] = useState(true);

  if (statusFilter !== 'all' && step.status !== statusFilter) return null;
  if (typeFilter === 'outsourced' && !step.isOutsourced && !step.contractorId) return null;
  if (typeFilter === 'internal' && (step.isOutsourced || step.contractorId)) return null;

  const subSteps = step.subSteps || [];
  const outputItem = items.find(i => i.id === step.outputItemId);
  const matchedBom = boms.find(b => b.finishedItemId === step.outputItemId && b.isActive);
  const contractor = contractors.find(c => c.id === step.contractorId);

  const isSubStage = depth > 0;
  const theme = isSubStage ? getSubStageTheme(subIndex, depth) : null;

  return (
    <div className="flex flex-col items-center relative">
      {/* Step Card Box */}
      <div className={`w-64 p-3 rounded-2xl border transition-all duration-200 shadow-sm relative z-10 hover:shadow-md hover:scale-[1.02] ${
        step.status === 'Completed'
          ? `bg-emerald-50 border-emerald-300 text-emerald-950 ring-2 ring-emerald-200 ${isSubStage ? `border-r-4 ${theme?.borderRight}` : ''}`
          : step.status === 'InProgress'
          ? `bg-indigo-50 border-indigo-300 text-indigo-950 ring-2 ring-indigo-300 ${isSubStage ? `border-r-4 ${theme?.borderRight}` : ''}`
          : isSubStage
          ? `${theme?.treeCardBg} ${theme?.treeCardBorder} border-r-4 ${theme?.borderRight} text-slate-900`
          : 'bg-white border-slate-300 text-slate-800'
      }`}>
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className={`font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
              isSubStage ? theme?.indicatorBg : 'bg-indigo-100 text-indigo-900 border-indigo-200'
            }`}>
              {isSubStage ? `زیرمرحله ${codePrefix}` : `مرحله ${codePrefix}`}
            </span>
            {subSteps.length > 0 && (
              <button
                type="button"
                onClick={() => setIsTreeExpanded(!isTreeExpanded)}
                className="p-1 hover:bg-slate-200/80 rounded-md text-indigo-700 transition-all flex items-center gap-0.5 text-[9px] font-bold"
                title={isTreeExpanded ? 'بستن زیرمراحل' : 'باز کردن زیرمراحل'}
              >
                <span className={`inline-block transform transition-transform duration-200 text-[9px] ${isTreeExpanded ? 'rotate-90 text-indigo-600' : 'rotate-0 text-slate-500'}`}>
                  ▶
                </span>
                <span>({subSteps.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {step.status === 'Completed' ? (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[9px] flex items-center gap-1 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                تکمیل شد
              </span>
            ) : step.status === 'InProgress' ? (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-bold text-[9px] flex items-center gap-1 border border-indigo-300 animate-pulse">
                <Clock className="w-3 h-3 text-indigo-600 animate-spin" />
                در حال انجام
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold text-[9px] flex items-center gap-1 border border-slate-200">
                <PlayCircle className="w-3 h-3 text-slate-400" />
                در انتظار
              </span>
            )}
            {onEditStep && (
              <button
                type="button"
                onClick={() => onEditStep(step, projectId)}
                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                title="ویرایش مرحله"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
            {onDeleteStep && (
              <button
                type="button"
                onClick={() => onDeleteStep(step.id, projectId)}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                title="حذف مرحله"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <h5 className="font-bold text-xs text-slate-900 line-clamp-2 min-h-[1.75rem]">
          {step.name || step.title}
        </h5>

        <div className="space-y-1 my-2 text-[10px]">
          {step.isOutsourced || step.contractorId ? (
            <div className="bg-amber-100/90 text-amber-900 px-2 py-1 rounded-lg font-bold border border-amber-300 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-amber-700 shrink-0" />
                {step.contractorName || contractor?.name || 'پیمانکار برون‌سپاری'}
              </span>
              {(step.outsourcingCost || step.contractorCost) ? (
                <span className="font-mono text-amber-800 font-extrabold">
                  {(step.outsourcingCost || step.contractorCost || 0).toLocaleString('fa-IR')}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
              <Users className="w-3 h-3 text-indigo-600 shrink-0" />
              <span className="truncate">{step.assignedOperators?.join(', ') || 'خط مونتاژ داخلی'}</span>
            </div>
          )}

          {outputItem && (
            <div className="bg-purple-50 text-purple-900 px-2 py-1 rounded-lg border border-purple-200 flex items-center justify-between">
              <span className="flex items-center gap-1 truncate font-bold">
                <Boxes className="w-3 h-3 text-purple-600 shrink-0" />
                {outputItem.name}
              </span>
              <span className="font-mono font-bold text-purple-800 bg-purple-100 px-1 py-0.2 rounded text-[9px]">
                {step.outputQuantity || 1} {outputItem.unit}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-200/80">
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="در حال انجام"
              onClick={() => updateProjectStep(projectId, step.id, 'InProgress')}
              className={`p-1 rounded text-[9px] font-bold transition-all ${
                step.status === 'InProgress' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              اجرا
            </button>
            <button
              type="button"
              title="تکمیل شده"
              onClick={() => updateProjectStep(projectId, step.id, 'Completed')}
              className={`p-1 rounded text-[9px] font-bold transition-all ${
                step.status === 'Completed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              تکمیل
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAddingSubStepTo({ projectId, parentStepId: step.id })}
            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-0.5 border border-indigo-200"
          >
            <Plus className="w-3 h-3 text-indigo-600" />
            <span>زیرمرحله</span>
          </button>
        </div>
      </div>

      {/* Sub-steps Trunk line connecting down */}
      {subSteps.length > 0 && isTreeExpanded && (
        <div className="w-0.5 h-6 bg-indigo-500 my-0 relative z-0"></div>
      )}

      {/* Sub-steps Children Branch Row */}
      {subSteps.length > 0 && isTreeExpanded && (
        <div className="relative flex justify-center pt-6 gap-6">
          {/* Horizontal Connecting Branch Line Spanning Across Children */}
          {subSteps.length > 1 && (
            <div className="absolute top-0 left-32 right-32 h-0.5 bg-indigo-400 z-0"></div>
          )}

          {subSteps.map((sub, idx) => {
            const childTheme = getSubStageTheme(idx, depth + 1);
            return (
              <div key={sub.id} className="flex flex-col items-center relative">
                {/* Vertical line connecting from horizontal branch line down to child card with child theme color */}
                <div className={`absolute -top-6 w-0.5 h-6 ${childTheme.connectorLine} z-0`}></div>

                <GraphicalOrgTreeNode
                  step={sub}
                  projectId={projectId}
                  codePrefix={`${codePrefix}.${idx + 1}`}
                  depth={depth + 1}
                  subIndex={idx}
                  items={items}
                  boms={boms}
                  contractors={contractors}
                  statusFilter={statusFilter}
                  typeFilter={typeFilter}
                  updateProjectStep={updateProjectStep}
                  setAddingSubStepTo={setAddingSubStepTo}
                  onEditStep={onEditStep}
                  onDeleteStep={onDeleteStep}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Linear Step Card Component: Sleek horizontal row in collapsed state, smoothly expands when clicked to reveal details & stage-specific BOM
const LinearStepCard: React.FC<{
  step: ProjectStep;
  projectId: string;
  project?: Project;
  depth?: number;
  subIndex?: number;
  stepCodeStr?: string;
  items: any[];
  boms: any[];
  contractors: any[];
  targetQuantity?: number;
  updateProjectStep: (projectId: string, stepId: string, status: 'Pending' | 'InProgress' | 'Completed') => void;
  setAddingSubStepTo: (val: { projectId: string; parentStepId: string } | null) => void;
  onEditStep?: (step: ProjectStep, projectId: string) => void;
  onDeleteStep?: (stepId: string, projectId: string) => void;
  onHandoverStep?: (step: ProjectStep, project?: Project) => void;
  onRecordOutput?: (step: ProjectStep, project?: Project) => void;
  canAddSubStep?: boolean;
}> = ({
  step,
  projectId,
  project,
  depth = 0,
  subIndex = 0,
  stepCodeStr = '1',
  items,
  boms,
  contractors,
  targetQuantity = 100,
  updateProjectStep,
  setAddingSubStepTo,
  onEditStep,
  onDeleteStep,
  onHandoverStep,
  onRecordOutput,
  canAddSubStep = true,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const outputItem = items.find(i => i.id === step.outputItemId);
  const contractor = contractors.find(c => c.id === step.contractorId);
  const hasSubSteps = Boolean(step.subSteps && step.subSteps.length > 0);
  const stepBomItems = step.bomItems || [];

  const isSubStage = depth > 0;
  const subStageTheme = isSubStage ? getSubStageTheme(subIndex, depth) : null;

  const stepTarget = step.outputQuantity || step.targetQuantity || targetQuantity || 1;
  const stepCompleted = step.completedQuantity || (step.status === 'Completed' ? stepTarget : 0);
  const stepScrap = step.scrapQuantity || 0;
  const stepProgress = step.status === 'Completed' ? 100 : (step.progressPercent !== undefined ? step.progressPercent : Math.min(100, Math.round((stepCompleted / stepTarget) * 100)));

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
      isSubStage
        ? `mr-3 sm:mr-6 border-r-[5px] ${subStageTheme?.borderRight} ${
            step.status === 'Completed'
              ? 'bg-emerald-50/40 border-emerald-200/90 hover:border-emerald-300'
              : step.status === 'InProgress'
              ? `${subStageTheme?.cardBg} border-indigo-300/90 ring-2 ring-indigo-200/60 shadow-xs`
              : `${subStageTheme?.cardBg} ${subStageTheme?.cardBorder} ${subStageTheme?.cardHoverBorder}`
          } shadow-2xs my-2.5`
        : `shadow-2xs my-1.5 ${
            step.status === 'Completed'
              ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
              : step.status === 'InProgress'
              ? 'border-indigo-200 bg-indigo-50/40 hover:border-indigo-300 ring-1 ring-indigo-200/50'
              : 'border-slate-200/90 bg-white hover:border-slate-300'
          }`
    }`}>
      {/* Linear Header Row (Click to toggle expansion) */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none transition-colors group"
      >
        {/* Right side: Step code, Name, Badges */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-2xs border ${
            step.status === 'Completed'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : step.status === 'InProgress'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : isSubStage
              ? `${subStageTheme?.badgeBg} ${subStageTheme?.badgeBorder}`
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            {stepCodeStr}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                {step.name || step.title}
              </h4>

              {/* Sub-Stage Indicator Badge */}
              {isSubStage && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1.5 shrink-0 shadow-2xs ${subStageTheme?.indicatorBg}`}>
                  <span className={`w-2 h-2 rounded-full ${subStageTheme?.accentDot} ring-1 ring-white/90`} />
                  <span>زیرمرحله {subIndex + 1}</span>
                </span>
              )}

              {/* Badges */}
              {step.isOutsourced || step.contractorId ? (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1 shrink-0">
                  <Building2 className="w-3 h-3 text-amber-600" />
                  <span>پیمانکار: {step.contractorName || contractor?.name || 'برون‌سپاری'}</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
                  اپراتور: {step.lastHandoverOperator || step.assignedOperators?.join(', ') || 'داخلی'}
                </span>
              )}

              {step.lastHandoverDate && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1 shrink-0">
                  <Package className="w-3 h-3 text-emerald-600" />
                  <span>تحویل مواد: {step.lastHandoverDate}</span>
                </span>
              )}

              {outputItem && (
                <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 flex items-center gap-1 shrink-0">
                  <Boxes className="w-3 h-3 text-purple-600" />
                  <span>{outputItem.name}</span>
                </span>
              )}

              {stepBomItems.length > 0 && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 font-mono shrink-0">
                  {stepBomItems.length} قلم BOM
                </span>
              )}

              {hasSubSteps && !isSubStage && (
                <span className="text-[10px] font-bold text-slate-700 bg-slate-100/95 px-2 py-0.5 rounded-lg border border-slate-200 flex items-center gap-1.5 shrink-0 shadow-2xs">
                  <GitBranch className="w-3 h-3 text-indigo-600" />
                  <span className="flex items-center gap-1">
                    {step.subSteps?.slice(0, 5).map((_, i) => (
                      <span 
                        key={i} 
                        className={`w-2 h-2 rounded-full ${getSubStageTheme(i, depth + 1).accentDot} ring-1 ring-white`}
                        title={`زیرمرحله ${i + 1}`}
                      />
                    ))}
                    {(step.subSteps?.length || 0) > 5 && <span className="text-[9px] text-slate-400 font-mono">+</span>}
                  </span>
                  <span>{step.subSteps?.length} زیرمرحله</span>
                </span>
              )}
              {hasSubSteps && isSubStage && (
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 font-mono shrink-0">
                  {step.subSteps?.length} زیرمرحله داخلی
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Left side: Mini Progress Bar, Status badge, quick action buttons, and Chevron */}
        <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-slate-100" onClick={e => e.stopPropagation()}>
          {/* Mini Progress Bar */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-white/80 rounded-xl border border-slate-200/80 min-w-[130px] shadow-2xs">
            <div className="flex-1 space-y-0.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-500 font-bold">{stepCompleted}/{stepTarget}</span>
                <span className="font-bold text-indigo-700">{stepProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    stepProgress === 100 ? 'bg-emerald-500' : stepProgress > 0 ? 'bg-indigo-600' : 'bg-slate-300'
                  }`} 
                  style={{ width: `${stepProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Status Indicator Pill */}
          {step.status === 'Completed' ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2.5 py-1 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              تکمیل شد
            </span>
          ) : step.status === 'InProgress' ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-100/90 px-2.5 py-1 rounded-xl border border-indigo-200">
              <Clock className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              در حال انجام
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
              <PlayCircle className="w-3.5 h-3.5 text-slate-400" />
              در انتظار
            </span>
          )}

          {/* Action Button: Handover / Output Direct Launchers */}
          {onHandoverStep && (
            <button
              type="button"
              onClick={() => onHandoverStep(step, project)}
              title="تحویل قطعات و شروع مرحله"
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Package className="w-3 h-3" />
              <span className="hidden sm:inline">تحویل قطعات</span>
            </button>
          )}

          {onRecordOutput && (
            <button
              type="button"
              onClick={() => onRecordOutput(step, project)}
              title="ثبت دریافت محصول نیمه‌ساخته / خروجی مرحله"
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Boxes className="w-3 h-3" />
              <span className="hidden sm:inline">ثبت خروجی</span>
            </button>
          )}

          {/* Quick inline status switch */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="تغییر به در حال انجام"
              onClick={() => updateProjectStep(projectId, step.id, 'InProgress')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                step.status === 'InProgress' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              اجرا
            </button>
            <button
              type="button"
              title="تغییر به تکمیل شده"
              onClick={() => updateProjectStep(projectId, step.id, 'Completed')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                step.status === 'Completed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              تکمیل
            </button>
          </div>

          {/* Expand / Collapse Chevron Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-xl transition-all cursor-pointer"
            title={isOpen ? 'بستن جزئیات' : 'مشاهده جزئیات مرحله'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`} />
          </button>
        </div>
      </div>

      {/* Expanded Accordion Body */}
      {isOpen && (
        <div className={`p-4 sm:p-5 ${
          isSubStage ? `${subStageTheme?.cardBg} border-t ${subStageTheme?.cardBorder}` : 'bg-slate-50/80 border-t border-slate-200/90'
        } space-y-4 animate-fadeIn`}>
          {/* Automated Stage Progress & Handover Banner */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-2xl shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs">وضعیت خودکار مرحله و پیشرفت کار</span>
              </div>
              <div className="flex items-center gap-2">
                {onHandoverStep && (
                  <button
                    type="button"
                    onClick={() => onHandoverStep(step, project)}
                    className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>📦 تحویل قطعات و شروع کار</span>
                  </button>
                )}
                {onRecordOutput && (
                  <button
                    type="button"
                    onClick={() => onRecordOutput(step, project)}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>📥 ثبت دریافت خروجی مرحله</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono">
              <div className="bg-white/10 p-2 rounded-xl">
                <span className="text-[10px] text-slate-300 block">تیراژ هدف مرحله:</span>
                <strong className="text-sm font-bold text-white">{stepTarget.toLocaleString('fa-IR')}</strong>
              </div>
              <div className="bg-white/10 p-2 rounded-xl">
                <span className="text-[10px] text-emerald-300 block">دریافت/تولید شده:</span>
                <strong className="text-sm font-bold text-emerald-300">{stepCompleted.toLocaleString('fa-IR')}</strong>
              </div>
              <div className="bg-white/10 p-2 rounded-xl">
                <span className="text-[10px] text-amber-300 block">ضایعات ثبت‌شده:</span>
                <strong className="text-sm font-bold text-amber-300">{stepScrap.toLocaleString('fa-IR')}</strong>
              </div>
              <div className="bg-white/10 p-2 rounded-xl">
                <span className="text-[10px] text-indigo-200 block">درصد پیشرفت مرحله:</span>
                <strong className="text-sm font-bold text-indigo-300">{stepProgress}٪</strong>
              </div>
            </div>

            {step.lastHandoverDate && (
              <div className="text-[11px] text-indigo-200 bg-white/5 p-2 rounded-xl flex items-center justify-between">
                <span>آخرین تحویل قطعات: <strong>{step.lastHandoverOperator}</strong> ({step.lastHandoverDate})</span>
                {step.lastHandoverDocNumber && <span className="font-mono text-slate-400">سند: {step.lastHandoverDocNumber}</span>}
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Operator or Contractor */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
              <div className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>عامل اجرایی مرحله:</span>
              </div>
              {step.isOutsourced || step.contractorId ? (
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-900">
                    پیمانکار: {step.contractorName || contractor?.name || 'برون‌سپاری'}
                  </div>
                  {contractor?.phone && (
                    <div className="text-[11px] text-slate-500 font-mono">تماس: {contractor.phone}</div>
                  )}
                  {step.outsourcingCost ? (
                    <div className="text-[11px] text-emerald-700 font-mono font-bold">هزینه: {step.outsourcingCost.toLocaleString('fa-IR')} تومان</div>
                  ) : null}
                </div>
              ) : (
                <div className="font-bold text-slate-800">
                  {step.lastHandoverOperator || step.assignedOperators?.join(', ') || 'پرسنل خط تولید داخلی'}
                </div>
              )}
            </div>

            {/* Output Product / Semi-Finished */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
              <div className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5 text-purple-600" />
                <span>خروجی تولیدی این مرحله:</span>
              </div>
              {outputItem ? (
                <div className="space-y-0.5">
                  <div className="font-bold text-purple-950">{outputItem.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    کد: {outputItem.code} | تیراژ: {step.outputQuantity || 1} {outputItem.unit}
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-[11px]">بدون خروجی انبارپذیر مجزا (مرحله فرآیندی)</div>
              )}
            </div>

            {/* Quality & Scrap Allowance */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
              <div className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>پارامترهای کیفیت و ضایعات:</span>
              </div>
              <div className="font-medium text-slate-700">
                ضایعات مجاز این مرحله: <strong className="font-mono text-amber-800 font-bold">{step.scrapAllowancePercent || 0}٪</strong>
              </div>
              {step.description && (
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{step.description}</p>
              )}
            </div>
          </div>

          {/* Step-Specific BOM Items Section */}
          {stepBomItems.length > 0 && (
            <div className="bg-white border border-indigo-100 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>مواد اولیه و قطعات مصرفی فرمول ساخت (BOM) این مرحله:</span>
                </h5>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono font-bold">
                  {stepBomItems.length} قلم قطعه
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="p-2 w-8 text-center">#</th>
                      <th className="p-2">نام قطعه / ماده اولیه</th>
                      <th className="p-2 w-24 text-center">مصرف در ۱ واحد</th>
                      <th className="p-2 w-16 text-center">واحد</th>
                      <th className="p-2 w-20 text-center">ضایعات (٪)</th>
                      <th className="p-2 w-28 text-center bg-indigo-50/60 text-indigo-950">کل مصرف پروژه</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stepBomItems.map((bomIt, bIdx) => {
                      const selIt = items.find(i => i.id === bomIt.itemId);
                      const totalReq = Math.ceil((bomIt.quantityNeeded || 0) * targetQuantity * (1 + (bomIt.scrapAllowancePercent || 0) / 100));
                      return (
                        <tr key={bIdx} className="hover:bg-slate-50/70">
                          <td className="p-2 text-center text-slate-400 font-mono text-[10px]">{bIdx + 1}</td>
                          <td className="p-2">
                            <div className="font-bold text-slate-800">{selIt?.name || bomIt.itemId}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{selIt?.code}</div>
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-slate-800">{bomIt.quantityNeeded}</td>
                          <td className="p-2 text-center text-slate-600 text-[11px]">{selIt?.unit || bomIt.unit}</td>
                          <td className="p-2 text-center font-mono text-amber-700">{bomIt.scrapAllowancePercent || 0}٪</td>
                          <td className="p-2 text-center bg-indigo-50/30 font-mono font-bold text-indigo-700">
                            {totalReq.toLocaleString('fa-IR')} {selIt?.unit || bomIt.unit}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SubSteps Rendering */}
          {hasSubSteps && (
            <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-800 bg-white/90 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-indigo-600" />
                  <span>زیرمراحل این بخش ({step.subSteps?.length} زیرمرحله با تفکیک رنگی اختصاصی):</span>
                </span>

                {/* Sub-stages color preview tags */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {step.subSteps?.map((sub, sIdx) => {
                    const th = getSubStageTheme(sIdx, depth + 1);
                    return (
                      <span
                        key={sub.id || sIdx}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-2xs ${th.indicatorBg}`}
                        title={`زیرمرحله ${sIdx + 1}: ${sub.name || sub.title} (${th.name})`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${th.accentDot}`} />
                        <span>{sIdx + 1}. {sub.name ? (sub.name.length > 14 ? sub.name.substring(0, 14) + '...' : sub.name) : `زیرمرحله ${sIdx + 1}`}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5 pr-1 sm:pr-2 border-r-2 border-dashed border-indigo-200/80 mr-1 sm:mr-2">
                {step.subSteps?.map((sub, sIdx) => (
                  <LinearStepCard
                    key={sub.id}
                    step={sub}
                    projectId={projectId}
                    project={project}
                    depth={depth + 1}
                    subIndex={sIdx}
                    stepCodeStr={`${stepCodeStr}.${sIdx + 1}`}
                    items={items}
                    boms={boms}
                    contractors={contractors}
                    targetQuantity={targetQuantity}
                    updateProjectStep={updateProjectStep}
                    setAddingSubStepTo={setAddingSubStepTo}
                    onEditStep={onEditStep}
                    onDeleteStep={onDeleteStep}
                    onHandoverStep={onHandoverStep}
                    onRecordOutput={onRecordOutput}
                    canAddSubStep={canAddSubStep}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bottom Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => updateProjectStep(projectId, step.id, 'InProgress')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  step.status === 'InProgress' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>تعیین وضعیت: در حال اجرا</span>
              </button>

              <button
                type="button"
                onClick={() => updateProjectStep(projectId, step.id, 'Completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  step.status === 'Completed' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تکمیل این مرحله</span>
              </button>

              <button
                type="button"
                onClick={() => updateProjectStep(projectId, step.id, 'Pending')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                بازگشت به انتظار
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {canAddSubStep && (
                <button
                  type="button"
                  onClick={() => setAddingSubStepTo({ projectId, parentStepId: step.id })}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 border border-indigo-200 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن زیرمرحله</span>
                </button>
              )}

              {onEditStep && (
                <button
                  type="button"
                  onClick={() => onEditStep(step, projectId)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200 transition-all cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>ویرایش مرحله</span>
                </button>
              )}

              {onDeleteStep && (
                <button
                  type="button"
                  onClick={() => onDeleteStep(step.id, projectId)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                  title="حذف مرحله"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ProjectsView: React.FC = () => {
  const { 
    projects, items, boms, warehouses, inventory, contractors, 
    addProject, updateProject, deleteProject, updateProjectStep, 
    updateProjectStepDetails, addProjectSubStep, deleteProjectStep, 
    createTransfer, language, hasActionPermission, liteMode,
    addBOM, updateBOM
  } = useApp();

  const isFa = language === 'fa';
  const canAdd = hasActionPermission('add');
  const canEdit = hasActionPermission('edit');
  const canDelete = hasActionPermission('delete');
  const canExport = hasActionPermission('export');

  // Search & Filter & View mode state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Completed' | 'Paused' | 'Archived'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(projects[0]?.id || null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addingSubStepTo, setAddingSubStepTo] = useState<{ projectId: string; parentStepId: string } | null>(null);

  // BOM definitions in Add / Edit modals
  const [bomRows, setBomRows] = useState<BOMRowItem[]>([]);
  const [editBomRows, setEditBomRows] = useState<BOMRowItem[]>([]);
  const [stepBoms, setStepBoms] = useState<StepBOMConfig[]>([]);
  const [editStepBoms, setEditStepBoms] = useState<StepBOMConfig[]>([]);
  const [showBOMSectionInAdd, setShowBOMSectionInAdd] = useState(true);
  const [showBOMSectionInEdit, setShowBOMSectionInEdit] = useState(true);

  // Edit Project Modal state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjName, setEditProjName] = useState('');
  const [editProjClient, setEditProjClient] = useState('');
  const [editProjManager, setEditProjManager] = useState('');
  const [editProjStatus, setEditProjStatus] = useState<ProjectStatus>('Active');
  const [editProjTargetQty, setEditProjTargetQty] = useState(100);
  const [editProjProducedQty, setEditProjProducedQty] = useState(0);
  const [editProjProgress, setEditProjProgress] = useState(0);
  const [editProjStartDate, setEditProjStartDate] = useState('');
  const [editProjEndDate, setEditProjEndDate] = useState('');
  const [editProjDescription, setEditProjDescription] = useState('');
  const [editProjTargetItemId, setEditProjTargetItemId] = useState('');
  const [editProjScrapPercent, setEditProjScrapPercent] = useState<number>(0);

  // Edit Step Modal state
  const [editingStepData, setEditingStepData] = useState<{ step: ProjectStep; projectId: string } | null>(null);
  const [editStepTitle, setEditStepTitle] = useState('');
  const [editStepIsOutsourced, setEditStepIsOutsourced] = useState(false);
  const [editStepContractorId, setEditStepContractorId] = useState('');
  const [editStepCost, setEditStepCost] = useState(0);
  const [editStepOperators, setEditStepOperators] = useState('');
  const [editStepOutputItemId, setEditStepOutputItemId] = useState('');
  const [editStepOutputQty, setEditStepOutputQty] = useState(1);
  const [editStepScrapPercent, setEditStepScrapPercent] = useState<number>(0);
  const [editStepStatus, setEditStepStatus] = useState<'Pending' | 'InProgress' | 'Completed'>('Pending');

  // BOM Explosion Modal state
  const [bomExplosionProject, setBomExplosionProject] = useState<Project | null>(null);

  // Smart BOM Scaling Modal state
  const [smartScalingProject, setSmartScalingProject] = useState<Project | null>(null);

  // Tree Diagram & Management Reports Modal state
  const [treeReportProject, setTreeReportProject] = useState<Project | null>(null);
  const [treeActiveTab, setTreeActiveTab] = useState<'tree' | 'reports' | 'wbs'>('tree');
  const [treeStatusFilter, setTreeStatusFilter] = useState<'all' | 'Completed' | 'InProgress' | 'Pending'>('all');
  const [treeTypeFilter, setTreeTypeFilter] = useState<'all' | 'outsourced' | 'internal'>('all');
  const [treeZoom, setTreeZoom] = useState<number>(1);

  // Automated Stage Tracking Modals State
  const [handoverModalData, setHandoverModalData] = useState<{ project: Project; step: ProjectStep } | null>(null);
  const [outputReceiptModalData, setOutputReceiptModalData] = useState<{ project: Project; step: ProjectStep } | null>(null);
  const [progressReportProject, setProgressReportProject] = useState<Project | null>(null);

  const handleOpenHandover = (step: ProjectStep, project?: Project) => {
    const proj = project || projects.find(p => p.id === expandedProjectId) || projects[0];
    if (proj) {
      setHandoverModalData({ project: proj, step });
    }
  };

  const handleOpenOutputReceipt = (step: ProjectStep, project?: Project) => {
    const proj = project || projects.find(p => p.id === expandedProjectId) || projects[0];
    if (proj) {
      setOutputReceiptModalData({ project: proj, step });
    }
  };

  const flattenProjectSteps = (steps: ProjectStep[] = [], prefix = '', depth = 0): Array<{ step: ProjectStep; code: string; depth: number; subIndex: number }> => {
    let list: Array<{ step: ProjectStep; code: string; depth: number; subIndex: number }> = [];
    if (!steps || !Array.isArray(steps)) return list;
    steps.forEach((s, idx) => {
      if (!s) return;
      const code = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
      list.push({ step: s, code, depth, subIndex: idx });
      if (s.subSteps && Array.isArray(s.subSteps) && s.subSteps.length > 0) {
        list = list.concat(flattenProjectSteps(s.subSteps, code, depth + 1));
      }
    });
    return list;
  };

  const [subStepTitle, setSubStepTitle] = useState('');
  const [subStepOutputItemId, setSubStepOutputItemId] = useState('');
  const [subStepOutputQty, setSubStepOutputQty] = useState<number>(1);
  const [subStepScrapPercent, setSubStepScrapPercent] = useState<number>(0);
  const [subStepContractorId, setSubStepContractorId] = useState('');
  const [subStepCost, setSubStepCost] = useState(0);

  // Form State
  const [code, setCode] = useState(`PRJ-2026-P${Math.floor(10 + Math.random() * 90)}`);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('fa-IR'));
  const [endDate, setEndDate] = useState('1405/09/30');
  const [projectManager, setProjectManager] = useState('مهندس رضایی');
  const [targetFinishedItemId, setTargetFinishedItemId] = useState(items.find(i => i.itemType === 'Finished')?.id || items[0]?.id || '');
  const [targetQuantity, setTargetQuantity] = useState(100);
  const [scrapAllowancePercent, setScrapAllowancePercent] = useState<number>(0);
  const [description, setDescription] = useState('');

  // Helper to load BOM rows & Stage-by-Stage BOM configs when selecting a target finished item in Add Modal
  const initializeBOMRowsForAdd = (itemId: string, stepsToUse = customSteps) => {
    const matched = boms.find(b => b.finishedItemId === itemId && b.isActive);
    let rows: BOMRowItem[] = [];

    if (matched && Array.isArray(matched.items) && matched.items.length > 0) {
      rows = matched.items.map(it => ({
        itemId: it.itemId,
        quantityNeeded: it.quantityNeeded || 1,
        unit: it.unit || items.find(i => i.id === it.itemId)?.unit || 'عدد',
        scrapAllowancePercent: it.scrapAllowancePercent ?? 2,
      }));
    } else {
      const defaultMaterials = items.filter(i => i.id !== itemId && (i.itemType === 'RawMaterial' || i.itemType === 'Component')).slice(0, 4);
      if (defaultMaterials.length > 0) {
        rows = defaultMaterials.map(m => ({
          itemId: m.id,
          quantityNeeded: 1,
          unit: m.unit || 'عدد',
          scrapAllowancePercent: 2,
        }));
      }
    }
    setBomRows(rows);

    // Build stage-by-stage BOMs
    const builtStepBoms: StepBOMConfig[] = stepsToUse.map((st, idx) => {
      let stageItems: BOMRowItem[] = [];
      if (st.outputItemId) {
        const stepBom = boms.find(b => b.finishedItemId === st.outputItemId && b.isActive);
        if (stepBom && Array.isArray(stepBom.items) && stepBom.items.length > 0) {
          stageItems = stepBom.items.map(it => ({
            itemId: it.itemId,
            quantityNeeded: it.quantityNeeded || 1,
            unit: it.unit || items.find(i => i.id === it.itemId)?.unit || 'عدد',
            scrapAllowancePercent: it.scrapAllowancePercent ?? (st.scrapAllowancePercent || 0),
          }));
        }
      }

      if (stageItems.length === 0 && rows.length > 0) {
        if (idx === 1) {
          stageItems = rows.slice(0, Math.ceil(rows.length / 2));
        } else if (idx === stepsToUse.length - 1 && rows.length > 1) {
          stageItems = rows.slice(Math.ceil(rows.length / 2));
        }
      }

      return {
        stepId: st.id,
        stepNumber: idx + 1,
        stepName: st.name || `مرحله ${idx + 1}`,
        outputItemId: st.outputItemId,
        items: stageItems,
      };
    });
    setStepBoms(builtStepBoms);
  };

  // Helper to load BOM rows & Stage-by-Stage BOM configs in Edit Modal
  const initializeBOMRowsForEdit = (projOrTargetItemId: Project | string) => {
    const targetItemId = typeof projOrTargetItemId === 'string' ? projOrTargetItemId : projOrTargetItemId.targetFinishedItemId;
    const proj = typeof projOrTargetItemId === 'string' ? editingProject : projOrTargetItemId;
    const matched = boms.find(b => b.finishedItemId === targetItemId && b.isActive);
    let rows: BOMRowItem[] = [];

    if (matched && Array.isArray(matched.items) && matched.items.length > 0) {
      rows = matched.items.map(it => ({
        itemId: it.itemId,
        quantityNeeded: it.quantityNeeded || 1,
        unit: it.unit || items.find(i => i.id === it.itemId)?.unit || 'عدد',
        scrapAllowancePercent: it.scrapAllowancePercent ?? 2,
      }));
    }
    setEditBomRows(rows);

    const stepsToMap = proj?.steps || [];
    const builtStepBoms: StepBOMConfig[] = stepsToMap.map((st, idx) => {
      let stageItems: BOMRowItem[] = [];
      if (st.bomItems && Array.isArray(st.bomItems) && st.bomItems.length > 0) {
        stageItems = st.bomItems.map(it => ({
          itemId: it.itemId,
          quantityNeeded: it.quantityNeeded || 1,
          unit: it.unit || items.find(i => i.id === it.itemId)?.unit || 'عدد',
          scrapAllowancePercent: it.scrapAllowancePercent ?? (st.scrapAllowancePercent || 0),
        }));
      } else if (st.outputItemId) {
        const stepBom = boms.find(b => b.finishedItemId === st.outputItemId && b.isActive);
        if (stepBom && Array.isArray(stepBom.items) && stepBom.items.length > 0) {
          stageItems = stepBom.items.map(it => ({
            itemId: it.itemId,
            quantityNeeded: it.quantityNeeded || 1,
            unit: it.unit || items.find(i => i.id === it.itemId)?.unit || 'عدد',
            scrapAllowancePercent: it.scrapAllowancePercent ?? (st.scrapAllowancePercent || 0),
          }));
        }
      }

      return {
        stepId: st.id,
        stepNumber: st.stepNumber || idx + 1,
        stepName: st.name || st.title || `مرحله ${idx + 1}`,
        outputItemId: st.outputItemId,
        items: stageItems,
      };
    });
    setEditStepBoms(builtStepBoms);
  };

  // Custom Steps Form State (With Output Items & Default Step 1: Material Transfer)
  interface CustomStepFormItem {
    id: string;
    name: string;
    operator: string;
    isOutsourced: boolean;
    contractorId?: string;
    outsourcingCost?: number;
    outputItemId: string;
    scrapAllowancePercent: number;
  }

  const defaultInitialSteps: CustomStepFormItem[] = [
    { 
      id: 'step-init-1', 
      name: 'تحویل و تخصیص مواد اولیه از انبار مرکزی به قفسه پروژه در خط تولید', 
      operator: 'انباردار انبار مرکزی', 
      isOutsourced: false,
      outputItemId: '',
      scrapAllowancePercent: 0
    },
    { 
      id: 'step-init-2', 
      name: 'مونتاژ برد الکترونیکی (مونتاژ SMD و لحیم‌کاری)', 
      operator: 'تیم مونتاژ الکترونیک', 
      isOutsourced: false,
      outputItemId: items.find(i => i.itemType === 'SemiFinished')?.id || '',
      scrapAllowancePercent: 2
    },
    { 
      id: 'step-init-3', 
      name: 'تست عملکردی، کالیبراسیون و کنترل کیفیت QC', 
      operator: 'تکنیسین تست و QC', 
      isOutsourced: false,
      outputItemId: '',
      scrapAllowancePercent: 0
    },
    { 
      id: 'step-init-4', 
      name: 'مونتاژ مکانیکی در قاب، بسته‌بندی و تحویل به انبار محصول نهایی', 
      operator: 'اپراتور مونتاژ نهایی', 
      isOutsourced: false,
      outputItemId: items.find(i => i.itemType === 'Finished')?.id || '',
      scrapAllowancePercent: 1
    },
  ];
  const [customSteps, setCustomSteps] = useState<CustomStepFormItem[]>(defaultInitialSteps);

  const handleOpenAdd = () => {
    setCode(`PRJ-2026-P${Math.floor(10 + Math.random() * 90)}`);
    setName('');
    setClient('');
    setScrapAllowancePercent(0);
    const semiItem = items.find(i => i.itemType === 'SemiFinished')?.id || '';
    const finItem = targetFinishedItemId || items.find(i => i.itemType === 'Finished')?.id || items[0]?.id || '';
    setTargetFinishedItemId(finItem);

    const initialSteps = [
      { 
        id: `step-${Date.now()}-1`, 
        name: 'تحویل و تخصیص قطعات از انبار مرکزی به قفسه پروژه در خط تولید', 
        operator: 'انباردار انبار مرکزی', 
        isOutsourced: false,
        outputItemId: '',
        scrapAllowancePercent: 0
      },
      { 
        id: `step-${Date.now()}-2`, 
        name: 'مونتاژ برد الکترونیکی (مونتاژ SMD و لحیم‌کاری)', 
        operator: 'تیم مونتاژ الکترونیک', 
        isOutsourced: false,
        outputItemId: semiItem,
        scrapAllowancePercent: 2
      },
      { 
        id: `step-${Date.now()}-3`, 
        name: 'تست عملکردی، برنامه‌ریزی و کنترل کیفیت QC', 
        operator: 'تکنیسین کنترل کیفیت', 
        isOutsourced: false,
        outputItemId: '',
        scrapAllowancePercent: 0
      },
      { 
        id: `step-${Date.now()}-4`, 
        name: 'مونتاژ مکانیکی، بسته‌بندی و تحویل نهایی به انبار محصول', 
        operator: 'اپراتور مونتاژ نهایی', 
        isOutsourced: false,
        outputItemId: finItem,
        scrapAllowancePercent: 1
      },
    ];

    setCustomSteps(initialSteps);
    initializeBOMRowsForAdd(finItem, initialSteps);
    setIsModalOpen(true);
  };

  const handleOpenEditProject = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(proj);
    setEditProjName(proj.name || '');
    setEditProjClient(proj.client || '');
    setEditProjManager(proj.projectManager || '');
    setEditProjStatus(proj.status || 'Active');
    setEditProjTargetQty(proj.targetQuantity || 100);
    setEditProjProducedQty(proj.producedQuantity || 0);
    setEditProjProgress(proj.progressPercent || 0);
    setEditProjStartDate(proj.startDate || '');
    setEditProjEndDate(proj.endDate || '');
    setEditProjDescription(proj.description || '');
    setEditProjTargetItemId(proj.targetFinishedItemId || '');
    setEditProjScrapPercent(proj.scrapAllowancePercent || 0);

    initializeBOMRowsForEdit(proj);
  };

  const handleSaveEditProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    // Map editStepBoms into the project steps
    const updatedSteps = (editingProject.steps || []).map((st, idx) => {
      const stepBomConfig = editStepBoms.find(sb => sb.stepId === st.id || sb.stepNumber === (st.stepNumber || idx + 1));
      if (stepBomConfig && stepBomConfig.items && stepBomConfig.items.length > 0) {
        const stepItems = stepBomConfig.items.map(it => ({
          itemId: it.itemId,
          quantityNeeded: Number(it.quantityNeeded) || 1,
          unit: it.unit || items.find(i => i.id === it.itemId)?.unit || 'عدد',
          scrapAllowancePercent: Number(it.scrapAllowancePercent) || 0,
        })).filter(it => it.itemId);
        return { ...st, bomItems: stepItems };
      }
      return st;
    });

    updateProject(editingProject.id, {
      name: editProjName,
      client: editProjClient,
      projectManager: editProjManager,
      status: editProjStatus,
      targetQuantity: Number(editProjTargetQty),
      producedQuantity: Number(editProjProducedQty),
      progressPercent: Number(editProjProgress),
      startDate: editProjStartDate,
      endDate: editProjEndDate,
      description: editProjDescription,
      targetFinishedItemId: editProjTargetItemId,
      scrapAllowancePercent: Number(editProjScrapPercent) || 0,
      steps: updatedSteps,
    });

    // Aggregate items across all steps to sync with product BOM
    const allStepItems: BOMRowItem[] = [];
    editStepBoms.forEach(sb => {
      (sb.items || []).forEach(it => {
        if (!it.itemId) return;
        const exist = allStepItems.find(x => x.itemId === it.itemId);
        if (exist) {
          exist.quantityNeeded = (exist.quantityNeeded || 0) + (it.quantityNeeded || 0);
        } else {
          allStepItems.push({ ...it });
        }
      });
    });

    const itemsToSave = allStepItems.length > 0 ? allStepItems : editBomRows;

    // Persist BOM changes if any rows are configured
    if (itemsToSave.length > 0 && editProjTargetItemId) {
      const matched = boms.find(b => b.finishedItemId === editProjTargetItemId && b.isActive);
      const cleanedItems = itemsToSave.map(r => ({
        itemId: r.itemId,
        quantityNeeded: Number(r.quantityNeeded) || 0,
        unit: r.unit || items.find(i => i.id === r.itemId)?.unit || 'عدد',
        scrapAllowancePercent: Number(r.scrapAllowancePercent) || 0,
      })).filter(r => r.itemId);

      if (cleanedItems.length > 0) {
        if (matched) {
          updateBOM(matched.id, { items: cleanedItems });
        } else {
          const finishedItemObj = items.find(i => i.id === editProjTargetItemId);
          addBOM({
            finishedItemId: editProjTargetItemId,
            name: `فرمول ساخت ${finishedItemObj?.name || editProjName}`,
            version: 'v1.0',
            items: cleanedItems,
            isActive: true,
            description: `فرمول تعریف‌شده هنگام ویرایش پروژه ${editProjName}`
          });
        }
      }
    }

    setEditingProject(null);
  };

  const handleDeleteProject = (projId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('آیا از حذف این پروژه و کلیه مراحل آن اطمینان دارید؟')) {
      deleteProject(projId);
    }
  };

  const handleOpenEditStep = (step: ProjectStep, projectId: string) => {
    setEditingStepData({ step, projectId });
    setEditStepTitle(step.name || step.title || '');
    setEditStepIsOutsourced(!!(step.isOutsourced || step.contractorId));
    setEditStepContractorId(step.contractorId || '');
    setEditStepCost(step.outsourcingCost || step.contractorCost || 0);
    setEditStepOperators(step.assignedOperators?.join(', ') || '');
    setEditStepOutputItemId(step.outputItemId || '');
    setEditStepOutputQty(step.outputQuantity || 1);
    setEditStepScrapPercent(step.scrapAllowancePercent || 0);
    setEditStepStatus(step.status || 'Pending');
  };

  const handleSaveEditStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStepData) return;

    const selectedCont = contractors.find(c => c.id === editStepContractorId);

    updateProjectStepDetails(editingStepData.projectId, editingStepData.step.id, {
      name: editStepTitle.trim(),
      title: editStepTitle.trim(),
      status: editStepStatus,
      isOutsourced: editStepIsOutsourced,
      contractorId: editStepIsOutsourced ? editStepContractorId || undefined : undefined,
      contractorName: editStepIsOutsourced ? selectedCont?.name : undefined,
      outsourcingCost: editStepIsOutsourced ? editStepCost : undefined,
      assignedOperators: editStepIsOutsourced 
        ? [selectedCont?.name || 'پیمانکار برون‌سپاری'] 
        : editStepOperators ? editStepOperators.split(',').map(s => s.trim()) : ['خط مونتاژ داخلی'],
      outputItemId: editStepOutputItemId || undefined,
      outputQuantity: editStepOutputQty || undefined,
      scrapAllowancePercent: Number(editStepScrapPercent) || 0,
    });

    setEditingStepData(null);
  };

  const handleDeleteStep = (stepId: string, projectId: string) => {
    if (confirm('آیا از حذف این مرحله از ساختار پروژه اطمینان دارید؟')) {
      deleteProjectStep(projectId, stepId);
    }
  };

  const handleAddStepRow = () => {
    const newStepId = `step-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setCustomSteps(prev => {
      const nextSteps = [
        ...prev,
        {
          id: newStepId,
          name: '',
          operator: 'اپراتور خط',
          isOutsourced: false,
          outputItemId: '',
          scrapAllowancePercent: 0
        }
      ];
      setStepBoms(sPrev => [
        ...sPrev,
        {
          stepId: newStepId,
          stepNumber: nextSteps.length,
          stepName: `مرحله ${nextSteps.length}`,
          outputItemId: '',
          items: []
        }
      ]);
      return nextSteps;
    });
  };

  const handleRemoveStepRow = (id: string) => {
    if (customSteps.length <= 1) {
      alert('پروژه باید حداقل دارای ۱ مرحله باشد.');
      return;
    }
    setCustomSteps(prev => {
      const nextSteps = prev.filter(s => s.id !== id);
      setStepBoms(sPrev => sPrev.filter(s => s.stepId !== id).map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
      return nextSteps;
    });
  };

  const handleUpdateStepRow = (id: string, field: string, value: any) => {
    setCustomSteps(prev => {
      const nextSteps = prev.map(s => {
        if (s.id !== id) return s;
        return { ...s, [field]: value };
      });
      if (field === 'name' || field === 'outputItemId') {
        setStepBoms(sPrev => sPrev.map(sb => {
          if (sb.stepId !== id) return sb;
          return {
            ...sb,
            stepName: field === 'name' ? (value || sb.stepName) : sb.stepName,
            outputItemId: field === 'outputItemId' ? value : sb.outputItemId,
          };
        }));
      }
      return nextSteps;
    });
  };

  const handleMoveStepRow = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === customSteps.length - 1)) return;
    const newSteps = [...customSteps];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;
    setCustomSteps(newSteps);

    setStepBoms(sPrev => {
      const newSb = [...sPrev];
      if (newSb[index] && newSb[targetIdx]) {
        const tSb = newSb[index];
        newSb[index] = newSb[targetIdx];
        newSb[targetIdx] = tSb;
      }
      return newSb.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    });
  };

  const handleAddSubStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingSubStepTo || !subStepTitle.trim()) return;

    const isOutsourced = !!subStepContractorId;
    const selectedCont = contractors.find(c => c.id === subStepContractorId);

    addProjectSubStep(addingSubStepTo.projectId, addingSubStepTo.parentStepId, {
      title: subStepTitle.trim(),
      name: subStepTitle.trim(),
      stepNumber: 1,
      status: 'Pending',
      assignedOperators: isOutsourced ? [selectedCont?.name || 'پیمانکار برون‌سپاری'] : ['تیم مونتاژ داخلی'],
      isOutsourced,
      contractorId: subStepContractorId || undefined,
      contractorName: selectedCont?.name,
      outsourcingCost: subStepCost || undefined,
      outputItemId: subStepOutputItemId || undefined,
      outputQuantity: subStepOutputQty || undefined,
      scrapAllowancePercent: Number(subStepScrapPercent) || 0,
    });

    setAddingSubStepTo(null);
    setSubStepTitle('');
    setSubStepOutputItemId('');
    setSubStepOutputQty(1);
    setSubStepScrapPercent(0);
    setSubStepContractorId('');
    setSubStepCost(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !client) return;

    if (customSteps.length === 0) {
      alert('لطفا حداقل یک مرحله برای پروژه تعریف کنید.');
      return;
    }

    const stepsToSave = customSteps.map((st, idx) => {
      const selectedCont = contractors.find(c => c.id === st.contractorId);
      const isOut = st.isOutsourced;
      const stepBomConfig = stepBoms.find(sb => sb.stepId === st.id || sb.stepNumber === idx + 1);
      const stepItems = stepBomConfig?.items?.map(it => ({
        itemId: it.itemId,
        quantityNeeded: Number(it.quantityNeeded) || 1,
        unit: it.unit || items.find(i => i.id === it.itemId)?.unit || 'عدد',
        scrapAllowancePercent: Number(it.scrapAllowancePercent) || 0,
      })).filter(it => it.itemId) || [];

      return {
        id: `s-${Date.now()}-${idx + 1}`,
        stepNumber: idx + 1,
        stepCode: `${idx + 1}`,
        name: st.name.trim() || `مرحله ${idx + 1}`,
        title: st.name.trim() || `مرحله ${idx + 1}`,
        status: 'Pending' as const,
        assignedOperators: isOut ? [selectedCont?.name || 'پیمانکار برون‌سپاری'] : [st.operator || 'اپراتور خط'],
        isOutsourced: isOut,
        contractorId: st.contractorId,
        contractorName: selectedCont?.name,
        outsourcingCost: st.outsourcingCost,
        outputItemId: st.outputItemId || undefined,
        scrapAllowancePercent: Number(st.scrapAllowancePercent) || 0,
        bomItems: stepItems,
      };
    });

    addProject({
      code,
      name,
      client,
      startDate,
      endDate,
      status: 'Active',
      progressPercent: 0,
      projectManager,
      targetFinishedItemId,
      targetQuantity,
      scrapAllowancePercent: Number(scrapAllowancePercent) || 0,
      producedQuantity: 0,
      description,
      steps: stepsToSave,
    });

    // Aggregate items across all steps to sync with product BOM
    const allStepItems: BOMRowItem[] = [];
    stepBoms.forEach(sb => {
      (sb.items || []).forEach(it => {
        if (!it.itemId) return;
        const exist = allStepItems.find(x => x.itemId === it.itemId);
        if (exist) {
          exist.quantityNeeded = (exist.quantityNeeded || 0) + (it.quantityNeeded || 0);
        } else {
          allStepItems.push({ ...it });
        }
      });
    });

    const itemsToSave = allStepItems.length > 0 ? allStepItems : bomRows;

    // Persist BOM definition directly if user added/customized BOM rows
    if (itemsToSave.length > 0 && targetFinishedItemId) {
      const matched = boms.find(b => b.finishedItemId === targetFinishedItemId && b.isActive);
      const cleanedItems = itemsToSave.map(r => ({
        itemId: r.itemId,
        quantityNeeded: Number(r.quantityNeeded) || 0,
        unit: r.unit || items.find(i => i.id === r.itemId)?.unit || 'عدد',
        scrapAllowancePercent: Number(r.scrapAllowancePercent) || 0,
      })).filter(r => r.itemId);

      if (cleanedItems.length > 0) {
        if (matched) {
          updateBOM(matched.id, { items: cleanedItems });
        } else {
          const finishedItemObj = items.find(i => i.id === targetFinishedItemId);
          addBOM({
            finishedItemId: targetFinishedItemId,
            name: `فرمول ساخت ${finishedItemObj?.name || name}`,
            version: 'v1.0',
            items: cleanedItems,
            isActive: true,
            description: `فرمول تعریف‌شده همزمان با ثبت پروژه ${name}`
          });
        }
      }
    }

    alert(`پروژه جدید با ${stepsToSave.length} مرحله سفارشی و فرمول ساخت (BOM) مرحله‌به‌مرحله با موفقیت تعریف گردید.`);
    setIsModalOpen(false);
  };

  // Helper for Multi-Level BOM Explosion with Scrap Allowance
  interface RequiredMaterialItem {
    itemId: string;
    itemCode: string;
    itemName: string;
    unit: string;
    quantityPerUnit: number;
    scrapPercent: number;
    totalNeededWithScrap: number;
    centralStock: number;
    projectRackStock: number;
    shortage: number;
    isSemiFinished: boolean;
  }

  const getCalculatedProjectBOM = (proj: Project): RequiredMaterialItem[] => {
    const result: Map<string, RequiredMaterialItem> = new Map();
    if (!proj) return [];

    const explode = (itemId: string, currentTargetQty: number, visited = new Set<string>()) => {
      if (!itemId || visited.has(itemId)) return;
      visited.add(itemId);

      const activeBOM = (boms || []).find(b => b.finishedItemId === itemId && b.isActive);
      if (!activeBOM || !Array.isArray(activeBOM.items)) return;

      for (const bomItem of activeBOM.items) {
        if (!bomItem) continue;
        const targetItem = (items || []).find(i => i.id === bomItem.itemId);
        if (!targetItem) continue;

        const scrapRate = bomItem.scrapAllowancePercent || 0;
        const exactNeeded = Math.ceil((bomItem.quantityNeeded || 0) * currentTargetQty * (1 + scrapRate / 100));

        const centralStock = (inventory || [])
          .filter(inv => inv.itemId === targetItem.id && (inv.warehouseId === 'wh-central' || inv.warehouseId === 'wh-raw'))
          .reduce((sum, curr) => sum + (curr.quantity || 0), 0);

        const projectRackStock = (inventory || [])
          .filter(inv => inv.itemId === targetItem.id && (inv.warehouseId === 'wh-prod-p101' || inv.warehouseId === `wh-prod-${(proj.code || '').toLowerCase()}`))
          .reduce((sum, curr) => sum + (curr.quantity || 0), 0);

        const existing = result.get(targetItem.id);
        if (existing) {
          existing.totalNeededWithScrap += exactNeeded;
          existing.shortage = Math.max(0, existing.totalNeededWithScrap - existing.centralStock);
        } else {
          result.set(targetItem.id, {
            itemId: targetItem.id,
            itemCode: targetItem.code || '',
            itemName: targetItem.name || '',
            unit: targetItem.unit || '',
            quantityPerUnit: bomItem.quantityNeeded || 0,
            scrapPercent: scrapRate,
            totalNeededWithScrap: exactNeeded,
            centralStock,
            projectRackStock,
            shortage: Math.max(0, exactNeeded - centralStock),
            isSemiFinished: targetItem.itemType === 'SemiFinished'
          });
        }

        // Recursive explosion for child BOMs
        const childBOM = (boms || []).find(b => b.finishedItemId === targetItem.id && b.isActive);
        if (childBOM) {
          explode(targetItem.id, exactNeeded, new Set(visited));
        }
      }
    };

    explode(proj.targetFinishedItemId, proj.targetQuantity || 1);
    return Array.from(result.values());
  };

  const handleAutoIssueMaterialTransfer = (proj: Project, materials: RequiredMaterialItem[]) => {
    if (materials.length === 0) {
      alert('هیچ فرمول ساخت (BOM) فعال برای این محصول ثبت نشده است.');
      return;
    }

    const itemsToTransfer = materials
      .filter(m => m.totalNeededWithScrap > 0)
      .map(m => ({
        itemId: m.itemId,
        quantity: m.totalNeededWithScrap
      }));

    if (itemsToTransfer.length === 0) {
      alert('هیچ قطعه‌ای برای تحویل موجود نیست.');
      return;
    }

    const targetWHId = warehouses.find(w => w.linkedProjectId === proj.id || w.id === 'wh-prod-p101')?.id || 'wh-prod-p101';

    createTransfer({
      docNumber: `TRF-PRJ-${proj.code.replace('PRJ-', '')}`,
      date: new Date().toISOString().substring(0, 10),
      sourceWarehouseId: 'wh-raw',
      targetWarehouseId: targetWHId,
      requestedBy: 'سیستم برنامه‌ریزی تولید',
      registeredBy: 'سیستم برنامه‌ریزی تولید',
      handlerName: 'انباردار انبار مرکزی',
      status: 'Completed',
      items: itemsToTransfer,
      notes: `انتقال و تحویل قطعات پروژه ${proj.code} از انبار مرکزی به قفسه اختصاصی پروژه در خط تولید (با احتساب ضایعات)`
    });

    // Mark Step 1 (Material Delivery) as Completed
    const firstStep = proj.steps[0];
    if (firstStep) {
      updateProjectStep(proj.id, firstStep.id, 'Completed');
    }

    alert(`حواله خروج انبار مرکزی و تخصیص به قفسه پروژه با موفقیت صادر گردید. مرحله ۱ پروژه (تامین مواد اولیه) نیز به وضعیت "تکمیل شد" ارتقا یافت.`);
    setBomExplosionProject(null);
  };

  const statusBadges: Record<ProjectStatus, { label: string; style: string }> = {
    Planning: { label: 'برنامه‌ریزی اولیه', style: 'bg-slate-100 text-slate-600 border-slate-200' },
    Active: { label: 'در حال تولید (فعال)', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    Paused: { label: 'متوقف‌شده', style: 'bg-amber-50 text-amber-700 border-amber-200' },
    Testing: { label: 'در مرحله تست QC', style: 'bg-purple-50 text-purple-700 border-purple-200' },
    Completed: { label: 'تکمیل و مختومه', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    Cancelled: { label: 'لغو شده', style: 'bg-rose-50 text-rose-700 border-rose-200' },
  };

  const filteredProjects = projects.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.client && p.client.toLowerCase().includes(q)) ||
      (p.projectManager && p.projectManager.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Bar Matching Requested Design */}
      <div className="bg-white border border-slate-100/90 shadow-sm p-4 sm:p-5 rounded-3xl shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Right Section: Breadcrumb & Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                پرونده‌های پروژه‌های ساخت
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200/60">
                <Home className="w-3 h-3 text-slate-400" />
                <span>خانه / پروژه‌ها</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              مدیریت سفارشات تولید، فرمول‌های ساخت (BOM) و گردش مراحل ۵گانه خط تولید
            </p>
          </div>
        </div>

        {/* Center Section: Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در پروژه‌ها (نام، کد، کارفرما، مدیر)..."
              className="w-full pl-9 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Left Section: Actions, Filters, View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="Active">در حال تولید (فعال)</option>
            <option value="Completed">تکمیل و مختومه</option>
            <option value="Paused">متوقف‌شده</option>
            <option value="Planning">برنامه‌ریزی</option>
          </select>

          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-0.5 border border-slate-200/60">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-xl transition-all ${viewMode === 'cards' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              title="نمای کارتی"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              title="نمای جدولی / خطی"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Org Tree Report Button */}
          <button
            type="button"
            onClick={() => setTreeReportProject(projects[0] || null)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 border border-slate-200/60 transition-all shadow-2xs active:scale-95 shrink-0 cursor-pointer"
            title="نمودار درختی و گزارش‌های مدیریتی WBS"
          >
            <FolderTree className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">گزارشات</span>
          </button>

          {/* Add Project Primary Button */}
          {canAdd && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Projects Display Area */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center space-y-3 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">هیچ پروژه‌ای با مشخصات جستجویافته پیدا نشد</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            می‌توانید عبارت جستجو را پاک کنید یا با کلیک بر روی دکمه «+ جدید» پروژه ساخت جدیدی تعریف فرمایید.
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
            >
              پاک کردن فیلتر جستجو
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards Grid View (Matching image.png Layout) */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredProjects.map(proj => {
              const isExpanded = expandedProjectId === proj.id;
              const finishedItem = items.find(i => i.id === proj.targetFinishedItemId);
              const badge = statusBadges[proj.status] || { label: proj.status, style: 'bg-slate-100 text-slate-600' };

              return (
                <div
                  key={proj.id}
                  onClick={() => setExpandedProjectId(isExpanded ? null : proj.id)}
                  className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all duration-300 relative group flex flex-col justify-between min-h-[210px] cursor-pointer ${
                    isExpanded 
                      ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-500/20 bg-indigo-50/15' 
                      : 'border-slate-100/90 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-slate-200'
                  }`}
                >
                  {/* Top Row: Left building icon badge, Right count/status pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100/90 text-slate-700 border border-slate-200/60 font-mono">
                        {proj.steps?.length || 4} مرحله
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.style}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                      <Building2 className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Middle Content */}
                  <div className="my-3 space-y-1.5">
                    <h3 className="font-black text-base sm:text-lg text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {proj.name}
                    </h3>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        {proj.code}
                      </span>
                      <span>•</span>
                      <span className="line-clamp-1 text-slate-600 font-medium">{proj.client}</span>
                    </div>

                    {/* Production Progress Bar */}
                    <div className="pt-2 space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500 font-medium">تیراژ: <strong className="text-slate-700 font-mono">{proj.producedQuantity} / {proj.targetQuantity}</strong></span>
                        <span className="font-mono font-bold text-indigo-600">{proj.progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${proj.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 group-hover:text-indigo-600 transition-colors font-medium flex items-center gap-1 text-[11px]">
                      کلیک برای مشاهده جزئیات
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-600' : ''}`} />
                    </span>

                    {/* Quick Action Tools */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditProject(proj, e)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="ویرایش پروژه و فرمول ساخت (BOM)"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProject(proj.id, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف پروژه"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Expanded Project Detailed 5-Stage Workflow Drawer */}
          {expandedProjectId && (() => {
            const activeProj = projects.find(p => p.id === expandedProjectId);
            if (!activeProj) return null;
            const finishedItem = items.find(i => i.id === activeProj.targetFinishedItemId);

            return (
              <div className="bg-white border border-indigo-100 rounded-3xl p-5 sm:p-6 shadow-md space-y-5 animate-fadeIn">
                {/* Active Project Header & Toolbar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                        {activeProj.code}
                      </span>
                      <h3 className="font-black text-lg text-slate-900">
                        {activeProj.name}
                      </h3>
                      <span className="text-xs text-slate-500 font-medium">
                        (کارفرما: <strong className="text-slate-800">{activeProj.client}</strong>)
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-4">
                      <span>محصول خروجی: <strong className="text-indigo-600">{finishedItem?.name || activeProj.targetFinishedItemId}</strong></span>
                      <span>مدیر پروژه: <strong className="text-slate-800">{activeProj.projectManager}</strong></span>
                      <span>تیراژ هدف: <strong className="text-slate-800 font-mono">{activeProj.targetQuantity} {finishedItem?.unit || 'عدد'}</strong></span>
                      <span>پیشرفت کل: <strong className="text-emerald-600 font-mono">{activeProj.progressPercent}%</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setProgressReportProject(activeProj)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                      title="مشاهده ماتریس تفصیلی درصد پیشرفت، تحویل قطعات و دریافت خروجی تمامی مراحل"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>گزارش هوشمند پیشرفت مراحل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSmartScalingProject(activeProj)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                      title="محاسبه و تنظیم خودکار اهداف مراحل و قطعات نیمه‌ساخته بر اساس درخت فرمول ساخت BOM"
                    >
                      <Calculator className="w-4 h-4 text-amber-100" />
                      <span>محاسبه فرمول ساخت اهداف مراحل (BOM)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTreeReportProject(activeProj)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <FolderTree className="w-4 h-4" />
                      <span>نمودار درختی و گزارش مدیریتی</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBomExplosionProject(activeProj)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Boxes className="w-4 h-4" />
                      <span>آنالیز قطعات و حواله به قفسه (BOM Explosion)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedProjectId(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                      title="بستن جزئیات"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Linear Stages Display */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">مراحل گردش کار و خط تولید این پروژه ({activeProj.steps.length} مرحله خطی):</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      جهت مشاهده جزئیات، تحویل قطعات و ثبت خروجی نیمه‌ساخته، روی هر ردیف کلیک کنید
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {activeProj.steps.map((step, idx) => (
                      <LinearStepCard
                        key={step.id}
                        step={step}
                        projectId={activeProj.id}
                        project={activeProj}
                        depth={0}
                        subIndex={idx}
                        stepCodeStr={`${step.stepNumber || idx + 1}`}
                        items={items}
                        boms={boms}
                        contractors={contractors}
                        targetQuantity={activeProj.targetQuantity}
                        updateProjectStep={updateProjectStep}
                        setAddingSubStepTo={setAddingSubStepTo}
                        onEditStep={canEdit ? handleOpenEditStep : undefined}
                        onDeleteStep={canDelete ? handleDeleteStep : undefined}
                        onHandoverStep={handleOpenHandover}
                        onRecordOutput={handleOpenOutputReceipt}
                        canAddSubStep={canAdd}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Linear / List View */
        <div className="space-y-4">
          {filteredProjects.map(proj => {
            const isExpanded = expandedProjectId === proj.id;
            const finishedItem = items.find(i => i.id === proj.targetFinishedItemId);
            const badge = statusBadges[proj.status] || { label: proj.status, style: 'bg-slate-100 text-slate-600' };

            return (
              <div 
                key={proj.id}
                className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden shadow-2xs transition-all"
              >
                {/* Project Main Header Bar */}
                <div 
                  onClick={() => setExpandedProjectId(isExpanded ? null : proj.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {proj.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.style}`}>
                        {badge.label}
                      </span>
                      {(proj.scrapAllowancePercent !== undefined && proj.scrapAllowancePercent > 0) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-800 border border-amber-300">
                          ضایعات مجاز: {proj.scrapAllowancePercent}٪
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base text-slate-900">{proj.name}</h3>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-4">
                      <span>مشتری: <strong className="text-slate-800">{proj.client}</strong></span>
                      <span>مدیر پروژه: <strong className="text-slate-800">{proj.projectManager}</strong></span>
                      <span>محصول: <strong className="text-indigo-600">{finishedItem?.name || proj.targetFinishedItemId}</strong></span>
                    </div>
                  </div>

                  {/* Progress & Output Stats */}
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">تیراژ تولید شده</div>
                      <div className="font-mono font-bold text-sm text-slate-900">
                        <span className="text-emerald-600">{proj.producedQuantity}</span> / {proj.targetQuantity} {finishedItem?.unit || 'دستگاه'}
                      </div>
                    </div>

                    <div className="w-28 sm:w-32 space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-500">پیشرفت:</span>
                        <strong className="text-indigo-600">{proj.progressPercent}%</strong>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all duration-500" 
                          style={{ width: `${proj.progressPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Actions: Edit & Delete buttons */}
                    {(canEdit || canDelete) && (
                      <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1" onClick={e => e.stopPropagation()}>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditProject(proj, e)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="ویرایش پروژه و فرمول ساخت"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteProject(proj.id, e)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="حذف پروژه"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {/* Project Step Workflow Drawer */}
                {isExpanded && (
                  <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-4">
                    <div className="text-xs font-bold text-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-indigo-600" />
                        <span>گردش و مراحل ۵ گانه تولید پروژه:</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setProgressReportProject(proj)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                          title="مشاهده ماتریس تفصیلی درصد پیشرفت، تحویل قطعات و دریافت خروجی تمامی مراحل"
                        >
                          <TrendingUp className="w-4 h-4" />
                          <span>گزارش هوشمند پیشرفت مراحل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSmartScalingProject(proj)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                          title="محاسبه و تنظیم خودکار اهداف مراحل و قطعات نیمه‌ساخته بر اساس درخت فرمول ساخت BOM"
                        >
                          <Calculator className="w-4 h-4 text-amber-100" />
                          <span>محاسبه فرمول ساخت اهداف مراحل (BOM)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTreeReportProject(proj)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                          <FolderTree className="w-4 h-4" />
                          <span>نمودار درختی و گزارش مدیریتی</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBomExplosionProject(proj)}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Boxes className="w-4 h-4" />
                          <span>آنالیز قطعات و حواله به قفسه (BOM Explosion)</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {proj.steps.map((step, idx) => (
                        <LinearStepCard
                          key={step.id}
                          step={step}
                          projectId={proj.id}
                          project={proj}
                          depth={0}
                          subIndex={idx}
                          stepCodeStr={`${step.stepNumber || idx + 1}`}
                          items={items}
                          boms={boms}
                          contractors={contractors}
                          targetQuantity={proj.targetQuantity || 1}
                          updateProjectStep={updateProjectStep}
                          setAddingSubStepTo={setAddingSubStepTo}
                          onEditStep={canEdit ? handleOpenEditStep : undefined}
                          onDeleteStep={canDelete ? handleDeleteStep : undefined}
                          onHandoverStep={handleOpenHandover}
                          onRecordOutput={handleOpenOutputReceipt}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add Project */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm text-indigo-600 flex items-center gap-2">
                <Factory className="w-4 h-4" />
                تعریف پروژه ساخت جدید
              </h3>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
                title="بستن و انصراف"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 touch-pan-y custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">کد پروژه*</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان کامل پروژه*</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تولید ۱۰۰ عدد برد کنترل برق"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نام مشتری / سفارش‌دهنده*</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: شرکت توزیع نیروی برق"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مدیر پروژه</label>
                  <input
                    type="text"
                    value={projectManager}
                    onChange={(e) => setProjectManager(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">محصول هدف پروژه*</label>
                  <select
                    value={targetFinishedItemId}
                    onChange={(e) => {
                      setTargetFinishedItemId(e.target.value);
                      initializeBOMRowsForAdd(e.target.value);
                    }}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  >
                    {items.map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تیراژ و تعداد هدف*</label>
                  <input
                    type="number"
                    min={1}
                    value={targetQuantity}
                    onChange={(e) => setTargetQuantity(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ضریب ضایعات پیش‌فرض پروژه (٪)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={scrapAllowancePercent}
                    onChange={(e) => setScrapAllowancePercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و الزامات فنی</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                ></textarea>
              </div>

              {/* Dynamic Project Steps Builder Section */}
              <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-indigo-600" />
                    <span>تعریف مراحل اختصاصی این پروژه ({customSteps.length} مرحله)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStepRow}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن مرحله جدید</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {customSteps.map((step, idx) => (
                    <div key={step.id} className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        
                        <input
                          type="text"
                          required
                          placeholder="عنوان مرحله (مثال: مونتاژ SMD، آون، کالیبراسیون)..."
                          value={step.name}
                          onChange={(e) => handleUpdateStepRow(step.id, 'name', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveStepRow(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            title="انتقال به بالا"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStepRow(idx, 'down')}
                            disabled={idx === customSteps.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            title="انتقال به پایین"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveStepRow(step.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="حذف مرحله"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-100">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">اپراتور / تیم مسئول</label>
                          <input
                            type="text"
                            placeholder="نام اپراتور یا مسئول..."
                            value={step.operator}
                            onChange={(e) => handleUpdateStepRow(step.id, 'operator', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-[11px] focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">خروجی نیمه‌ساخته این مرحله (اختیاری)</label>
                          <select
                            value={step.outputItemId || ''}
                            onChange={(e) => handleUpdateStepRow(step.id, 'outputItemId', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-[11px] focus:outline-none focus:border-indigo-500 bg-white"
                          >
                            <option value="">بدون خروجی نیمه‌ساخته (فقط پیشبرد مرحله)</option>
                            {items.map(i => (
                              <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">ضایعات اختصاصی مرحله (٪)</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            placeholder="0"
                            value={step.scrapAllowancePercent ?? 0}
                            onChange={(e) => handleUpdateStepRow(step.id, 'scrapAllowancePercent', Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-[11px] font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-2 sm:col-span-3">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700 font-semibold">
                            <input
                              type="checkbox"
                              checked={step.isOutsourced}
                              onChange={(e) => handleUpdateStepRow(step.id, 'isOutsourced', e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>برون‌سپاری به پیمانکار خارج کارگاه</span>
                          </label>
                        </div>
                      </div>

                      {step.isOutsourced && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs p-2 bg-amber-50/60 rounded-lg border border-amber-200/60">
                          <div>
                            <label className="block text-[10px] text-amber-900 font-bold mb-0.5">انتخاب پیمانکار</label>
                            <select
                              value={step.contractorId || ''}
                              onChange={(e) => handleUpdateStepRow(step.id, 'contractorId', e.target.value)}
                              className="w-full px-2 py-1 border border-amber-300 rounded-md bg-white text-[11px]"
                            >
                              <option value="">-- انتخاب پیمانکار مجری --</option>
                              {contractors.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.specialty})</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] text-amber-900 font-bold mb-0.5">هزینه تخمینی (تومان)</label>
                            <input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={step.outsourcingCost || 0}
                              onChange={(e) => handleUpdateStepRow(step.id, 'outsourcingCost', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-amber-300 rounded-md text-[11px] font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Direct Integrated Stage-by-Stage BOM Editor in Add Modal */}
              <div className="border border-indigo-100 bg-white rounded-2xl overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShowBOMSectionInAdd(!showBOMSectionInAdd)}
                  className="w-full p-3 bg-indigo-50/70 hover:bg-indigo-50 flex items-center justify-between text-xs font-bold text-indigo-900 border-b border-indigo-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-indigo-600" />
                    <span>تعریف و تنظیم فرمول ساخت (BOM) برای مراحل پروژه</span>
                    <span className="text-[10px] bg-indigo-200 text-indigo-800 font-mono px-2 py-0.5 rounded-full">
                      {stepBoms.reduce((acc, s) => acc + (s.items?.length || 0), 0)} قلم قطعه در مراحل
                    </span>
                  </div>
                  {showBOMSectionInAdd ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
                </button>

                {showBOMSectionInAdd && (
                  <div className="p-3 bg-white">
                    <ProjectBOMEditor
                      targetItemId={targetFinishedItemId}
                      items={items}
                      bomRows={bomRows}
                      setBomRows={setBomRows}
                      stepBoms={stepBoms}
                      setStepBoms={setStepBoms}
                      existingBom={boms.find(b => b.finishedItemId === targetFinishedItemId && b.isActive)}
                      targetQuantity={targetQuantity}
                    />
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold active:scale-95 transition-all"
                >
                  انصراف / برگشت
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-2xs active:scale-95 transition-all"
                >
                  ایجاد و ثبت پروژه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Add Sub-Step */}
      {addingSubStepTo && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl p-4 sm:p-5 space-y-4 max-h-[92vh] flex flex-col my-auto overflow-y-auto touch-pan-y custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-indigo-600 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                افزودن زیرمرحله جدید (شاخه درختی)
              </h3>
              <button onClick={() => setAddingSubStepTo(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubStep} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">عنوان زیرمرحله*</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مونتاژ ترانسفورماتور و قلع‌کاری پین‌ها..."
                  value={subStepTitle}
                  onChange={(e) => setSubStepTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
                  <Boxes className="w-3.5 h-3.5 text-amber-600" />
                  <span>محصول / قطعه نیمه‌ساخته خروجی این زیرمرحله (اختیاری)</span>
                </label>
                <select
                  value={subStepOutputItemId}
                  onChange={(e) => setSubStepOutputItemId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">-- بدون قطعه/محصول خروجی مجزا --</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.itemType === 'SemiFinished' ? 'قطعه نیمه‌ساخته' : item.itemType === 'Finished' ? 'محصول نهایی' : 'ماده اولیه'}) - کد: {item.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ضایعات اختصاصی این زیرمرحله (٪)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={subStepScrapPercent}
                    onChange={(e) => setSubStepScrapPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {subStepOutputItemId && (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">تیراژ/تعداد خروجی زیرمرحله</label>
                    <input
                      type="number"
                      min={1}
                      value={subStepOutputQty}
                      onChange={(e) => setSubStepOutputQty(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {subStepOutputItemId && (
                <>
                  {/* Active BOM Link Indicator */}
                  {(() => {
                    const matchedBom = boms.find(b => b.finishedItemId === subStepOutputItemId && b.isActive);
                    if (matchedBom) {
                      return (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold">فرمول ساخت (BOM) برای این زیرمرحله فعال است</div>
                            <div className="text-[10px] text-emerald-700 mt-0.5">
                              شامل {matchedBom.items.length} قلم قطعه مصرفی. مواد اولیه موقع صدور حواله تحویل به اپراتور طبق این فرمول لیست می‌شوند.
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold">فرمول ساخت (BOM) هنوز برای این قطعه ساخته نشده است</div>
                            <div className="text-[10px] text-amber-700 mt-0.5">
                              می‌توانید زیرمرحله را ثبت کنید و بعداً از تب «فرمول‌های ساخت»، فرمول BOM این قطعه را تعریف کنید تا اتوماتیک متصل گردد.
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">واگذاری به پیمانکار برون‌سپاری (اختیاری)</label>
                <select
                  value={subStepContractorId}
                  onChange={(e) => setSubStepContractorId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- انباشت/مونتاژ داخلی کارخانه --</option>
                  {contractors.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.specialty})</option>
                  ))}
                </select>
              </div>

              {subStepContractorId && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">هزینه تخمینی برون‌سپاری (تومان)</label>
                  <input
                    type="number"
                    min={0}
                    value={subStepCost}
                    onChange={(e) => setSubStepCost(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddingSubStepTo(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  ثبت زیرمرحله
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Project */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm text-indigo-600 flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                ویرایش اطلاعات پروژه ({editingProject.code})
              </h3>
              <button onClick={() => setEditingProject(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProject} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">نام پروژه*</label>
                  <input
                    type="text"
                    required
                    value={editProjName}
                    onChange={(e) => setEditProjName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">کارفرما / مشتری*</label>
                  <input
                    type="text"
                    required
                    value={editProjClient}
                    onChange={(e) => setEditProjClient(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">مدیر پروژه</label>
                  <input
                    type="text"
                    value={editProjManager}
                    onChange={(e) => setEditProjManager(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">وضعیت پروژه</label>
                  <select
                    value={editProjStatus}
                    onChange={(e) => setEditProjStatus(e.target.value as ProjectStatus)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Active">در حال اجرا (Active)</option>
                    <option value="OnHold">متوقف / معلق (OnHold)</option>
                    <option value="Completed">تکمیل شده (Completed)</option>
                    <option value="Cancelled">لغو شده (Cancelled)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">درصد پیشرفت (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editProjProgress}
                    onChange={(e) => setEditProjProgress(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">تیراژ هدف کل</label>
                  <input
                    type="number"
                    min={1}
                    value={editProjTargetQty}
                    onChange={(e) => setEditProjTargetQty(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">تعداد تولید شده تا کنون</label>
                  <input
                    type="number"
                    min={0}
                    value={editProjProducedQty}
                    onChange={(e) => setEditProjProducedQty(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">تاریخ شروع</label>
                  <input
                    type="text"
                    value={editProjStartDate}
                    onChange={(e) => setEditProjStartDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">تاریخ پایان برنامه‌ریزی</label>
                  <input
                    type="text"
                    value={editProjEndDate}
                    onChange={(e) => setEditProjEndDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">محصول خروجی نهایی پروژه</label>
                  <select
                    value={editProjTargetItemId}
                    onChange={(e) => {
                      setEditProjTargetItemId(e.target.value);
                      initializeBOMRowsForEdit(e.target.value);
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- بدون انتخاب --</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ضریب ضایعات پیش‌فرض پروژه (٪)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={editProjScrapPercent}
                    onChange={(e) => setEditProjScrapPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Direct Integrated Stage-by-Stage BOM Editor in Edit Modal */}
              <div className="border border-indigo-100 bg-white rounded-2xl overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShowBOMSectionInEdit(!showBOMSectionInEdit)}
                  className="w-full p-3 bg-indigo-50/70 hover:bg-indigo-50 flex items-center justify-between text-xs font-bold text-indigo-900 border-b border-indigo-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-indigo-600" />
                    <span>تعریف و ویرایش فرمول ساخت (BOM) مراحل پروژه</span>
                    <span className="text-[10px] bg-indigo-200 text-indigo-800 font-mono px-2 py-0.5 rounded-full">
                      {editStepBoms.reduce((acc, s) => acc + (s.items?.length || 0), 0)} قلم قطعه در مراحل
                    </span>
                  </div>
                  {showBOMSectionInEdit ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
                </button>

                {showBOMSectionInEdit && (
                  <div className="p-3 bg-white">
                    <ProjectBOMEditor
                      targetItemId={editProjTargetItemId}
                      items={items}
                      bomRows={editBomRows}
                      setBomRows={setEditBomRows}
                      stepBoms={editStepBoms}
                      setStepBoms={setEditStepBoms}
                      existingBom={boms.find(b => b.finishedItemId === editProjTargetItemId && b.isActive)}
                      targetQuantity={editProjTargetQty}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">توضیحات و یادداشت</label>
                <textarea
                  rows={2}
                  value={editProjDescription}
                  onChange={(e) => setEditProjDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Step */}
      {editingStepData && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl p-4 sm:p-5 space-y-4 max-h-[92vh] flex flex-col my-auto overflow-y-auto touch-pan-y custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-indigo-600 flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                ویرایش اطلاعات مرحله
              </h3>
              <button onClick={() => setEditingStepData(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStep} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">عنوان مرحله*</label>
                <input
                  type="text"
                  required
                  value={editStepTitle}
                  onChange={(e) => setEditStepTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">وضعیت مرحله</label>
                  <select
                    value={editStepStatus}
                    onChange={(e) => setEditStepStatus(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="Pending">در انتظار (Pending)</option>
                    <option value="InProgress">در حال انجام (InProgress)</option>
                    <option value="Completed">تکمیل شده (Completed)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">نوع اجرا</label>
                  <select
                    value={editStepIsOutsourced ? 'out' : 'in'}
                    onChange={(e) => setEditStepIsOutsourced(e.target.value === 'out')}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="in">تیم داخلی کارخانه</option>
                    <option value="out">برون‌سپاری به پیمانکار</option>
                  </select>
                </div>
              </div>

              {editStepIsOutsourced ? (
                <div className="space-y-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">انتخاب پیمانکار مجری</label>
                    <select
                      value={editStepContractorId}
                      onChange={(e) => setEditStepContractorId(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="">-- انتخاب از لیست پیمانکاران --</option>
                      {contractors.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.specialty})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">هزینه برون‌سپاری (تومان)</label>
                    <input
                      type="number"
                      min={0}
                      value={editStepCost}
                      onChange={(e) => setEditStepCost(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">اپراتورها / تیم مجری داخلی</label>
                  <input
                    type="text"
                    placeholder="مثال: تیم مونتاژ برد، تکنیسین QC"
                    value={editStepOperators}
                    onChange={(e) => setEditStepOperators(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
                  <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                  <span>محصول / قطعه نیمه‌ساخته خروجی این مرحله (اختیاری)</span>
                </label>
                <select
                  value={editStepOutputItemId}
                  onChange={(e) => setEditStepOutputItemId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">-- بدون قطعه/محصول خروجی مجزا --</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ضایعات اختصاصی این مرحله (٪)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={editStepScrapPercent}
                    onChange={(e) => setEditStepScrapPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {editStepOutputItemId && (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">تیراژ خروجی به ازای هر واحد محصول</label>
                    <input
                      type="number"
                      min={1}
                      value={editStepOutputQty}
                      onChange={(e) => setEditStepOutputQty(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingStepData(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal BOM Explosion & Auto Material Delivery */}
      {bomExplosionProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Boxes className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    آنالیز انفجار BOM و محاسبه تخصیص مواد اولیه پروژه {bomExplosionProject.code}
                  </h3>
                  <p className="text-[11px] text-amber-100 mt-0.5">
                    محاسبه خودکار قطعات لازم برای تولید {bomExplosionProject.targetQuantity} عدد {items.find(i => i.id === bomExplosionProject.targetFinishedItemId)?.name} با احتساب درصد ضایعات
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setBomExplosionProject(null)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
              {/* Project Target Info Box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <div>
                  <span className="text-slate-500 block text-[10px]">کد و عنوان پروژه:</span>
                  <strong className="text-slate-800 text-xs font-mono">{bomExplosionProject.code} - {bomExplosionProject.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">محصول نهایی و تیراژ هدف:</span>
                  <strong className="text-amber-700 text-xs">
                    {items.find(i => i.id === bomExplosionProject.targetFinishedItemId)?.name} ({bomExplosionProject.targetQuantity} {items.find(i => i.id === bomExplosionProject.targetFinishedItemId)?.unit})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">قفسه اختصاصی انبار تولید:</span>
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    <Warehouse className="w-3 h-3" />
                    قفسه PRJ-101 (انبار تولید)
                  </span>
                </div>
              </div>

              {/* Materials Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Layers3 className="w-4 h-4 text-indigo-500" />
                    جدول قطعات لازم با احتساب ضایعات (Multi-Level BOM Explosion):
                  </h4>
                  <span className="text-[10px] text-slate-500">فرمول: (تعداد در BOM × تیراژ پروژه) + % ضایعات</span>
                </div>

                {(() => {
                  const requiredMaterials = getCalculatedProjectBOM(bomExplosionProject);
                  const hasShortage = requiredMaterials.some(m => m.shortage > 0);

                  if (requiredMaterials.length === 0) {
                    return (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 space-y-2">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                        <p className="font-bold text-xs">هیچ فرمول ساخت (BOM) برای این محصول یا قطعات آن تعریف نشده است.</p>
                        <p className="text-[11px]">جهت محاسبه و انفجار قطعات، ابتدا در بخش "فرمول‌های ساخت (BOM)" یک فرمول فعال برای محصول ثبت نمایید.</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="whitespace-nowrap p-2.5">کد قطعه</th>
                              <th className="whitespace-nowrap p-2.5">نام قطعه / ماده اولیه</th>
                              <th className="whitespace-nowrap p-2.5">نوع</th>
                              <th className="whitespace-nowrap p-2.5 text-center">مقدار در ۱ واحد</th>
                              <th className="whitespace-nowrap p-2.5 text-center">% ضایعات</th>
                              <th className="whitespace-nowrap p-2.5 text-center bg-amber-50 text-amber-900">کل لازم با ضایعات</th>
                              <th className="whitespace-nowrap p-2.5 text-center">موجودی انبار مرکزی</th>
                              <th className="whitespace-nowrap p-2.5 text-center">موجودی قفسه پروژه</th>
                              <th className="whitespace-nowrap p-2.5 text-center">وضعیت تامین</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {requiredMaterials.map(mat => (
                              <tr key={mat.itemId} className="hover:bg-slate-50">
                                <td className="whitespace-nowrap p-2.5 font-mono text-[11px] text-slate-600">{mat.itemCode}</td>
                                <td className="whitespace-nowrap p-2.5 font-bold text-slate-900">{mat.itemName}</td>
                                <td className="whitespace-nowrap p-2.5">
                                  {mat.isSemiFinished ? (
                                    <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold border border-purple-200">
                                      نیمه‌ساخته
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                                      ماده اولیه
                                    </span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap p-2.5 text-center font-mono">{(mat.quantityPerUnit || 0)} {mat.unit}</td>
                                <td className="whitespace-nowrap p-2.5 text-center font-mono text-rose-600 font-bold">%{(mat.scrapPercent || 0)}</td>
                                <td className="whitespace-nowrap p-2.5 text-center font-mono font-bold text-amber-700 bg-amber-50/50">
                                  {(mat.totalNeededWithScrap || 0).toLocaleString('fa-IR')} {mat.unit}
                                </td>
                                <td className="whitespace-nowrap p-2.5 text-center font-mono text-slate-700">
                                  {(mat.centralStock || 0).toLocaleString('fa-IR')} {mat.unit}
                                </td>
                                <td className="whitespace-nowrap p-2.5 text-center font-mono text-indigo-700 font-bold">
                                  {(mat.projectRackStock || 0).toLocaleString('fa-IR')} {mat.unit}
                                </td>
                                <td className="whitespace-nowrap p-2.5 text-center">
                                  {(mat.shortage || 0) > 0 ? (
                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                      <ShieldAlert className="w-3 h-3 text-rose-500" />
                                      کسری: {(mat.shortage || 0).toLocaleString('fa-IR')}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      موجود و کافی
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {hasShortage && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-xs">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                            <span>توجه: برای برخی از قطعات، موجودی انبار مرکزی کمتر از مقدار کل محاسبه‌شده (با ضایعات) است. ابتدا خرید قطعات کسر شده انجام شود.</span>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Warehouse className="w-4 h-4 text-indigo-600" />
                          <span>با صدور حواله، قطعات فوق از انبار مرکزی کسر شده و به قفسه اختصاصی پروژه در انبار تولید تحویل داده می‌شوند.</span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => setBomExplosionProject(null)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                          >
                            انصراف
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleAutoIssueMaterialTransfer(bomExplosionProject, requiredMaterials)}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2 text-xs transition-all"
                          >
                            <FileCheck className="w-4 h-4" />
                            <span>صدور و تحویل قطعات به قفسه پروژه (تکمیل مرحله ۱)</span>
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Tree Diagram & Management Reports Modal */}
      {treeReportProject && (() => {
        const finishedTargetItem = (items || []).find(i => i.id === treeReportProject.targetFinishedItemId);
        const kpis = (() => {
          const flattened = flattenProjectSteps(treeReportProject.steps || [], '', 0);
          const totalSteps = flattened.length;
          const completedSteps = flattened.filter(f => f?.step?.status === 'Completed').length;
          const inProgressSteps = flattened.filter(f => f?.step?.status === 'InProgress').length;
          const pendingSteps = flattened.filter(f => f?.step?.status === 'Pending').length;
          const outsourcedSteps = flattened.filter(f => f?.step?.isOutsourced || f?.step?.contractorId).length;
          
          let totalOutsourcingCost = 0;
          flattened.forEach(f => {
            if (f?.step?.isOutsourced || f?.step?.contractorId) {
              totalOutsourcingCost += (f.step.outsourcingCost || f.step.contractorCost || 0);
            }
          });

          const outputItemsDefined = flattened.filter(f => f?.step?.outputItemId).length;

          return {
            totalSteps,
            completedSteps,
            inProgressSteps,
            pendingSteps,
            outsourcedSteps,
            totalOutsourcingCost,
            outputItemsDefined,
            flattened,
          };
        })();

        const contractorsReport = (() => {
          const map: Record<string, { name: string; stepCount: number; completedCount: number; cost: number }> = {};
          kpis.flattened.forEach(f => {
            if (!f || !f.step) return;
            if (f.step.isOutsourced || f.step.contractorId) {
              const cId = f.step.contractorId || f.step.contractorName || 'برون‌سپاری متفرقه';
              const cName = f.step.contractorName || (contractors || []).find(c => c.id === f.step.contractorId)?.name || cId;

              if (!map[cId]) {
                map[cId] = { name: cName, stepCount: 0, completedCount: 0, cost: 0 };
              }
              map[cId].stepCount++;
              if (f.step.status === 'Completed') map[cId].completedCount++;
              map[cId].cost += (f.step.outsourcingCost || f.step.contractorCost || 0);
            }
          });
          return Object.values(map);
        })();

        const consolidatedBOM = (() => {
          const materialTotals: Record<string, {
            itemId: string;
            itemCode: string;
            itemName: string;
            unit: string;
            totalQuantityNeeded: number;
            centralStock: number;
            shortage: number;
            usedInSteps: string[];
          }> = {};

          const targetBom = (boms || []).find(b => b.finishedItemId === treeReportProject.targetFinishedItemId && b.isActive);
          if (targetBom && Array.isArray(targetBom.items)) {
            targetBom.items.forEach(bomItem => {
              if (!bomItem) return;
              const item = (items || []).find(i => i.id === bomItem.itemId);
              if (!item) return;
              const qtyNeeded = (bomItem.quantityNeeded * (1 + (bomItem.scrapAllowancePercent || 0) / 100)) * (treeReportProject.targetQuantity || 1);

              if (!materialTotals[item.id]) {
                materialTotals[item.id] = {
                  itemId: item.id,
                  itemCode: item.code || '',
                  itemName: item.name || '',
                  unit: item.unit || '',
                  totalQuantityNeeded: 0,
                  centralStock: item.systemQuantity || 0,
                  shortage: 0,
                  usedInSteps: ['محصول نهایی اصلی'],
                };
              }
              materialTotals[item.id].totalQuantityNeeded += qtyNeeded;
            });
          }

          kpis.flattened.forEach(f => {
            if (f?.step?.outputItemId) {
              const subBom = (boms || []).find(b => b.finishedItemId === f.step.outputItemId && b.isActive);
              if (subBom && Array.isArray(subBom.items)) {
                const runQty = f.step.outputQuantity || treeReportProject.targetQuantity || 1;
                subBom.items.forEach(bomItem => {
                  if (!bomItem) return;
                  const item = (items || []).find(i => i.id === bomItem.itemId);
                  if (!item) return;
                  const qtyNeeded = (bomItem.quantityNeeded * (1 + (bomItem.scrapAllowancePercent || 0) / 100)) * runQty;

                  if (!materialTotals[item.id]) {
                    materialTotals[item.id] = {
                      itemId: item.id,
                      itemCode: item.code || '',
                      itemName: item.name || '',
                      unit: item.unit || '',
                      totalQuantityNeeded: 0,
                      centralStock: item.systemQuantity || 0,
                      shortage: 0,
                      usedInSteps: [],
                    };
                  }
                  materialTotals[item.id].totalQuantityNeeded += qtyNeeded;
                  if (!materialTotals[item.id].usedInSteps.includes(`مرحله ${f.code}`)) {
                    materialTotals[item.id].usedInSteps.push(`مرحله ${f.code}`);
                  }
                });
              }
            }
          });

          return Object.values(materialTotals).map(m => ({
            ...m,
            shortage: Math.max(0, m.totalQuantityNeeded - m.centralStock)
          }));
        })();

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-inner">
                    <FolderTree className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base sm:text-lg">نمودار شاخه درختی و گزارش‌های مدیریتی پروژه</h3>
                      <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-700">
                        {treeReportProject.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      نام پروژه: <strong>{treeReportProject.name}</strong> | مشتری: {treeReportProject.client} | پیشرفت کل: <span className="text-emerald-400 font-bold">{treeReportProject.progressPercent}%</span>
                    </p>
                  </div>
                </div>

                {/* Project Switcher Dropdown & Close */}
                <div className="flex items-center gap-2">
                  <select
                    value={treeReportProject.id}
                    onChange={(e) => {
                      const sel = projects.find(p => p.id === e.target.value);
                      if (sel) setTreeReportProject(sel);
                    }}
                    className="p-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 focus:outline-none cursor-pointer"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        پروژه {p.code}: {p.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setTreeReportProject(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="bg-slate-100 p-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setTreeActiveTab('tree')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      treeActiveTab === 'tree' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FolderTree className="w-4 h-4 text-indigo-600" />
                    <span>نمودار شاخه درختی مراحل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTreeActiveTab('reports')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      treeActiveTab === 'reports' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <PieChart className="w-4 h-4 text-emerald-600" />
                    <span>گزارش‌های مدیریتی و KPIها</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTreeActiveTab('wbs')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      treeActiveTab === 'wbs' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>جدول شکست کار (WBS)</span>
                  </button>
                </div>

                {/* Filters */}
                {treeActiveTab === 'tree' && (
                  <div className="flex items-center gap-2 text-xs">
                    <select
                      value={treeStatusFilter}
                      onChange={(e: any) => setTreeStatusFilter(e.target.value)}
                      className="p-1.5 bg-white border border-slate-300 rounded-xl text-slate-700 text-[11px] font-medium"
                    >
                      <option value="all">همه وضعیت‌ها</option>
                      <option value="Completed">تکمیل شده 🟢</option>
                      <option value="InProgress">در حال انجام 🔵</option>
                      <option value="Pending">در انتظار ⚪</option>
                    </select>

                    <select
                      value={treeTypeFilter}
                      onChange={(e: any) => setTreeTypeFilter(e.target.value)}
                      className="p-1.5 bg-white border border-slate-300 rounded-xl text-slate-700 text-[11px] font-medium"
                    >
                      <option value="all">همه اجراها (داخلی/پیمانکار)</option>
                      <option value="outsourced">فقط برون‌سپاری 🏢</option>
                      <option value="internal">فقط تیم داخلی کارخانه 🏭</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Modal Body Tab Content */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
                {/* TAB 1: TREE DIAGRAM VIEW */}
                {treeActiveTab === 'tree' && (
                  <div className="space-y-4">
                    {/* Root Node Header Banner */}
                    <div className="p-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl shadow-md border border-indigo-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-[11px] text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Boxes className="w-4 h-4 text-indigo-400" />
                          <span>ریشه اصلی درخت پروژه (محصول نهایی هدف):</span>
                        </div>
                        <h4 className="font-bold text-base sm:text-lg text-white">
                          {finishedTargetItem?.name || treeReportProject.targetFinishedItemId}
                        </h4>
                        <div className="text-xs text-indigo-200 flex flex-wrap gap-4 pt-1">
                          <span>تیراژ هدف: <strong className="text-amber-300">{treeReportProject.targetQuantity} {finishedTargetItem?.unit || 'دستگاه'}</strong></span>
                          <span>تولید شده: <strong className="text-emerald-300">{treeReportProject.producedQuantity} {finishedTargetItem?.unit || 'دستگاه'}</strong></span>
                          <span>مدیر پروژه: <strong className="text-white">{treeReportProject.projectManager}</strong></span>
                        </div>
                      </div>

                      <div className="w-full md:w-48 space-y-1 bg-indigo-950/60 p-3 rounded-xl border border-indigo-700/60">
                        <div className="flex justify-between text-xs text-indigo-200 font-mono">
                          <span>پیشرفت کلی:</span>
                          <strong className="text-emerald-400">{treeReportProject.progressPercent}%</strong>
                        </div>
                        <div className="w-full h-2.5 bg-indigo-900/80 rounded-full overflow-hidden border border-indigo-600">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-400 to-emerald-400"
                            style={{ width: `${treeReportProject.progressPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Step Branches Canvas View */}
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                      <div className="text-xs font-bold text-slate-800 flex flex-wrap items-center justify-between border-b pb-2 gap-2">
                        <span className="flex items-center gap-1.5 text-indigo-700">
                          <FolderTree className="w-4 h-4" />
                          <span>نمودار شاخه‌ای ساختار شکست کار (Org/WBS Tree Diagram):</span>
                        </span>

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setTreeZoom(z => Math.max(0.5, z - 0.1))}
                            className="px-2 py-0.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 shadow-2xs cursor-pointer"
                            title="کوچکنمایی (-)"
                          >
                            -
                          </button>
                          <span className="font-mono text-[11px] font-bold px-1.5 text-slate-700">
                            {Math.round(treeZoom * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={() => setTreeZoom(z => Math.min(1.5, z + 0.1))}
                            className="px-2 py-0.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 shadow-2xs cursor-pointer"
                            title="بزرگنمایی (+)"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => setTreeZoom(1)}
                            className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg border border-indigo-200 mr-1 cursor-pointer"
                          >
                            100%
                          </button>
                        </div>
                      </div>

                      {/* Canvas Area with dotted engineering background */}
                      <div className="overflow-x-auto overflow-y-auto p-4 sm:p-8 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] bg-slate-50/80 rounded-2xl border border-slate-200 min-h-[350px]">
                        {liteMode ? (
                          <div className="max-w-2xl mx-auto bg-white/95 border border-amber-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                            <div className="flex items-center gap-3 text-amber-800 border-b pb-3 border-amber-100">
                              <Zap className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
                              <div className="text-right">
                                <h5 className="font-extrabold text-xs sm:text-sm">حالت فوق‌العاده سبک فعال است</h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">در این حالت برای جلوگیری از قفل شدن یا هنگ گوشی، ترسیم گرافیکی دو بعدی غیرفعال شده است.</p>
                              </div>
                            </div>
                            <div className="space-y-2.5">
                              <span className="text-xs font-black text-slate-800 block">ساختار شکست کار و درخت مراحل پروژه:</span>
                              <div className="space-y-1.5 max-h-[350px] overflow-y-auto custom-scrollbar pr-1 divide-y divide-slate-100/60">
                                {kpis.flattened.map(({ step, code, depth, subIndex }) => {
                                  const isSubStage = depth > 0;
                                  const theme = isSubStage ? getSubStageTheme(subIndex, depth) : null;
                                  return (
                                    <div 
                                      key={step.id} 
                                      className={`flex items-center justify-between text-xs py-2 transition-colors rounded-xl px-2.5 my-1 ${
                                        isSubStage ? `${theme?.cardBg} border-r-4 ${theme?.borderRight} border border-slate-200/50` : 'hover:bg-slate-50'
                                      }`}
                                      style={{ paddingRight: `${depth * 18 + 8}px` }}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border ${
                                          isSubStage ? theme?.indicatorBg : 'text-indigo-700 bg-indigo-50/55 border-indigo-100'
                                        }`}>
                                          {depth > 0 && "└─ "}{code}
                                        </span>
                                        <span className="font-bold text-slate-900 truncate">{step.name || step.title}</span>
                                        {isSubStage && (
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${theme?.indicatorBg}`}>
                                            زیرمرحله {subIndex + 1}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {step.status === 'Completed' ? (
                                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[9px]">تکمیل شد</span>
                                        ) : step.status === 'InProgress' ? (
                                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-bold text-[9px]">در حال اجرا</span>
                                        ) : (
                                          <span className="px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-full font-bold text-[9px]">در انتظار</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="flex flex-col items-center min-w-[700px] transition-transform duration-200 origin-top"
                            style={{ transform: `scale(${treeZoom})` }}
                          >
                            {/* ROOT NODE CARD */}
                            <div className="w-80 p-4 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-xl border-2 border-indigo-500 text-center relative z-10 space-y-1.5">
                              <div className="inline-flex p-2 bg-indigo-600 rounded-xl mb-1">
                                <Cpu className="w-5 h-5 text-white" />
                              </div>
                              <h4 className="font-extrabold text-sm text-white">
                                {finishedTargetItem?.name || treeReportProject.targetFinishedItemId}
                              </h4>
                              <div className="text-[11px] text-indigo-200 flex items-center justify-center gap-3 pt-1 border-t border-indigo-800/80">
                                <span>تیراژ هدف: <strong className="text-amber-300">{treeReportProject.targetQuantity}</strong></span>
                                <span>کد پروژه: <strong className="font-mono text-indigo-300">{treeReportProject.code}</strong></span>
                              </div>
                            </div>

                            {/* ROOT TRUNK LINE */}
                            {(treeReportProject.steps || []).length > 0 && (
                              <div className="w-1 h-8 bg-indigo-600 z-0"></div>
                            )}

                            {/* LEVEL 1 CHILDREN BRANCH ROW */}
                            {(treeReportProject.steps || []).length > 0 && (
                              <div className="relative flex justify-center pt-8 gap-8">
                                {/* Horizontal Branch Bar Across Main Steps */}
                                {(treeReportProject.steps || []).length > 1 && (
                                  <div className="absolute top-0 left-36 right-36 h-1 bg-indigo-500 z-0"></div>
                                )}

                                {(treeReportProject.steps || []).map((step, idx) => (
                                  <div key={step.id || idx} className="flex flex-col items-center relative">
                                    {/* Vertical Branch Connector Line Down to Step Card */}
                                    <div className="absolute -top-8 w-0.5 h-8 bg-indigo-500 z-0"></div>

                                    <GraphicalOrgTreeNode
                                      step={step}
                                      projectId={treeReportProject.id}
                                      codePrefix={`${idx + 1}`}
                                      depth={0}
                                      subIndex={idx}
                                      items={items}
                                      boms={boms}
                                      contractors={contractors}
                                      statusFilter={treeStatusFilter}
                                      typeFilter={treeTypeFilter}
                                      updateProjectStep={updateProjectStep}
                                      setAddingSubStepTo={setAddingSubStepTo}
                                      onEditStep={handleOpenEditStep}
                                      onDeleteStep={handleDeleteStep}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: MANAGEMENT REPORTS & KPIS */}
                {treeActiveTab === 'reports' && (
                  <div className="space-y-6">
                    {/* Top 4 KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1.5">
                        <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
                          <span>پیشرفت کل پروژه</span>
                          <BarChart3 className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="font-mono font-bold text-2xl text-slate-900">
                          {treeReportProject.progressPercent}%
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                          <span>مراحل تکمیل شده:</span>
                          <strong className="text-emerald-600">{kpis.completedSteps} از {kpis.totalSteps}</strong>
                        </div>
                      </div>

                      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1.5">
                        <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
                          <span>هزینه برون‌سپاری و پیمانکاران</span>
                          <Building2 className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="font-mono font-bold text-lg text-amber-700">
                          {kpis.totalOutsourcingCost.toLocaleString('fa-IR')} <span className="text-xs text-slate-500 font-normal">تومان</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                          <span>مراحل برون‌سپاری شده:</span>
                          <strong className="text-amber-800">{kpis.outsourcedSteps} مرحله</strong>
                        </div>
                      </div>

                      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1.5">
                        <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
                          <span>قطعات نیمه‌ساخته تعریف‌شده</span>
                          <Boxes className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="font-mono font-bold text-2xl text-purple-900">
                          {kpis.outputItemsDefined} <span className="text-xs text-slate-500 font-normal">قلم</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                          <span>حجم کل تولید هدف:</span>
                          <strong className="text-purple-800">{treeReportProject.targetQuantity} دستگاه</strong>
                        </div>
                      </div>

                      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1.5">
                        <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
                          <span>مراحل در انتظار (باقیمانده)</span>
                          <Clock className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="font-mono font-bold text-2xl text-indigo-700">
                          {kpis.pendingSteps + kpis.inProgressSteps} <span className="text-xs text-slate-500 font-normal">مرحله</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                          <span>در حال انجام:</span>
                          <strong className="text-indigo-600">{kpis.inProgressSteps} | در انتظار: {kpis.pendingSteps}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Contractors Breakdown Table */}
                    <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                        <Building2 className="w-4 h-4 text-amber-600" />
                        <span>گزارش عملکرد پیمانکاران برون‌سپاری در درخت پروژه:</span>
                      </div>

                      {contractorsReport.length === 0 ? (
                        <div className="text-xs text-slate-500 py-4 text-center">
                          هیچ مرحله‌ای به پیمانکار برون‌سپاری واگذار نشده است (تمام مراحل توسط تیم داخلی انجام می‌شود).
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-slate-600 border-b">
                                <th className="whitespace-nowrap p-2.5">نام پیمانکار / مجری</th>
                                <th className="whitespace-nowrap p-2.5 text-center">تعداد مراحل واگذارشده</th>
                                <th className="whitespace-nowrap p-2.5 text-center">تکمیل‌شده</th>
                                <th className="whitespace-nowrap p-2.5 text-center">جمع کل هزینه (تومان)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {contractorsReport.map((c, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/80">
                                  <td className="whitespace-nowrap p-2.5 font-bold text-slate-900">{c.name}</td>
                                  <td className="whitespace-nowrap p-2.5 text-center font-mono font-bold">{c.stepCount} مرحله</td>
                                  <td className="whitespace-nowrap p-2.5 text-center">
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200 text-[10px]">
                                      {c.completedCount} از {c.stepCount}
                                    </span>
                                  </td>
                                  <td className="whitespace-nowrap p-2.5 text-center font-mono font-bold text-amber-800">
                                    {c.cost.toLocaleString('fa-IR')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Consolidated BOM Explosion Material Requirements */}
                    <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                      <div className="text-xs font-bold text-slate-800 flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <Boxes className="w-4 h-4 text-indigo-600" />
                          <span>گزارش تجمیعی مواد اولیه و قطعات موردنیاز برای کل درخت پروژه (BOM Consolidated):</span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          محاسبه اتوماتیک فرمول BOM محصول اصلی و زیرمراحل
                        </span>
                      </div>

                      {consolidatedBOM.length === 0 ? (
                        <div className="text-xs text-slate-500 py-4 text-center">
                          فرمول ساخت (BOM) برای محصول اصلی یا قطعات خروجی زیرمراحل هنوز ثبت نشده است.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-slate-600 border-b">
                                <th className="whitespace-nowrap p-2.5">کد قطعه</th>
                                <th className="whitespace-nowrap p-2.5">نام ماده اولیه / قطعه</th>
                                <th className="whitespace-nowrap p-2.5 text-center">مقدار کل موردنیاز</th>
                                <th className="whitespace-nowrap p-2.5 text-center">موجودی انبار مرکزی</th>
                                <th className="whitespace-nowrap p-2.5 text-center">وضعیت تأمین / کسری</th>
                                <th className="whitespace-nowrap p-2.5">کاربرد در مراحل</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {consolidatedBOM.map((mat) => (
                                <tr key={mat.itemId} className="hover:bg-slate-50/80">
                                  <td className="whitespace-nowrap p-2.5 font-mono text-slate-600 text-[11px]">{mat.itemCode}</td>
                                  <td className="whitespace-nowrap p-2.5 font-bold text-slate-900">{mat.itemName}</td>
                                  <td className="whitespace-nowrap p-2.5 text-center font-mono font-bold text-indigo-900 bg-indigo-50/50">
                                    {mat.totalQuantityNeeded.toLocaleString('fa-IR')} {mat.unit}
                                  </td>
                                  <td className="whitespace-nowrap p-2.5 text-center font-mono text-slate-700">
                                    {mat.centralStock.toLocaleString('fa-IR')} {mat.unit}
                                  </td>
                                  <td className="whitespace-nowrap p-2.5 text-center">
                                    {mat.shortage > 0 ? (
                                      <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                        <ShieldAlert className="w-3 h-3 text-rose-500" />
                                        کسری: {mat.shortage.toLocaleString('fa-IR')} {mat.unit}
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        موجودی کافی
                                      </span>
                                    )}
                                  </td>
                                  <td className="whitespace-nowrap p-2.5 text-[11px] text-slate-500">
                                    {mat.usedInSteps.join(' ، ')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: WORK BREAKDOWN STRUCTURE (WBS TABLE) */}
                {treeActiveTab === 'wbs' && (
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-600" />
                        <span>جدول ساختار شکست کار (WBS Table):</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        تعداد کل عناصر شکست کار: {kpis.flattened.length}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 border-b">
                            <th className="whitespace-nowrap p-2.5">کد WBS</th>
                            <th className="whitespace-nowrap p-2.5">عنوان مرحله</th>
                            <th className="whitespace-nowrap p-2.5 text-center">نوع مجری</th>
                            <th className="whitespace-nowrap p-2.5">نام مجری / پیمانکار</th>
                            <th className="whitespace-nowrap p-2.5">قطعه خروجی</th>
                            <th className="whitespace-nowrap p-2.5 text-center">هزینه (تومان)</th>
                            <th className="whitespace-nowrap p-2.5 text-center">وضعیت</th>
                            <th className="whitespace-nowrap p-2.5 text-center">عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {kpis.flattened.map(({ step, code, depth, subIndex }) => {
                            const isSubStage = depth > 0;
                            const theme = isSubStage ? getSubStageTheme(subIndex, depth) : null;
                            const outputItem = items.find(i => i.id === step.outputItemId);
                            return (
                              <tr key={step.id} className={`transition-colors ${isSubStage ? `${theme?.cardBg} hover:bg-slate-100/90` : 'hover:bg-slate-50'}`}>
                                <td className="whitespace-nowrap p-2.5 font-mono text-[11px] font-bold">
                                  {isSubStage ? (
                                    <span className={`px-2 py-0.5 rounded-md border font-mono ${theme?.indicatorBg}`}>
                                      {code}
                                    </span>
                                  ) : (
                                    <span className="text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100 font-mono font-extrabold">
                                      {code}
                                    </span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap p-2.5 font-semibold text-slate-900" style={{ paddingRight: `${(depth * 18) + 10}px` }}>
                                  {isSubStage && (
                                    <span className={`font-mono font-bold ml-1.5 ${theme?.indicatorText}`}>└─</span>
                                  )}
                                  <span>{step.name || step.title}</span>
                                  {isSubStage && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border mr-2 ${theme?.indicatorBg}`}>
                                      زیرمرحله {subIndex + 1}
                                    </span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap p-2.5 text-center">
                                  {step.isOutsourced || step.contractorId ? (
                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded text-[10px] font-bold border border-amber-200">
                                      برون‌سپاری
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold border border-slate-200">
                                      داخلی
                                    </span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap p-2.5 font-medium text-slate-800">
                                  {step.contractorName || (step.assignedOperators?.join(', ') || 'خط مونتاژ داخلی')}
                                </td>
                                <td className="whitespace-nowrap p-2.5 text-slate-700">
                                  {outputItem ? (
                                    <span className="font-bold text-purple-900">{outputItem.name} ({step.outputQuantity || treeReportProject.targetQuantity} {outputItem.unit})</span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap p-2.5 text-center font-mono font-bold text-slate-800">
                                  {(step.outsourcingCost || step.contractorCost) ? (step.outsourcingCost || step.contractorCost || 0).toLocaleString('fa-IR') : '-'}
                                </td>
                                <td className="whitespace-nowrap p-2.5 text-center">
                                  {step.status === 'Completed' ? (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                                      تکمیل شد
                                    </span>
                                  ) : step.status === 'InProgress' ? (
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-full text-[10px]">
                                      در حال انجام
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-medium rounded-full text-[10px]">
                                      در انتظار
                                    </span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap p-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => updateProjectStep(treeReportProject.id, step.id, 'Completed')}
                                      className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] rounded border border-emerald-200"
                                      title="علامت‌گذاری به عنوان تکمیل‌شده"
                                    >
                                      تکمیل
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setAddingSubStepTo({ projectId: treeReportProject.id, parentStepId: step.id })}
                                      className="px-2 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[10px] rounded border border-indigo-200"
                                      title="افزودن زیرمرحله جدید"
                                    >
                                      + زیرمرحله
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditStep(step, treeReportProject.id)}
                                      className="p-1 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded transition-colors"
                                      title="ویرایش مرحله"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteStep(step.id, treeReportProject.id)}
                                      className="p-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded transition-colors"
                                      title="حذف مرحله"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Smart Stage Scaling Modal */}
      {smartScalingProject && (
        <SmartStageScalingModal
          project={smartScalingProject}
          isOpen={!!smartScalingProject}
          onClose={() => setSmartScalingProject(null)}
        />
      )}

      {/* Material Handover & Stage Start Modal */}
      {handoverModalData && (
        <StepMaterialHandoverModal
          isOpen={!!handoverModalData}
          onClose={() => setHandoverModalData(null)}
          project={handoverModalData.project}
          step={handoverModalData.step}
        />
      )}

      {/* Production Output / Semi-finished Receipt Modal */}
      {outputReceiptModalData && (
        <StepOutputReceiptModal
          isOpen={!!outputReceiptModalData}
          onClose={() => setOutputReceiptModalData(null)}
          project={outputReceiptModalData.project}
          step={outputReceiptModalData.step}
        />
      )}

      {/* Project Stage Matrix & Progress Report Modal */}
      {progressReportProject && (
        <ProjectStageProgressReportModal
          isOpen={!!progressReportProject}
          onClose={() => setProgressReportProject(null)}
          project={progressReportProject}
          onOpenHandover={(st) => handleOpenHandover(st, progressReportProject)}
          onOpenOutputReceipt={(st) => handleOpenOutputReceipt(st, progressReportProject)}
        />
      )}
    </div>
  );
};
