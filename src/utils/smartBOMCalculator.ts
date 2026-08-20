import { Item, BOM, Project, ProjectStep } from '../types';

export interface SmartStageCalculation {
  stepId: string;
  stepName: string;
  stepCode: string;
  outputItemId?: string;
  outputItemName?: string;
  outputItemCode?: string;
  outputItemType?: string;
  baseMultiplierPerFinalUnit: number; // e.g. 3 (because 3x semi-finished are needed per 1 final product)
  rawTargetQty: number; // e.g. 100 * 3 = 300
  scrapPercent: number; // e.g. 2%
  calculatedSmartTargetQty: number; // e.g. 100 final * 3 = 300 (or + scrap)
  currentOutputQty: number;
  isAutoCalculated: boolean;
  explanation: string;
  pathTrace: string[]; // ['Final Product P1', 'Semi-Finished Sub-Board A (3x)']
  subComponentsNeeded: {
    itemId: string;
    itemCode: string;
    itemName: string;
    unit: string;
    quantityPerStageUnit: number;
    totalNeededForStage: number;
  }[];
}

/**
 * Recursively find the effective multiplier of an item inside a target BOM tree
 * e.g. If FinalProduct -> needs 3x Semi1, multiplier is 3.
 * If FinalProduct -> needs 2x SubAssembly, and SubAssembly -> needs 3x Semi1, multiplier is 2 * 3 = 6.
 */
export function findItemMultiplierInBOMTree(
  targetItemId: string,
  rootFinishedItemId: string,
  allBoms: BOM[],
  visitedBoms: Set<string> = new Set()
): { multiplier: number; scrapAllowance: number; path: string[] } {
  // Find active BOM for the root item
  const activeRootBom = allBoms.find(b => b.finishedItemId === rootFinishedItemId && b.isActive) 
    || allBoms.find(b => b.finishedItemId === rootFinishedItemId);

  if (!activeRootBom || visitedBoms.has(activeRootBom.id)) {
    return { multiplier: 0, scrapAllowance: 0, path: [] };
  }

  visitedBoms.add(activeRootBom.id);

  // 1. Direct check: Is targetItemId directly listed as a component in this BOM?
  const directItem = activeRootBom.items.find(it => it.itemId === targetItemId);
  if (directItem) {
    return {
      multiplier: directItem.quantityNeeded,
      scrapAllowance: directItem.scrapAllowancePercent || 0,
      path: [activeRootBom.name]
    };
  }

  // 2. Multi-level recursive check: Does any sub-component have its own BOM that contains targetItemId?
  for (const comp of activeRootBom.items) {
    const subResult = findItemMultiplierInBOMTree(targetItemId, comp.itemId, allBoms, new Set(visitedBoms));
    if (subResult.multiplier > 0) {
      const combinedMultiplier = comp.quantityNeeded * subResult.multiplier;
      const combinedScrap = Math.max(comp.scrapAllowancePercent || 0, subResult.scrapAllowance);
      return {
        multiplier: combinedMultiplier,
        scrapAllowance: combinedScrap,
        path: [activeRootBom.name, ...subResult.path]
      };
    }
  }

  return { multiplier: 0, scrapAllowance: 0, path: [] };
}

/**
 * Calculate smart production target for a specific project step with custom scrap allowance overrides
 */
