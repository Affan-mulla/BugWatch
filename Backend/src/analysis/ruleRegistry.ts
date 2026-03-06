import type { Rule } from "./types.js";
import { noEvalRule } from "./rules/noEvalRule.js";
import { noHardcodedSecretRule } from "./rules/noHardcodedSecretRule.js";
import { requireTryCatchAsyncRule } from "./rules/requireTryCatchAsyncRule.js";
import { noDangerouslySetInnerHtmlRule } from "./rules/noDangerouslySetInnerHtmlRule.js";
import { noInnerHtmlAssignmentRule } from "./rules/noInnerHtmlAssignmentRule.js";
import { noSqlTemplateInterpolationRule } from "./rules/noSqlTemplateInterpolationRule.js";
import { noWeakCryptoRule } from "./rules/noWeakCryptoRule.js";
import { noConsoleLogRule } from "./rules/noConsoleLogRule.js";

export const ruleRegistry: Rule[] = [
  noEvalRule,
  noHardcodedSecretRule,
  requireTryCatchAsyncRule,
  noDangerouslySetInnerHtmlRule,
  noInnerHtmlAssignmentRule,
  noSqlTemplateInterpolationRule,
  noWeakCryptoRule,
  noConsoleLogRule,
];
