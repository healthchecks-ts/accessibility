export { AltTextChecker } from './alt-text-checker.js';
export { ColorContrastChecker } from './color-contrast-checker.js';
export { HeadingStructureChecker } from './heading-structure-checker.js';
export { AriaAttributesChecker } from './aria-attributes-checker.js';
export { FormLabelsChecker } from './form-labels-checker.js';

import { AltTextChecker } from './alt-text-checker.js';
import { ColorContrastChecker } from './color-contrast-checker.js';
import { HeadingStructureChecker } from './heading-structure-checker.js';
import { AriaAttributesChecker } from './aria-attributes-checker.js';
import { FormLabelsChecker } from './form-labels-checker.js';
import { AccessibilityChecker } from '../types.js';

export const ALL_CHECKERS: AccessibilityChecker[] = [
  new AltTextChecker(),
  new ColorContrastChecker(),
  new HeadingStructureChecker(),
  new AriaAttributesChecker(),
  new FormLabelsChecker(),
];