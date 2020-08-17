export interface PlanOutCodeObjectLiteral {
  [k: string]: PlanOutCodeValue | undefined;
}

export interface PlanOutCodeLiteralOp {
  op: "literal";
  value: PlanOutCodeObjectLiteral;
}

export interface PlanOutCodeArrayOp {
  op: "array";
  values: PlanOutCode[];
}

export interface PlanOutCodeGetOp {
  op: "get";
  var: string;
}

export interface PlanOutCodeSetOp {
  op: "set";
  var: string;
  value: PlanOutCode;
}

export interface PlanOutCodeSeqOp {
  op: "seq";
  seq: PlanOutCode[];
}

export interface PlanOutCodeCondOp {
  op: "cond";
  cond: Array<{ if: PlanOutCode; then: PlanOutCode }>;
}

export interface PlanOutCodeBinaryOp {
  op: "equals" | ">" | "<" | ">=" | "<=" | "%" | "/" | "-";
  left: PlanOutCode;
  right: PlanOutCode;
}

export interface PlanOutCodeUnaryOp {
  op: "return" | "negative" | "not" | "round" | "length";
  value: PlanOutCode;
}

export interface PlanOutCodeCommutativeOp {
  op: "min" | "max" | "product" | "sum" | "and" | "or";
  values: PlanOutCode[];
}

// These values can be written straight into the PlanOut compiled code, but
// object literal must be written using the "literal" op
export type PlanOutCodeAtomicValue = string | number | boolean | null;

export type PlanOutCodeValue =
  | PlanOutCodeAtomicValue
  | PlanOutCodeObjectLiteral
  | PlanOutCodeValue[];

export interface PlanOutCodeRandomRangeOp {
  op: "randomFloat" | "randomInteger";
  min: PlanOutCode;
  max: PlanOutCode;
  unit: PlanOutCode;
}
export interface PlanOutCodeRandomTrialOp {
  op: "bernoulliTrial";
  p: PlanOutCode;
  unit: PlanOutCode;
}
export interface PlanOutCodeRandomFilterOp {
  op: "bernoulliFilter";
  p: PlanOutCode;
  choices: PlanOutCode;
  unit: PlanOutCode;
}
export interface PlanOutCodeUniformChoiceOp {
  op: "uniformChoice";
  choices: PlanOutCode;
  unit: PlanOutCode;
}
export interface PlanOutCodeWeightedChoiceOp {
  op: "weightedChoice";
  choices: PlanOutCode;
  weights: PlanOutCode;
  unit: PlanOutCode;
}
export interface PlanOutCodeSampleOp {
  op: "sample";
  choices: PlanOutCode;
  draws: PlanOutCode;
  unit: PlanOutCode;
}
export interface PlanOutCodeIncludesOp {
  op: "includes";
  collection: PlanOutCode;
  value: PlanOutCode;
}
export interface PlanOutCodeIndexOp {
  op: "index";
  base: PlanOutCode;
  index: PlanOutCode;
}
export type PlanOutCodeRandomOp =
  | PlanOutCodeRandomRangeOp
  | PlanOutCodeRandomTrialOp
  | PlanOutCodeRandomFilterOp
  | PlanOutCodeUniformChoiceOp
  | PlanOutCodeWeightedChoiceOp
  | PlanOutCodeSampleOp;

export type PlanOutCodeCoreOp =
  | PlanOutCodeGetOp
  | PlanOutCodeSetOp
  | PlanOutCodeSeqOp
  | PlanOutCodeCondOp
  | PlanOutCodeLiteralOp
  | PlanOutCodeArrayOp
  | PlanOutCodeBinaryOp
  | PlanOutCodeUnaryOp
  | PlanOutCodeCommutativeOp
  | PlanOutCodeIncludesOp
  | PlanOutCodeIndexOp;

export type PlanOutCodeOp = PlanOutCodeCoreOp | PlanOutCodeRandomOp;

export type PlanOutCode = PlanOutCodeAtomicValue | PlanOutCodeOp;
