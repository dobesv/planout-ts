import {
  PlanOutCode,
  PlanOutCodeArrayOp,
  PlanOutCodeAtomicValue,
  PlanOutCodeBinaryOp,
  PlanOutCodeCommutativeOp,
  PlanOutCodeCondOp,
  PlanOutCodeGetOp,
  PlanOutCodeLiteralOp,
  PlanOutCodeObjectLiteral,
  PlanOutCodeRandomFilterOp,
  PlanOutCodeRandomRangeOp,
  PlanOutCodeRandomTrialOp,
  PlanOutCodeSampleOp,
  PlanOutCodeSeqOp,
  PlanOutCodeSetOp,
  PlanOutCodeUnaryOp,
  PlanOutCodeUniformChoiceOp,
  PlanOutCodeWeightedChoiceOp
} from "./PlanOutCode";
import defaultTo from "lodash/defaultTo";
import union from "lodash/union";

export interface PlanOutSelectParameter {
  type: "select";
  limit: number;
  values: PlanOutParameter[];
}

export interface PlanOutRangeParameter {
  type: "float" | "integer";
  min: number;
  max: number;
}

export interface PlanOutObjectParameter {
  type: "literal";
  value: PlanOutCodeObjectLiteral;
}

export interface PlanOutArrayParameter {
  type: "array";
  values: PlanOutParameter[];
}

export interface PlanOutUnionParameter {
  type: "union";
  variants: PlanOutParameter[];
}

export type PlanOutParameter =
  | PlanOutSelectParameter
  | PlanOutRangeParameter
  | PlanOutObjectParameter
  | PlanOutArrayParameter
  | PlanOutUnionParameter
  | PlanOutCodeAtomicValue;

export const booleanParameter: PlanOutParameter = {
  type: "select",
  limit: 1,
  values: [false, true]
};

const binaryArithmeticCombinator = (
  left: PlanOutParameter,
  right: PlanOutParameter,
  fn: (a: number, b: number) => number
): PlanOutParameter => {
  if (
    typeof left === "string" ||
    typeof left === "boolean" ||
    left === null ||
    typeof right === "string" ||
    typeof right === "boolean" ||
    right === null
  ) {
    return null;
  }
  if (typeof left === "number") {
    if (typeof right === "number") {
      return fn(left, right);
    } else if (right.type === "float" || right.type === "integer") {
      return {
        type: right.type,
        max: fn(left, right.max),
        min: fn(left, right.min)
      };
    } else if (right.type === "select") {
      return {
        type: "select",
        limit: right.limit,
        values: right.values.map(value =>
          binaryArithmeticCombinator(left, value, fn)
        )
      };
    }
  } else if (left.type === "float" || left.type === "integer") {
    if (typeof right === "number") {
      return {
        type: left.type,
        max: fn(left.max, right),
        min: fn(left.min, right)
      };
    } else if (right.type === "float" || right.type === "integer") {
      return {
        type:
          left.type === "float" || right.type === "float" ? "float" : "integer",
        max: fn(left.max, right.max),
        min: fn(left.min, right.min)
      };
    } else if (right.type === "select") {
      return {
        type: "select",
        limit: right.limit,
        values: right.values.map(value =>
          binaryArithmeticCombinator(left, value, fn)
        )
      };
    }
    return null;
  } else if (left.type === "select") {
    return {
      type: "select",
      limit: left.limit,
      values: left.values.map(value =>
        binaryArithmeticCombinator(value, right, fn)
      )
    };
  }
  return null;
};
export type MetaEnvironment = { [k: string]: PlanOutParameter | undefined };

const mergeParameters = (
  left: PlanOutParameter,
  right: PlanOutParameter
): PlanOutParameter => {
  if (left === null) {
    return right;
  }
  if (right === null) {
    return left;
  }
  // Merge individual values into a single select where possible
  if (typeof left !== "object") {
    if (typeof right !== "object") {
      if (left === right) {
        return left;
      }
      return { type: "select", limit: 1, values: [left, right] };
    }
    if (right.type === "select" && right.limit === 1) {
      return { type: "select", limit: 1, values: [left, ...right.values] };
    }
  } else if (typeof right !== "object") {
    if (left.type === "select" && left.limit === 1) {
      return { type: "select", limit: 1, values: [...left.values, right] };
    }
  } else {
    if (
      (left.type === "float" || left.type === "integer") &&
      left.type === right.type
    ) {
      return {
        type: right.type,
        min: Math.min(left.min, right.min),
        max: Math.max(left.max, right.max)
      };
    }
    if (
      left.type === "select" &&
      left.limit === 1 &&
      right.type === "select" &&
      right.limit === left.limit
    ) {
      return {
        type: right.type,
        limit: 1,
        values: union(left.values, right.values)
      };
    }
    if (left.type === "union") {
      if (right.type === "union") {
        return {
          type: "union",
          variants: [...left.variants, ...right.variants]
        };
      } else {
        return {
          type: "union",
          variants: [...left.variants, right]
        };
      }
    }
  }
  return {
    type: "union",
    variants: [left, right]
  };
};