export function calculateStepSmartTarget(
  step: ProjectStep,
  stepCode: string,
  project: Project,
  allBoms: BOM[],
  allItems: Item[],
  scrapOverrides?: { projectScrap?: number; stepScraps?: Record<string, number> }
): SmartStageCalculation {
  const currentOutputQty = step.outputQuantity || step.completedQuantity || 0;
  const outputItem = allItems.find(i => i.id === step.outputItemId);

  // Determine effective scrap allowance for this step
  let effectiveScrap = 0;
  if (scrapOverrides?.stepScraps && scrapOverrides.stepScraps[step.id] !== undefined) {
    effectiveScrap = scrapOverrides.stepScraps[step.id];
  } else if (step.scrapAllowancePercent !== undefined && step.scrapAllowancePercent !== null) {
    effectiveScrap = step.scrapAllowancePercent;
  } else if (scrapOverrides?.projectScrap !== undefined) {
    effectiveScrap = scrapOverrides.projectScrap;
  } else if (project.scrapAllowancePercent !== undefined && project.scrapAllowancePercent !== null) {
    effectiveScrap = project.scrapAllowancePercent;
  }

  // If no output item is specified for the step, fallback to project target
  if (!step.outputItemId || !outputItem) {
    const rawTarget = project.targetQuantity || 1;
    const finalTarget = effectiveScrap > 0 ? Math.ceil(rawTarget * (1 + effectiveScrap / 100)) : rawTarget;
    return {
      stepId: step.id,
      stepName: step.name || step.title || `مرحله ${stepCode}`,
      stepCode,
      baseMultiplierPerFinalUnit: 1,
      rawTargetQty: rawTarget,
      scrapPercent: effectiveScrap,
      calculatedSmartTargetQty: finalTarget,
      currentOutputQty,
      isAutoCalculated: false,
      explanation: 'کالای خروجی اختصاص داده نشده است؛ هدف پیش‌فرض برابر تیراژ پروژه لحاظ شد.',
      pathTrace: [],
      subComponentsNeeded: []
    };
  }

  // Check if outputItem is the final finished item of the project
  if (step.outputItemId === project.targetFinishedItemId) {
    const rawTarget = project.targetQuantity || 1;
    const finalTarget = effectiveScrap > 0 ? Math.ceil(rawTarget * (1 + effectiveScrap / 100)) : rawTarget;
    return {
      stepId: step.id,
      stepName: step.name || step.title || `مرحله ${stepCode}`,
      stepCode,
      outputItemId: outputItem.id,
      outputItemName: outputItem.name,
      outputItemCode: outputItem.code,
      outputItemType: outputItem.itemType,
      baseMultiplierPerFinalUnit: 1,
      rawTargetQty: rawTarget,
      scrapPercent: effectiveScrap,
      calculatedSmartTargetQty: finalTarget,
      currentOutputQty,
      isAutoCalculated: true,
      explanation: `این مرحله مستقیماً محصول نهایی پروژه (${outputItem.name}) را با تیراژ پایه ${rawTarget} تولید می‌کند` +
        (effectiveScrap > 0 ? ` (با احتساب ${effectiveScrap}٪ ضایعات پیش‌بینی شده: ${finalTarget} عدد).` : `.`),
      pathTrace: [outputItem.name],
      subComponentsNeeded: getStepSubComponents(step.outputItemId, finalTarget, allBoms, allItems, effectiveScrap)
    };
  }

  // Calculate multiplier in the Project's Final Product BOM tree
  const treeResult = findItemMultiplierInBOMTree(
    step.outputItemId,
    project.targetFinishedItemId,
    allBoms
  );

  const multiplier = treeResult.multiplier;
  // If no step/project scrap was explicitly specified, fallback to BOM tree scrap
  if (effectiveScrap === 0 && treeResult.scrapAllowance > 0) {
    effectiveScrap = treeResult.scrapAllowance;
  }

  let explanation = '';
  const pathTrace = treeResult.path;

  if (multiplier > 0) {
    const rawTarget = project.targetQuantity * multiplier;
    // Calculate final target with scrap allowance
    const finalTarget = effectiveScrap > 0 ? Math.ceil(rawTarget * (1 + effectiveScrap / 100)) : rawTarget;

    explanation = `فرمول ساخت محصول نهایی به ازای هر ۱ عدد، نیازمند ${multiplier} واحد از این قطعه نیمه‌ساخته است. ` +
      `بنابراین برای کل تیراژ پروژه (${project.targetQuantity} دستگاه)، هدف تولید پایه ${rawTarget} عدد محاسبه شد` +
      (effectiveScrap > 0 ? ` و با احتساب ${effectiveScrap}٪ ضریب ضایعات، هدف نهایی مرحله ${finalTarget} عدد تنظیم گردید.` : `.`);

    return {
      stepId: step.id,
      stepName: step.name || step.title || `مرحله ${stepCode}`,
      stepCode,
      outputItemId: outputItem.id,
      outputItemName: outputItem.name,
      outputItemCode: outputItem.code,
      outputItemType: outputItem.itemType,
      baseMultiplierPerFinalUnit: multiplier,
      rawTargetQty: rawTarget,
      scrapPercent: effectiveScrap,
      calculatedSmartTargetQty: finalTarget,
      currentOutputQty,
      isAutoCalculated: true,
      explanation,
      pathTrace,
      subComponentsNeeded: getStepSubComponents(step.outputItemId, finalTarget, allBoms, allItems, effectiveScrap)
    };
  }

  // Default to 1:1 if not found in root BOM
  const rawTarget = project.targetQuantity;
  const finalTarget = effectiveScrap > 0 ? Math.ceil(rawTarget * (1 + effectiveScrap / 100)) : rawTarget;
  return {
    stepId: step.id,
    stepName: step.name || step.title || `مرحله ${stepCode}`,
    stepCode,
    outputItemId: outputItem.id,
    outputItemName: outputItem.name,
    outputItemCode: outputItem.code,
    outputItemType: outputItem.itemType,
    baseMultiplierPerFinalUnit: 1,
    rawTargetQty: rawTarget,
    scrapPercent: effectiveScrap,
    calculatedSmartTargetQty: finalTarget,
    currentOutputQty,
    isAutoCalculated: false,
    explanation: `کالای نیمه‌ساخته در فرمول محصول نهایی یافت نشد، مقدار پایه ۱:۱ برابر تیراژ پروژه (${project.targetQuantity}) در نظر گرفته شد` +
      (effectiveScrap > 0 ? ` (با ${effectiveScrap}٪ ضایعات: ${finalTarget} عدد).` : `.`),
    pathTrace: [outputItem.name],
    subComponentsNeeded: getStepSubComponents(step.outputItemId, finalTarget, allBoms, allItems, effectiveScrap)
  };
}

