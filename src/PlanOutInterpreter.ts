import { PlanOutExperiment, SaltType } from "./PlanOutExperiment";
import {
  PlanOutCode,
  PlanOutCodeArrayOp,
  PlanOutCodeBinaryOp,
  PlanOutCodeCommutativeOp,
  PlanOutCodeCondOp,
  PlanOutCodeGetOp,
  PlanOutCodeIncludesOp,
  PlanOutCodeIndexOp,
  PlanOutCodeLiteralOp,
  PlanOutCodeOp,
  PlanOutCodeRandomFilterOp,
  PlanOutCodeRandomRangeOp,
  PlanOutCodeRandomTrialOp,
  PlanOutCodeSampleOp,
  PlanOutCodeSeqOp,
  PlanOutCodeSetOp,
  PlanOutCodeUnaryOp,
  PlanOutCodeUniformChoiceOp,
  PlanOutCodeValue,
  PlanOutCodeWeightedChoiceOp,
} from "./PlanOutCode";

export class PlanOutInterpreter {
  experiment: PlanOutExperiment;
  returned: boolean = false;

  constructor(experiment: PlanOutExperiment) {
    this.experiment = experiment;
  }

  execute(code: PlanOutCode) {
    this.evalCode(code);
  }

  evalCode(code: PlanOutCode) {
    if (this.returned) {
      return null;
    }
    if (code === null || code === undefined) {
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
    if (!impl) throw new Error(`Unsupported op: ${op}`);
    return impl.call(this, code);
  }

  evalNumArg<T extends PlanOutCodeOp>(code: T, name: string & keyof T): number {
    return this.evalNum(code.op, name, code[name] as any);
  }

  evalNum(op: string, param: string, code: PlanOutCode): number {
    const result = this.evalCode(code);
    if (result instanceof Date) {
      return +result;
    }
    if (typeof result !== "number") {
      throw new Error(`${op} ${param}: expected number but got ${result}`);
    }
    return result;
  }

  evalBool(code: PlanOutCode): boolean {
    const result = this.evalCode(code);
    return !!result;
  }

  evalComparableArg<T extends PlanOutCodeOp>(
    code: T,
    name: string & keyof T
  ): number | boolean | string | Date {
    return this.evalComparable(code.op, name, code[name] as any);
  }

  evalComparable(
    op: string,
    param: string,
    code: PlanOutCode
  ): number | boolean | string | Date {
    const result = this.evalCode(code);
    if (
      !(
        typeof result === "number" ||
        typeof result === "string" ||
        typeof result === "boolean" ||
        result instanceof Date
      )
    ) {
      throw new Error(
        `${op} ${param}: expected number, Date, string, or boolean but got ${result}`
      );
    }
    return result;
  }

  evalArray(op: string, name: string, code: PlanOutCode): PlanOutCodeValue[] {
    const result = this.evalCode(code);
    if (!Array.isArray(result)) {
      throw new Error(`${op} ${name}: expected array, got ${result}`);
    }
    return result;
  }

  evalArrayArg<T extends PlanOutCodeOp>(
    code: T,
    name: string & keyof T
  ): PlanOutCodeValue[] {
    return this.evalArray(code.op, name, code[name] as any);
  }

  evalNumArray(op: string, name: string, values: PlanOutCode): number[] {
    const ary = this.evalArray(op, name, values);
    if (!ary.every((n) => typeof n === "number"))
      throw new Error(
        `${op} ${name}: expected an array of only numbers, got ${ary}`
      );
    return ary as number[];
  }

  evalNumArrayArg<T extends PlanOutCodeOp>(
    code: T,
    name: string & keyof T
  ): number[] {
    return this.evalNumArray(code.op, name, code[name] as any);
  }

  evalString(code: PlanOutCode): string {
    return String(this.evalCode(code));
  }

  evalSalt(op: string, name: string, code: PlanOutCode): SaltType {
    const val = this.evalCode(code);
    const validateSalt = (v: PlanOutCodeValue) => {
      if (Array.isArray(v)) {
        for (const elt of v) {
          validateSalt(elt);
        }
        if (typeof val === "object") {
          new Error(
            `${op} ${name}: expected a string, boolean, number, or array, got ${val}`
          );
        }
      }
    };
    validateSalt(val);
    return val;
  }

  evalSaltArg<T extends PlanOutCodeOp>(code: T, name: string & keyof T) {
    return this.evalSalt(code.op, name, code[name] as any);
  }

  literal(code: PlanOutCodeLiteralOp) {
    return code.value;
  }

  array(code: PlanOutCodeArrayOp) {
    return code.values.map((value) => this.evalCode(value));
  }

  index(code: PlanOutCodeIndexOp) {
    const base = this.evalCode(code.base);
    if (typeof base !== "object")
      throw new Error("Attempt to index a non-array and non-object");
    const index = this.evalCode(code.index);
    if (Array.isArray(base)) {
      if (typeof index !== "number") {
        throw new Error("Array index is not a number");
      }
    } else if (typeof index !== "string") {
      throw new Error("Object field name is not a string");
    }
    const value = base[index];
    if (typeof value === "function") return null;
    return value;
  }

  evalBinaryOp<T>(
    code: PlanOutCodeBinaryOp,
    fn: (
      a: boolean | number | string | Date,
      b: boolean | number | string | Date
    ) => T,
    evalArg: (
      code: PlanOutCodeBinaryOp,
      name: string & keyof PlanOutCodeBinaryOp
    ) => boolean | number | string | Date
  ): T {
    return fn(evalArg(code, "left"), evalArg(code, "right"));
  }

  evalBinaryNumOp<T>(
    code: PlanOutCodeBinaryOp,
    fn: (a: number, b: number) => T
  ): T {
    return this.evalBinaryOp(code, fn, this.evalNumArg.bind(this));
  }

  evalBinaryComparableOp<T>(
    code: PlanOutCodeBinaryOp,
    fn: (a: number, b: number) => T
  ): T {
    return this.evalBinaryOp(code, fn, this.evalComparableArg.bind(this));
  }

  "%"(code: PlanOutCodeBinaryOp) {
    return this.evalBinaryNumOp(code, (a, b) => a % b);
  }

  "-"(code: PlanOutCodeBinaryOp) {
    return this.evalBinaryNumOp(code, (a, b) => a - b);
  }

  "/"(code: PlanOutCodeBinaryOp) {
    return this.evalBinaryNumOp(code, (a, b) => a / b);
  }

  "<"(code: PlanOutCodeBinaryOp) {
    return this.evalBinaryComparableOp(code, (a, b) => a < b);
  }

  "<="(code: PlanOutCodeBinaryOp) {
    return this.evalBinaryComparableOp(code, (a, b) => a <= b);
  }

  ">"(code: PlanOutCodeBinaryOp) {
    return this.evalBinaryComparableOp(code, (a, b) => a > b);
  }

  ">="(code: PlanOutCodeBinaryOp) {
    return this.evalBinaryComparableOp(code, (a, b) => a >= b);
  }

  negative(code: PlanOutCodeUnaryOp) {
    return -this.evalNumArg(code, "value");
  }

  equals(code: PlanOutCodeBinaryOp) {
    return this.evalBinaryOp(
      code,
      (a, b) => a == b,
      (code, name) => this.evalCode(code[name])
    );
  }

  and(code: PlanOutCodeCommutativeOp) {
    return !code.values.some(arg => !this.evalBool(arg));
  }

  or(code: PlanOutCodeCommutativeOp) {
    return code.values.some(arg => this.evalBool(arg));
  }

  length(code: PlanOutCodeUnaryOp) {
    return this.evalArrayArg(code, "value").length;
  }

  not(code: PlanOutCodeUnaryOp) {
    return !this.evalBool(code.value);
  }

  max(code: PlanOutCodeCommutativeOp) {
    return Math.max(
      ...code.values.map((arg, n) =>
        this.evalNum(code.op, `operand ${n + 1}`, arg)
      )
    );
  }

  min(code: PlanOutCodeCommutativeOp) {
    return Math.min(
      ...code.values.map((arg, n) =>
        this.evalNum(code.op, `operand ${n + 1}`, arg)
      )
    );
  }

  product(code: PlanOutCodeCommutativeOp) {
    return code.values
      .map((arg, n) => this.evalNum(code.op, `operand ${n + 1}`, arg))
      .reduce((p: number, v: number) => (typeof v === "number" ? p * v : p));
  }

  sum(code: PlanOutCodeCommutativeOp) {
    return code.values
      .map((arg, n) => this.evalNum(code.op, `operand ${n + 1}`, arg))
      .reduce((p: number, v: number) => (typeof v === "number" ? p + v : p));
  }

  /**
   * if/then conditional expression
   */
  cond(code: PlanOutCodeCondOp) {
    for (const clause of code.cond) {
      const predicate = this.evalBool(clause.if);
      if (predicate) {
        return this.evalCode(clause.then);
      }
    }
    return null;
  }

  /**
   * Run side-effectful expressions one after the other.
   */
  seq(code: PlanOutCodeSeqOp) {
    let returnValue = null;
    for (const step of code.seq) {
      if (this.returned) {
        break;
      }
      returnValue = this.evalCode(step);
    }
    return returnValue;
  }

  /**
   * Assign a value
   */
  set(code: PlanOutCodeSetOp) {
    const value = this.evalCode(code.value);
    this.experiment.set(code.var, value);
    return value;
  }

  /**
   * Get an input or a previously assigned value
   */
  get(code: PlanOutCodeGetOp) {
    return this.experiment.get(code.var);
  }

  /**
   * Return can be used to exit the script early.  If the script returns
   * `false` then the experiment will be marked as disabled.
   */
  return(code: PlanOutCodeUnaryOp) {
    let returnValue = this.evalCode(code.value);
    this.returned = true;
    if (returnValue === false) {
      this.experiment.disable();
    }
    return returnValue;
  }

  round(code: PlanOutCodeUnaryOp) {
    return Math.round(this.evalNumArg(code, "value"));
  }

  bernoulliFilter(code: PlanOutCodeRandomFilterOp) {
    return this.experiment.bernoulliFilter(
      this.evalArrayArg(code, "choices"),
      this.evalNumArg(code, "p"),
      this.evalSaltArg(code, "unit")
    );
  }

  bernoulliTrial(code: PlanOutCodeRandomTrialOp) {
    return this.experiment.bernoulliTrial(
      this.evalNumArg(code, "p"),
      this.evalSaltArg(code, "unit")
    );
  }

  randomFloat(code: PlanOutCodeRandomRangeOp) {
    return this.experiment.randomFloat(
      this.evalNumArg(code, "min"),
      this.evalNumArg(code, "max"),
      this.evalSaltArg(code, "unit")
    );
  }

  randomInteger(code: PlanOutCodeRandomRangeOp) {
    return this.experiment.randomInteger(
      this.evalNumArg(code, "min"),
      this.evalNumArg(code, "max"),
      this.evalSaltArg(code, "unit")
    );
  }

  sample(code: PlanOutCodeSampleOp) {
    return this.experiment.sample(
      this.evalArrayArg(code, "choices"),
      this.evalNumArg(code, "draws"),
      this.evalSaltArg(code, "unit")
    );
  }

  uniformChoice(code: PlanOutCodeUniformChoiceOp) {
    return this.experiment.uniformChoice(
      this.evalArrayArg(code, "choices"),
      this.evalSaltArg(code, "unit")
    );
  }

  weightedChoice(code: PlanOutCodeWeightedChoiceOp) {
    return this.experiment.weightedChoice(
      this.evalArrayArg(code, "choices"),
      this.evalNumArrayArg(code, "weights"),
      this.evalSaltArg(code, "unit")
    );
  }
  includes(code: PlanOutCodeIncludesOp) {
    return this.evalArrayArg(code, "collection").includes(
      this.evalCode(code.value)
    );
  }
}