/**
 * Given an experiment and some code, calculate the range of values that
 * the script might have output.  This can be used to display a user
 * interface to apply overrides to the experiments after they have run.
 */
export class PlanOutParameterGatherer {
  environment: MetaEnvironment;

  constructor(environment: MetaEnvironment = null) {
    this.environment = Object.create(environment);
  }

  inspect(code: PlanOutCode) {
    this.evalCode(code);
    return this.environment;
  }

  evalCode(code: PlanOutCode): PlanOutParameter {
    if (code === null) {
      return null;
    }
    if (
      typeof code === "number" ||
      typeof code === "string" ||
      typeof code === "boolean"
    ) {
      return code;
    }

    const op = code.op;
    const impl = this[op];
    return impl.call(this, code);
  }

  literal(code: PlanOutCodeLiteralOp): PlanOutParameter {
    return { type: "literal", value: code.value };
  }

  array(code: PlanOutCodeArrayOp): PlanOutParameter {
    return {
      type: "array",
      values: code.values.map(value => this.evalCode(value))
    };
  }

  calculateBinaryArithmetic(
    code: PlanOutCodeBinaryOp,
    fn: (a: number, b: number) => number
  ): PlanOutParameter {
    return binaryArithmeticCombinator(
      this.evalCode(code.left),
      this.evalCode(code.right),
      fn
    );
  }

  "%"(code: PlanOutCodeBinaryOp): PlanOutParameter {
    return this.calculateBinaryArithmetic(
      code,
      (a: number, b: number): number => a % b
    );
  }

  "-"(code: PlanOutCodeBinaryOp): PlanOutParameter {
    return this.calculateBinaryArithmetic(
      code,
      (a: number, b: number): number => a - b
    );
  }

  "/"(code: PlanOutCodeBinaryOp): PlanOutParameter {
    return this.calculateBinaryArithmetic(
      code,
      (a: number, b: number): number => a / b
    );
  }

  "<"(code: PlanOutCodeBinaryOp): PlanOutParameter {
    return booleanParameter;
  }

  "<="(code: PlanOutCodeBinaryOp): PlanOutParameter {
    return booleanParameter;
  }

  ">"(code: PlanOutCodeBinaryOp): PlanOutParameter {
    return booleanParameter;
  }

  ">="(code: PlanOutCodeBinaryOp): PlanOutParameter {
    return booleanParameter;
  }

  equals(code: PlanOutCodeBinaryOp): PlanOutParameter {
    return booleanParameter;
  }

  and(code: PlanOutCodeCommutativeOp): PlanOutParameter {
    return booleanParameter;
  }

  or(code: PlanOutCodeCommutativeOp): PlanOutParameter {
    return booleanParameter;
  }

  length(code: PlanOutCodeUnaryOp): PlanOutParameter {
    const param = this.evalCode(code);
    if (typeof param === "string") return param.length;
    if (
      param === null ||
      typeof param === "number" ||
      typeof param === "boolean" ||
      param.type === "integer" ||
      param.type === "float"
    )
      return null;
    if (param.type === "array") return param.values.length;
    if (param.type === "select") {
      return { type: "integer", min: 0, max: param.values.length };
    }
    return null;
  }

  negative(code: PlanOutCodeUnaryOp): PlanOutParameter {
    return this.product({ op: "product", values: [code.value, -1] });
  }

  not(code: PlanOutCodeUnaryOp): PlanOutParameter {
    return booleanParameter;
  }

  max(code: PlanOutCodeCommutativeOp): PlanOutParameter {
    const values = code.values.map(operand => this.evalCode(operand));
    return values.reduce((a, b) => binaryArithmeticCombinator(a, b, Math.max));
  }

  min(code: PlanOutCodeCommutativeOp): PlanOutParameter {
    const values = code.values.map(operand => this.evalCode(operand));
    return values.reduce((a, b) => binaryArithmeticCombinator(a, b, Math.min));
  }

