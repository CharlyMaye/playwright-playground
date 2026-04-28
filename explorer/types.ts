import type { Page } from '@playwright/test';
import type { PartialExplorationConfig } from './ExplorationConfig';

// ============================================================
// ExplorationTarget — generic target descriptor (app-agnostic)
// ============================================================

/**
 * A single exploration target: a URL + the config to apply when exploring it.
 *
 * Targets are TypeScript values (not JSON) so they can carry a `preExploreHook`
 * function that runs after `page.goto()` and before `explorer.explore()`.
 */
export type ExplorationTarget = {
  /** Unique identifier — used as the JSON output filename suffix. */
  name: string;
  /** Absolute URL to explore. */
  url: string;
  /** Partial config merged on top of the schema defaults. */
  config: PartialExplorationConfig;
  /** Optional hook executed after `goto` and before `explore` (e.g. dismiss banners). */
  preExploreHook?: (page: Page) => Promise<void>;
};

// ============================================================
// Phase 2 — Types fondamentaux
// ============================================================

/** Bounding box d'un élément dans le viewport */
export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Représentation normalisée d'un élément interactif détecté dans le DOM */
export type ElementFact = {
  uid: string;
  tag: string;
  role: string | null;
  accessibleName: string | null;
  visible: boolean;
  enabled: boolean;
  focusable: boolean;
  text: string;
  inputType: string | null;
  ariaExpanded: boolean | null;
  ariaControls: string | null;
  ariaOwns: string | null;
  tabindex: number | null;
  contentEditable: boolean;
  boundingBox: BoundingBox | null;
  isInScope: boolean;
  parentUid: string | null;
  cssSelector: string;
};

// ============================================================
// CandidateAction — actions proposées par le moteur de règles
// ============================================================

// `targetSelector` is a page-level CSS selector (computed by DOMExtractor
// from the captured ElementFact). When present, ActionExecutor and
// ExplorationPOM resolve actions through this selector instead of the
// scope-relative `targetUid` heuristic. This avoids index drift between
// the extractor's interactive-collection ordering and the executor's
// per-tag `nth(index)` ordering on heterogeneous pages.

export type ClickAction = { type: 'click'; targetUid: string; targetSelector?: string; priority: number };
export type HoverAction = { type: 'hover'; targetUid: string; targetSelector?: string; priority: number };
export type FillAction = { type: 'fill'; targetUid: string; targetSelector?: string; value: string; priority: number };
export type SelectAction = { type: 'select'; targetUid: string; targetSelector?: string; option: string; priority: number };
export type FocusAction = { type: 'focus'; targetUid: string; targetSelector?: string; priority: number };
export type ClearAction = { type: 'clear'; targetUid: string; targetSelector?: string; priority: number };

export type UnitaryAction = ClickAction | HoverAction | FillAction | SelectAction | FocusAction | ClearAction;

export type SequenceAction = {
  type: 'sequence';
  steps: SequenceStep[];
  priority: number;
};

export type CandidateAction = UnitaryAction | SequenceAction;

// ============================================================
// SequenceStep + WaitCondition
// ============================================================

export type WaitConditionSelector = {
  type: 'selector';
  selector: string;
  state: 'visible' | 'attached' | 'hidden';
};
export type WaitConditionStable = { type: 'stable'; timeout: number };
export type WaitConditionFunction = { type: 'function'; expression: string };
export type WaitConditionDelay = { type: 'delay'; ms: number };

export type WaitCondition = WaitConditionSelector | WaitConditionStable | WaitConditionFunction | WaitConditionDelay;

export type SequenceStep = {
  action: UnitaryAction;
  waitAfter?: WaitCondition;
};

// ============================================================
// StateNode — nœud du graphe
// ============================================================

export type StateNode = {
  id: string;
  facts: ElementFact[];
  depth: number;
  timestamp: number;
  scopeSelector: string;
};

// ============================================================
// Transition — arête du graphe
// ============================================================

export type DomChanges = {
  appeared: string[];
  disappeared: string[];
  modified: string[];
};

export type Transition = {
  id: string;
  from: string;
  to: string;
  action: CandidateAction;
  success: boolean;
  duration: number;
  domChanges: DomChanges;
  navigationUrl?: string;
};

// ============================================================
// ActionResult — résultat d'exécution d'une action
// ============================================================

export type ActionResult = {
  success: boolean;
  error: string | null;
  newFacts: ElementFact[];
  domChanged: boolean;
  duration: number;
};

// ============================================================
// SerializedGraph — format d'export JSON
// ============================================================

export type SerializedGraph = {
  states: StateNode[];
  transitions: Transition[];
};
