import { ActionResult, CandidateAction, ElementFact } from './types';

/**
 * Port: performs a candidate action on the UI and reports the outcome.
 *
 * `supports` is the driver's capability declaration — some actions have no
 * guaranteed equivalent on every backend (`hover`, `mousedown`, JS-based
 * wait conditions on desktop drivers). The explorer filters unsupported
 * candidates instead of letting them fail.
 */
export abstract class ActionExecutor {
  abstract execute(action: CandidateAction): Promise<ActionResult>;
  abstract supports(action: CandidateAction): boolean;
}

/** Utility: compute simple diff of appeared/disappeared/modified elements */
export function computeDomChanges(before: ElementFact[], after: ElementFact[]): { appeared: string[]; disappeared: string[]; modified: string[] } {
  const beforeUids = new Set(before.map((f) => f.uid));
  const afterUids = new Set(after.map((f) => f.uid));
  const afterMap = new Map(after.map((f) => [f.uid, f]));
  const beforeMap = new Map(before.map((f) => [f.uid, f]));

  const appeared = [...afterUids].filter((uid) => !beforeUids.has(uid));
  const disappeared = [...beforeUids].filter((uid) => !afterUids.has(uid));
  const modified = [...afterUids]
    .filter((uid) => beforeUids.has(uid))
    .filter((uid) => {
      const b = beforeMap.get(uid)!;
      const a = afterMap.get(uid)!;
      return b.visible !== a.visible || b.enabled !== a.enabled || b.ariaExpanded !== a.ariaExpanded;
    });

  return { appeared, disappeared, modified };
}