/**
 * Helper to get all raw/component parts required for producing the step's target quantity
 */
function getStepSubComponents(
  outputItemId: string,
  stageTargetQty: number,
  allBoms: BOM[],
  allItems: Item[],
  parentScrapPercent: number = 0
): SmartStageCalculation['subComponentsNeeded'] {
  const matchedBom = allBoms.find(b => b.finishedItemId === outputItemId && b.isActive)
    || allBoms.find(b => b.finishedItemId === outputItemId);

  if (!matchedBom || !matchedBom.items) return [];

  return matchedBom.items.map(bomIt => {
    const raw = allItems.find(i => i.id === bomIt.itemId);
    const itemScrap = bomIt.scrapAllowancePercent || parentScrapPercent || 0;
    const scrapFactor = 1 + (itemScrap / 100);
    const totalNeeded = Math.ceil(bomIt.quantityNeeded * stageTargetQty * scrapFactor);
    return {
      itemId: bomIt.itemId,
      itemCode: raw?.code || bomIt.itemId,
      itemName: raw?.name || 'قطعه نامشخص',
      unit: bomIt.unit || raw?.unit || 'عدد',
      quantityPerStageUnit: bomIt.quantityNeeded,
      totalNeededForStage: totalNeeded
    };
  });
}

/**
 * Calculate smart targets for all steps in a project (flattened & tree)
 */
export function calculateAllProjectStageTargets(
  project: Project,
  allBoms: BOM[],
  allItems: Item[],
  scrapOverrides?: { projectScrap?: number; stepScraps?: Record<string, number> }
): {
  calculations: SmartStageCalculation[];
  totalSemiFinishedPiecesToProduce: number;
  hasUpdatesAvailable: boolean;
} {
  const calculations: SmartStageCalculation[] = [];

  const traverseSteps = (steps: ProjectStep[], prefix = '1') => {
    steps.forEach((s, idx) => {
      const code = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
      const calc = calculateStepSmartTarget(s, code, project, allBoms, allItems, scrapOverrides);
      calculations.push(calc);

      if (s.subSteps && s.subSteps.length > 0) {
        traverseSteps(s.subSteps, code);
      }
    });
  };

  traverseSteps(project.steps || [], '');

  const totalSemiFinished = calculations.reduce((sum, c) => sum + (c.calculatedSmartTargetQty || 0), 0);
  const hasUpdatesAvailable = calculations.some(c => c.calculatedSmartTargetQty !== c.currentOutputQty);

  return {
    calculations,
    totalSemiFinishedPiecesToProduce: totalSemiFinished,
    hasUpdatesAvailable
  };
}

/**
 * Apply the smart stage quantities directly to the project steps hierarchy
 */
export function applySmartTargetsToProjectSteps(
  steps: ProjectStep[],
  calculationsMap: Map<string, number>,
  scrapMap?: Map<string, number>
): ProjectStep[] {
  return steps.map(s => {
    const smartTarget = calculationsMap.get(s.id);
    const scrapVal = scrapMap?.get(s.id);
    const updatedStep: ProjectStep = {
      ...s,
      outputQuantity: smartTarget !== undefined ? smartTarget : s.outputQuantity,
      scrapAllowancePercent: scrapVal !== undefined ? scrapVal : s.scrapAllowancePercent
    };

    if (s.subSteps && s.subSteps.length > 0) {
      updatedStep.subSteps = applySmartTargetsToProjectSteps(s.subSteps, calculationsMap, scrapMap);
    }
    return updatedStep;
  });
}
