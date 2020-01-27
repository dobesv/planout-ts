export interface PlanoutCodeObjectLiteral {
  [k: string]: PlanoutCodeValue | PlanoutCodeObjectLiteral | undefined;
}
export interface PlanoutCodeLiteralOp {
  op: "literal";
  value: PlanoutCodeValue | PlanoutCodeObjectLiteral;
}
export interface PlanoutCodeArrayOp {
  op: "array";
  values: PlanoutCode[];
}
export interface PlanoutCodeGetOp {
  op: "get";
  var: string;
}
export interface PlanoutCodeSetOp {
  op: "set";
  var: string;
  value: PlanoutCode;
}
export interface PlanoutCodeSeqOp {
  op: "seq";
  seq: PlanoutCode[];
}
export interface PlanoutCodeCondOp {
  op: "cond";
  cond: Array<{ if: PlanoutCode; then: PlanoutCode }>;
}
export interface PlanoutCodeBinaryOp {
  op: "equals" | "and" | "or" | ">" | "<" | ">=" | "<=" | "%" | "/";
  left: PlanoutCode;
  right: PlanoutCode;
}
export interface PlanoutCodeUnaryOp {
  op: "return" | "not" | "round" | "-" | "length";
  value: PlanoutCode;
}
export interface PlanoutCodeCommutativeOp {
  op: "min" | "max" | "product" | "sum";
  values: PlanoutCode[];
}
export type PlanoutCodeValue =
  | string
  | number
  | boolean
  | null
  | PlanoutCodeValue[];

export interface PlanoutCodeRandomRangeOp {
  op: "randomFloat" | "randomInteger";
  min: PlanoutCode;
  max: PlanoutCode;
}
export interface PlanoutCodeRandomTrialOp {
  op: "bernoulliTrial";
  p: PlanoutCode;
}
export interface PlanoutCodeRandomFilterOp {
  op: "bernoulliFilter";
  p: PlanoutCode;
  choices: PlanoutCode[];
}
export interface PlanoutCodeUniformChoiceOp {
  op: "uniformChoice";
  choices: PlanoutCode[];
}
export interface PlanoutCodeWeightedChoiceOp {
  op: "weightedChoice";
  choices: PlanoutCode[];
  weights: PlanoutCode[] | number[];
}
export interface PlanoutCodeSampleOp {
  op: "sample";
  choices: PlanoutCode[];
  draws: PlanoutCode;
}
export type PlanoutCodeRandomOp = { unit: PlanoutCode } & (
  | PlanoutCodeRandomRangeOp
  | PlanoutCodeRandomTrialOp
  | PlanoutCodeRandomFilterOp
  | PlanoutCodeUniformChoiceOp
  | PlanoutCodeWeightedChoiceOp
  | PlanoutCodeSampleOp
);
export type PlanoutCodeCoreOp =
  | PlanoutCodeGetOp
  | PlanoutCodeSetOp
  | PlanoutCodeSeqOp
  | PlanoutCodeCondOp
  | PlanoutCodeLiteralOp
  | PlanoutCodeArrayOp
  | PlanoutCodeBinaryOp
  | PlanoutCodeUnaryOp
  | PlanoutCodeCommutativeOp;

export type PlanoutCode =
  | PlanoutCodeValue
  | PlanoutCodeCoreOp
  | PlanoutCodeRandomOp;
