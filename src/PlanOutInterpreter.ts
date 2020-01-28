import { PlanOutExperiment } from "./PlanOutExperiment";
import {
  PlanOutCode,
  PlanOutCodeArrayOp,
  PlanOutCodeBinaryOp,
  PlanOutCodeCommutativeOp,
  PlanOutCodeCondOp,
  PlanOutCodeGetOp,
  PlanOutCodeLiteralOp,
  PlanOutCodeRandomFilterOp,
  PlanOutCodeRandomRangeOp,
  PlanOutCodeRandomTrialOp,
  PlanOutCodeSampleOp,
  PlanOutCodeSeqOp,
  PlanOutCodeSetOp,
  PlanOutCodeUnaryOp,
  PlanOutCodeUniformChoiceOp,
  PlanOutCodeValue,
  PlanOutCodeWeightedChoiceOp
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
    if (!impl) throw new Error(`Unsupported op: ${op}`);
    return impl.call(this, code);
  }

  evalNum(code: PlanOutCode): number {
    const result = this.evalCode(code);
    if (typeof result !== "number") {
      throw new Error("Invalid operand");
    }
    return result;
  }

  evalBool(code: PlanOutCode): boolean {
    const result = this.evalCode(code);
    return !!result;
  }

  evalArray(code: PlanOutCode): PlanOutCodeValue[] {
    const result = this.evalCode(code);
    if (!Array.isArray(result)) {
      throw new Error(`Expected array operand, got ${result}`);
    }
    return result;
  }

  evalNumArray(values: PlanOutCode) {
    const ary = this.evalArray(values);
    if (!ary.every(n => typeof n === "number"))
      throw new Error(`Expected an array of only numbers, got ${ary}`);
    return ary as number[];
  }

  evalString(code: PlanOutCode): string {
    return String(this.evalCode(code));
  }

  literal(code: PlanOutCodeLiteralOp) {
    return code.value;
  }

  array(code: PlanOutCodeArrayOp) {
    return code.values.map(value => this.evalCode(value));
  }

  "%"(code: PlanOutCodeBinaryOp) {
    return this.evalNum(code.left) % this.evalNum(code.right);
  }

  "-"(code: PlanOutCodeBinaryOp) {
    return this.evalNum(code.left) - this.evalNum(code.right);
  }

  "/"(code: PlanOutCodeBinaryOp) {
    return this.evalNum(code.left) / this.evalNum(code.right);
  }

  "<"(code: PlanOutCodeBinaryOp) {
    return this.evalNum(code.left) < this.evalNum(code.right);
  }

  "<="(code: PlanOutCodeBinaryOp) {
    return this.evalNum(code.left) <= this.evalNum(code.right);
  }

  ">"(code: PlanOutCodeBinaryOp) {
    return this.evalNum(code.left) > this.evalNum(code.right);
  }

  ">="(code: PlanOutCodeBinaryOp) {
    return this.evalNum(code.left) >= this.evalNum(code.right);
  }

  negative(code: PlanOutCodeUnaryOp) {
    return -this.evalNum(code.value);
  }

  equals(code: PlanOutCodeBinaryOp) {
    return this.evalNum(code.left) === this.evalNum(code.right);
  }

  and(code: PlanOutCodeCommutativeOp) {
    return code.values
      .map(arg => this.evalBool(arg))
      .reduce((p: boolean, v: boolean) => p && v, true);
  }

  or(code: PlanOutCodeCommutativeOp) {
    return code.values
      .map(arg => this.evalBool(arg))
      .reduce((p: boolean, v: boolean) => p || v, false);
  }

  length(code: PlanOutCodeUnaryOp) {
    return this.evalArray(code.value).length;
  }

  not(code: PlanOutCodeUnaryOp) {
    return !this.evalBool(code.value);
  }

  max(code: PlanOutCodeCommutativeOp) {
    return Math.max(...code.values.map(arg => this.evalNum(arg)));
  }

  min(code: PlanOutCodeCommutativeOp) {
    return Math.min(...code.values.map(arg => this.evalNum(arg)));
  }

  product(code: PlanOutCodeCommutativeOp) {
    return code.values
      .map(arg => this.evalNum(arg))
      .reduce((p: number, v: number) => (typeof v === "number" ? p * v : p));
  }

  sum(code: PlanOutCodeCommutativeOp) {
    return code.values
      .map(arg => this.evalNum(arg))
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
    return Math.round(this.evalNum(code.value));
  }

  bernoulliFilter(code: PlanOutCodeRandomFilterOp) {
    return this.experiment.bernoulliFilter(
      this.evalArray(code.choices),
      this.evalNum(code.p),
      this.evalString(code.unit)
    );
  }

  bernoulliTrial(code: PlanOutCodeRandomTrialOp) {
    return this.experiment.bernoulliTrial(
      this.evalNum(code.p),
      this.evalString(code.unit)
    );
  }

  randomFloat(code: PlanOutCodeRandomRangeOp) {
    return this.experiment.randomFloat(
      this.evalNum(code.min),
      this.evalNum(code.max),
      this.evalString(code.unit)
    );
  }

  randomInteger(code: PlanOutCodeRandomRangeOp) {
    return this.experiment.randomInteger(
      this.evalNum(code.min),
      this.evalNum(code.max),
      this.evalString(code.unit)
    );
  }

  sample(code: PlanOutCodeSampleOp) {
    return this.experiment.sample(
      this.evalArray(code.choices),
      this.evalNum(code.draws),
      this.evalCode(code.unit)
    );
  }

  uniformChoice(code: PlanOutCodeUniformChoiceOp) {
    return this.experiment.uniformChoice(
      this.evalArray(code.choices),
      this.evalString(code.unit)
    );
  }

  weightedChoice(code: PlanOutCodeWeightedChoiceOp) {
    return this.experiment.weightedChoice(
      this.evalArray(code.choices),
      this.evalNumArray(code.weights),
      this.evalString(code.unit)
    );
  }
}