  product(code: PlanOutCodeCommutativeOp): PlanOutParameter {
    const values = code.values.map(operand => this.evalCode(operand));
    return values.reduce((a, b) =>
      binaryArithmeticCombinator(a, b, (x, y) => x * y)
    );
  }

  sum(code: PlanOutCodeCommutativeOp): PlanOutParameter {
    const values = code.values.map(operand => this.evalCode(operand));
    return values.reduce((a, b) =>
      binaryArithmeticCombinator(a, b, (x, y) => x + y)
    );
  }

  /**
   * if/then conditional expression
   */
  cond(code: PlanOutCodeCondOp): PlanOutParameter {
    for (const clause of code.cond) {
      this.evalCode(clause.if);
      this.evalCode(clause.then);
    }
    return null;
  }

  /**
   * Run side-effectful expressions one after the other.
   */
  seq(code: PlanOutCodeSeqOp): PlanOutParameter {
    let returnValue = null;
    for (const step of code.seq) {
      returnValue = this.evalCode(step);
    }
    return returnValue;
  }

  /**
   * Assign a value
   */
  set(code: PlanOutCodeSetOp): PlanOutParameter {
    let parameter = this.evalCode(code.value);
    if (parameter === null || parameter === undefined) return null;

    // Merge with existing assignment to same name, if there is any
    parameter = mergeParameters(
      defaultTo(this.environment[code.var], null),
      parameter
    );
    this.environment[code.var] = parameter;
    return parameter;
  }

  /**
   * Get an input or a previously assigned value
   */
  get(code: PlanOutCodeGetOp) {
    return defaultTo(this.environment[code.var], null);
  }

  /**
   * Return can be used to exit the script early.  If the script returns
   * `false` then the experiment will be marked as disabled.
   */
  return(code: PlanOutCodeUnaryOp) {
    return this.evalCode(code.value);
  }

  round(code: PlanOutCodeUnaryOp) {
    const roundImpl = (param: PlanOutParameter): PlanOutParameter => {
      if (typeof param === "number") return Math.round(param);
      if (typeof param === "object") {
        if (param.type === "integer") return param;
        if (param.type === "float")
          return {
            type: "integer",
            min: Math.round(param.min),
            max: Math.round(param.max)
          };
        if (param.type === "select") {
          return {
            type: "select",
            limit: param.limit,
            values: param.values.map(roundImpl)
          };
        }
        if (param.type === "union") {
          return {
            type: "union",
            variants: param.variants.map(roundImpl)
          };
        }
      }
      return param;
    };
    return roundImpl(this.evalCode(code));
  }

  bernoulliFilter(code: PlanOutCodeRandomFilterOp): PlanOutParameter {
    const choices = this.evalCode(code.choices);
    if (choices && typeof choices === "object" && choices.type === "array") {
      return {
        type: "select",
        limit: choices.values.length,
        values: choices.values
      };
    }
    return null;
  }

  bernoulliTrial(code: PlanOutCodeRandomTrialOp): PlanOutParameter {
    return { type: "select", limit: 1, values: [0, 1] };
  }

  randomFloat(code: PlanOutCodeRandomRangeOp): PlanOutParameter {
    const min = this.evalCode(code.min);
    const max = this.evalCode(code.max);
    if (typeof min === "number" && typeof max === "number") {
      return { type: "float", min, max };
    }
    return null;
  }

  randomInteger(code: PlanOutCodeRandomRangeOp): PlanOutParameter {
    const min = this.evalCode(code.min);
    const max = this.evalCode(code.max);
    if (typeof min === "number" && typeof max === "number") {
      return { type: "integer", min, max };
    }
    return null;
  }

  sample(code: PlanOutCodeSampleOp): PlanOutParameter {
    const choices = this.evalCode(code.choices);
    const numDraws = this.evalCode(code.draws);
    if (
      choices &&
      typeof choices === "object" &&
      choices.type === "array" &&
      typeof numDraws === "number"
    ) {
      return {
        type: "select",
        limit: numDraws,
        values: choices.values
      };
    }
    return null;
  }

  uniformChoice(code: PlanOutCodeUniformChoiceOp): PlanOutParameter {
    const choices = this.evalCode(code.choices);
    if (choices && typeof choices === "object" && choices.type === "array") {
      return {
        type: "select",
        limit: 1,
        values: choices.values
      };
    }
    return null;
  }

  weightedChoice(code: PlanOutCodeWeightedChoiceOp): PlanOutParameter {
    const choices = this.evalCode(code.choices);
    if (choices && typeof choices === "object" && choices.type === "array") {
      return {
        type: "select",
        limit: 1,
        values: choices.values
      };
    }
    return null;
  }
}
