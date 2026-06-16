import type { PartialExplorationConfig } from './ExplorationConfig';

/**
 * A single exploration target: a location + the config to apply when exploring it.
 *
 * Targets are TypeScript values (not JSON) so they can carry a `preExploreHook`
 * function that runs after navigation and before `explorer.explore()`.
 *
 * `TSession` is the driver-specific session handed to the hook (Playwright
 * `Page` on the web adapter) — the core stays driver-agnostic.
 */
export type ExplorationTarget<TSession = unknown> = {
  /** Unique identifier — used as the JSON output filename suffix. */
  name: string;
  /** Absolute URL to explore. */
  url: string;
  /** Partial config merged on top of the schema defaults. */
  config: PartialExplorationConfig;
  /** Optional hook executed after navigation and before `explore` (e.g. dismiss banners). */
  preExploreHook?: (session: TSession) => Promise<void>;
};

/** Bounding box of an element within the browser viewport. */
export type BoundingBox = {
  /** Distance in pixels from the left edge of the viewport. */
  x: number;
  /** Distance in pixels from the top edge of the viewport. */
  y: number;
  /** Element width in pixels. */
  width: number;
  /** Element height in pixels. */
  height: number;
};

/**
 * Normalised representation of an interactive element detected in the DOM.
 *
 * Produced by {@link DOMExtractor} and consumed by {@link RulesEngine} to
 * generate candidate actions, and by {@link StateManager} to compute the
 * state hash.
 */
export type ElementFact = {
  /** Stable unique identifier for the element within the snapshot (aria, testid or positional). */
  uid: string;
  /** Lowercase HTML tag name (`button`, `input`, `a`…). */
  tag: string;
  /** Resolved ARIA role (`button`, `link`, `textbox`…) or `null` if absent. */
  role: string | null;
  /** Computed accessible name (`aria-label`, text content, `title`…) or `null`. */
  accessibleName: string | null;
  /** `true` if the element is visible in the viewport (not hidden by CSS). */
  visible: boolean;
  /** `true` if the element is interactive (not disabled, not `aria-disabled`). */
  enabled: boolean;
  /** `true` if the element can receive keyboard focus. */
  focusable: boolean;
  /** Raw text content of the element (trimmed `textContent`). */
  text: string;
  /** HTML input type (`text`, `email`, `password`…) or `null` for non-input elements. */
  inputType: string | null;
  /**
   * For `<select>` elements: the list of option labels, in document order.
   * Consumed by {@link RulesEngine} to honour
   * {@link ExplorationConfig.selectStrategy} (`random`/`all`). `undefined` for
   * non-select elements. Excluded from the state hash.
   */
  options?: string[];
  /** Value of `aria-expanded` or `null` if the attribute is absent. */
  ariaExpanded: boolean | null;
  /** Value of `aria-controls` (ID of the controlled panel) or `null`. */
  ariaControls: string | null;
  /** Value of `aria-owns` (IDs of owned elements) or `null`. */
  ariaOwns: string | null;
  /** Numeric value of `tabindex` or `null` if not set. */
  tabindex: number | null;
  /** `true` if the element is editable via `contenteditable`. */
  contentEditable: boolean;
  /** Bounding box within the viewport, or `null` if the element is off-screen. */
  boundingBox: BoundingBox | null;
  /** `true` if the element is within the scope defined by {@link ExplorationConfig.rootSelector} (or `overflowSelectors`). */
  isInScope: boolean;
  /** UID of the parent element in the facts tree, or `null` for root elements. */
  parentUid: string | null;
  /**
   * Driver-native selector for the element (CSS on web, UIA path on
   * desktop…). Opaque to the core: only the driver that produced it can
   * resolve it — never mix adapters on the same graph.
   */
  nativeSelector: string;
};

type TargetedAction<Type extends string> = {
  type: Type;
  targetUid: string;
  /**
   * Driver-native selector (copied from the captured ElementFact's
   * `nativeSelector`). When present, the executor resolves the action
   * through this selector instead of the scope-relative `targetUid`
   * heuristic — avoids index drift between the extractor's ordering and
   * the executor's per-tag `nth(index)` ordering on heterogeneous pages.
   * Opaque: only the driver that produced it can resolve it.
   */
  targetSelector?: string;
  priority: number;
};

/** Click action on an interactive element. */
export type ClickAction = TargetedAction<'click'>;
/** Hover action on an element — may reveal tooltips or dropdown menus. */
export type HoverAction = TargetedAction<'hover'>;
/** Fill action on a text field. The value comes from {@link ExplorationConfig.fillValues}. */
export type FillAction = TargetedAction<'fill'> & { value: string };
/** Option selection in a `<select>`. The option is chosen according to {@link ExplorationConfig.selectStrategy}. */
export type SelectAction = TargetedAction<'select'> & { option: string };
/** Keyboard focus action on an element. */
export type FocusAction = TargetedAction<'focus'>;
/** Clear action that empties an input field. */
export type ClearAction = TargetedAction<'clear'>;
/** `mousedown` event on an element (useful for menus and sliders). */
export type MousedownAction = TargetedAction<'mousedown'>;

/** Union of all elementary actions targeting a single element. */
export type UnitaryAction = ClickAction | HoverAction | FillAction | SelectAction | FocusAction | ClearAction | MousedownAction;

/**
 * Macro-action composed of a sequence of elementary actions.
 *
 * Useful for modelling multi-step flows (e.g. open a menu, then click a
 * sub-item) that cannot be expressed as a single action.
 */
