import fs from 'fs';
import path from 'path';
import type { ElementModel } from '../engine/dom-analyzer/interaction-model';

const ANALYSIS_DIR = path.resolve(__dirname, '.');

export function saveAnalysis(name: string, elements: ElementModel[]): void {
  const filePath = path.join(ANALYSIS_DIR, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(elements, null, 2), 'utf-8');
}

export function loadAnalysis(name: string): ElementModel[] {
  const filePath = path.join(ANALYSIS_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Analysis file not found: ${filePath}\nRun the "analyze" project first: npx playwright test --project=analyze`
    );
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as ElementModel[];
}
