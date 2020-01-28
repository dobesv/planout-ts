import sha1 from "sha1";
import flattenDeep from "lodash/flattenDeep";
import { PlanOutCodeValue } from "./PlanOutCode";
import defaultTo from "lodash/defaultTo";

export type SaltType = PlanOutCodeValue;
export type EnvironmentType = { [k: string]: PlanOutCodeValue | undefined };

export class PlanOutExperiment {
  name: string;
  environment: EnvironmentType;

  constructor(name: string, environment: EnvironmentType = null) {
    this.name = name;
    this.environment = Object.create(environment);
  }

  /**
   * Can be set to false if the experiment should not be run.  If the experiment
   * is not disabled, the hash is also set to zero.
   */
  enabled: boolean = true;

  /**
   * A number between 0 and 0xFFFFFFFFFFFFF calculated from the experiment salt and optionally
   * the provided extra salt.
   *
   * Set to zero if the experiment is disabled.
   *
   * @param salt Used to get different values from multiple calls to the same experiment, for A/B tests
   *     this would be the user's client ID or user ID
   */
  hash(salt: SaltType): number {
    if (!this.enabled) return 0;
    return parseInt(
      sha1(flattenDeep([this.name, salt]).join(".")).slice(0, 13),
      16
    );
  }

  /**
   * Get a value from the environment.
   *
   * Typically these will have been set by a planout script
   *
   * @param name Variable name
   * @param def Default value if the value could not be found
   */
  get(name: string, def: PlanOutCodeValue = null): PlanOutCodeValue {
    return defaultTo(this.environment[name], def);
  }

  /**
   * Store a value into the environment
   *
   * Normally this is just used by the planout code interpreter
   * for its assignments.
   *
   * @param name Variable name
   * @param value Value to save
   */
  set(name: string, value: PlanOutCodeValue): void {
    this.environment[name] = value;
  }

  /**
   * Remove a variable from the environment.
   *
   * @param name Variable name
   */
  del(name: string): void {
    this.environment[name] = undefined;
  }

  /**
   * Mark the experiment as disabled.
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Get a number between zero and one.
   *
   * If this experiment is disabled, this always returns zero.
   *
   * @param salt Used to get different values from multiple calls to the same experiment
   */
  zeroToOne(salt: SaltType): number {
    return this.hash(salt) / 0xfffffffffffff;
  }

  /**
   * Select an integer between minVal and maxVal (inclusive).
   *
   * If this experiment is disabled, this always returns minVal.
   *
   * @param minVal Minimum value to return
   * @param maxVal Maximum value to return
   * @param salt Used to get different values from multiple calls to the same experiment
   */
  randomInteger(minVal: number, maxVal: number, salt: SaltType): number {
    return minVal + (this.hash(salt) % (maxVal - minVal + 1));
  }

  /**
   * Select a floating point number between minVal and maxVal (inclusive).
   *
   * If this experiment is disabled, this always returns minVal.
   *
   * @param minVal Minimum value to return
   * @param maxVal Maximum value to return
   * @param salt Used to get different values from multiple calls to the same experiment
   */
  randomFloat(minVal: number, maxVal: number, salt: SaltType): number {
    return minVal + this.zeroToOne(salt) * (maxVal - minVal);
  }

  /**
   * Select an array element
   *
   * If this experiment is disabled, this always returns the first array element.
   *
   * @param choices Available options
   * @param salt Used to get different values from multiple calls to the same experiment
   */
  uniformChoice<U>(choices: U[], salt: SaltType): U {
    if (choices.length === 0)
      throw new Error("Must provide a non-empty choices list");
    const index = this.randomInteger(0, choices.length - 1, salt);
    return choices[index];
  }

  /**
   * Select an array element with a weighted distribution
   *
   * If this experiment is disabled, this always returns the first array element.
   *
   * @param choices Available options
   * @param weights Weight values for each option
   * @param salt Used to get different values from multiple calls to the same experiment
   */
  weightedChoice<U>(choices: U[], weights: number[], salt: SaltType): U {
    let len = choices.length;
    if (len === 0) throw new Error("Must provide a non-empty choices list");
    if (weights.length !== len)
      throw new Error(
        "Weights array must have the same number of elements as choices"
      );
    const totalWeight = weights.reduce((sum, w) => sum + w);
    const targetWeight = this.randomFloat(0, totalWeight, salt);
    for (let i = 0, j = 0; i < len; i++) {
      j += weights[i];
      if (j >= targetWeight) {
        return choices[i];
      }
    }
  }

  /**
   * Randomly select up to numDraws elements from the list of choices.
   *
   * Always returns an empty array if the experiment is disabled.
   *
   * @param choices Options to choose from
   * @param numDraws Number of elements to select; default is all elements (just shuffling the order of the input)
   * @param salt Used to get different values from multiple calls to the same experiment
   */
  sample<U>(
    choices: U[],
    numDraws: number = choices.length,
    salt: SaltType
  ): U[] {
    const array = [...choices];
    const len = array.length;
    const stoppingPoint = Math.max(0, len - numDraws);
    for (let i = len - 1; i > stoppingPoint; i--) {
      const j = this.randomInteger(0, i - 1, [salt, i]);

      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array.slice(stoppingPoint, len);
  }

  /**
   * Randomly select elements from an array using bournoulli filter.
   *
   * Always returns an empty array if the experiment is disabled.
   *
   * @param choices Array to pick from
   * @param p Probably of including any given element
   * @param salt Used to get different values from multiple calls to the same experiment
   */
  bernoulliFilter<U>(choices: U[], p: number, salt: SaltType): U[] {
    if (p < 0 || p > 1) {
      throw new Error("Invalid probability");
    }
    if (choices.length == 0) {
      throw new Error("Choices must not be empty!");
    }
    return choices.filter((v, index) => this.zeroToOne([salt, index]) < p);
  }

  /**
   * Choose 1 with a probably of p, otherwise 0.
   *
   * Always returns zero if the experiment is disabled.
   *
   * @param p Probably of yielding a 1
   * @param salt Used to get different values from multiple calls to the same experiment
   */
  bernoulliTrial(p: number, salt: SaltType): number {
    if (p < 0 || p > 1) {
      throw new Error("Invalid probability");
    }
    return this.zeroToOne(salt) < p ? 1 : 0;
  }
}