export type SequenceAction = {
  type: 'sequence';
  steps: SequenceStep[];
  priority: number;
};

/** Union of all candidate actions evaluated by the {@link RulesEngine}. */
export type CandidateAction = UnitaryAction | SequenceAction;

/** Wait condition based on the visibility of a CSS selector. */
export type WaitConditionSelector = {
  type: 'selector';
  selector: string;
  state: 'visible' | 'attached' | 'hidden';
};
/** Wait condition until the DOM stabilises (no further mutations), bounded by `timeout` ms. */
export type WaitConditionStable = { type: 'stable'; timeout: number };
/** Wait condition evaluated by a JavaScript expression in the browser. */
export type WaitConditionFunction = { type: 'function'; expression: string };
/** Fixed pause expressed in milliseconds. */
export type WaitConditionDelay = { type: 'delay'; ms: number };

/** Union of all wait conditions that can be attached to a sequence step. */
export type WaitCondition = WaitConditionSelector | WaitConditionStable | WaitConditionFunction | WaitConditionDelay;

/** A single step of a {@link SequenceAction}: an elementary action with an optional wait condition. */
export type SequenceStep = {
  /** Elementary action to execute at this step. */
  action: UnitaryAction;
  /** Condition to await after the action before moving to the next step. */
  waitAfter?: WaitCondition;
};

/** Graph node representing a stable UI state detected by the explorer. */
export type StateNode = {
  /** SHA-256 hash (truncated to 16 chars) of the facts filtered by `domHashStrategy`. */
  id: string;
  /**
   * Snapshot of interactive elements captured in this state.
   *
   * Full {@link ElementFact}s while the node is on the exploration frontier;
   * reduced to {@link MinimalElementFact}s once it is exhausted (see
   * {@link FactEvictionObserver}). Consumers that need the full snapshot must
   * only read it before eviction — which holds for everything in {@link Explorer}.
   */
  facts: ElementFact[] | MinimalElementFact[];
  /** Depth in the graph (0 = initial state). */
  depth: number;
  /** UNIX timestamp (ms) when the state was captured. */
  timestamp: number;
  /** Root CSS selector active at capture time (value of {@link ExplorationConfig.rootSelector}). */
  scopeSelector: string;
  /**
   * Opaque location identifier (URL on the web) at the time of capture.
   * Only set in `followNavigation` crawler mode, where it is part of the
   * state identity — absent in SPA mode to preserve existing state hashes.
   */
  location?: string;
};

/** DOM diff observed between two consecutive snapshots. */
export type DomChanges = {
  /** UIDs of elements present in `after` but absent from `before`. */
  appeared: string[];
  /** UIDs of elements present in `before` but absent from `after`. */
  disappeared: string[];
  /** UIDs of elements present in both snapshots but whose state has changed. */
  modified: string[];
};

/** Graph edge linking two states via a candidate action. */
export type Transition = {
  /** Unique transition identifier (`from->to:type:uid`). */
  id: string;
  /** Source state identifier. */
  from: string;
  /** Destination state identifier, or `'__external_navigation__'` for out-of-application navigations. */
  to: string;
  /** Candidate action executed to trigger this transition. */
  action: CandidateAction;
  /** `true` if the action completed without error. */
  success: boolean;
  /** Action execution duration in milliseconds. */
  duration: number;
  /** Elements appeared, disappeared or modified as a result of the action. */
  domChanges: DomChanges;
  /** Destination URL when a navigation occurred (crawler mode). */
  navigationUrl?: string;
  /** When `true`, `from === to` — the action did not change the state hash. */
  selfLoop?: boolean;
};

/** Result returned by {@link ActionExecutor.execute} after running an action. */
export type ActionResult = {
  /** `true` if the action completed without throwing. */
  success: boolean;
  /** Error message on failure, `null` otherwise. */
  error: string | null;
  /** Facts snapshot captured after the action. */
  newFacts: ElementFact[];
  /** `true` if the state hash changed compared to before the action. */
  domChanged: boolean;
  /** Execution duration in milliseconds. */
  duration: number;
};

/**
 * Reduced fact retained once a state leaves the exploration frontier, and the
 * default shape emitted in the serialised graph.
 *
 * Only `uid` and `nativeSelector` survive — enough to resolve the element
 * again during replay — while the heavy fields (`boundingBox`, `text`,
 * `accessibleName`…) are dropped. On large pages (thousands of elements) the
 * full snapshot dominates both heap usage and JSON size; keeping the full
 * facts is opt-in via {@link ExplorationConfig.serializeFacts} `'full'`.
 */
export type MinimalElementFact = Pick<ElementFact, 'uid' | 'nativeSelector'>;

/** State node as serialised: facts may be full, minimal, or omitted. */
export type SerializedStateNode = Omit<StateNode, 'facts'> & {
  facts: Array<ElementFact | MinimalElementFact>;
};

/**
 * Serialised form of the graph, used for JSON export and HTML rendering.
 *
 * Produced by {@link ExplorationGraph.toJSON} and consumed by
 * {@link GraphHtmlExporter} and {@link ScenarioExporter}.
 */
export type SerializedGraph = {
  /** Ordered list of all states in the graph. */
  states: SerializedStateNode[];
  /** List of all transitions, including self-loops. */
  transitions: Transition[];
};

/** Returns the targetUid for unitary actions, or '' for sequence actions. */
export function getTargetUid(action: CandidateAction): string {
  return action.type === 'sequence' ? '' : action.targetUid;
}
