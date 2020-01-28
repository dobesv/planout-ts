export interface PlanOutCodeObjectLiteral {
  [k: string]: PlanOutCodeValue | PlanOutCodeObjectLiteral | undefined;
}

export interface PlanOutCodeLiteralOp {
  op: "literal";
  value: PlanOutCodeValue | PlanOutCodeObjectLiteral;
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
  op: "equals" | "and" | "or" | ">" | "<" | ">=" | "<=" | "%" | "/";
  left: PlanOutCode;
  right: PlanOutCode;
}

export interface PlanOutCodeUnaryOp {
  op: "return" | "not" | "round" | "-" | "length";
  value: PlanOutCode;
}

export interface PlanOutCodeCommutativeOp {
  op: "min" | "max" | "product" | "sum";
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
}
export interface PlanOutCodeRandomTrialOp {
  op: "bernoulliTrial";
  p: PlanOutCode;
}
export interface PlanOutCodeRandomFilterOp {
  op: "bernoulliFilter";
  p: PlanOutCode;
  choices: PlanOutCode[];
}
export interface PlanOutCodeUniformChoiceOp {
  op: "uniformChoice";
  choices: PlanOutCode[];
}
export interface PlanOutCodeWeightedChoiceOp {
  op: "weightedChoice";
  choices: PlanOutCode[];
  weights: PlanOutCode[];
}
export interface PlanOutCodeSampleOp {
  op: "sample";
  choices: PlanOutCode[];
  draws: PlanOutCode;
}
export type PlanOutCodeRandomOp = { unit: PlanOutCode } & (
  | PlanOutCodeRandomRangeOp
  | PlanOutCodeRandomTrialOp
  | PlanOutCodeRandomFilterOp
  | PlanOutCodeUniformChoiceOp
  | PlanOutCodeWeightedChoiceOp
  | PlanOutCodeSampleOp
);
export type PlanOutCodeCoreOp =
  | PlanOutCodeGetOp
  | PlanOutCodeSetOp
  | PlanOutCodeSeqOp
  | PlanOutCodeCondOp
  | PlanOutCodeLiteralOp
  | PlanOutCodeArrayOp
  | PlanOutCodeBinaryOp
  | PlanOutCodeUnaryOp
  | PlanOutCodeCommutativeOp;

export type PlanOutCode =
  | PlanOutCodeAtomicValue
  | PlanOutCodeCoreOp
  | PlanOutCodeRandomOp;
