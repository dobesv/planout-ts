import experiment from "../src/experiment";
import { compile } from "../src";

describe("experiment", () => {
  const generateChoices = () => {
    const exp = experiment("generateChoices");
    const count = exp.randomInteger(1, 50, String("test"));
    const generator = exp.uniformChoice(
      [
        (n: number) => String(n),
        (n: number) => n,
        (n: number) => exp.randomInteger(1, 1000, String(n)),
        (n: number) =>
          exp.uniformChoice(
            ["alpha", "beta", "gamma", "delta", "phi"],
            String(n)
          )
      ],
      Date.now()
    );
    const choices: Array<string | number> = [];
    for (let i = 0; i < count; i++) {
      const v = generator(i);
      if (!choices.includes(v)) {
        choices.push(v);
      }
    }
    return choices;
  };
  describe("hash", () => {
    const exp = experiment("hash");
    test("is not negative", () => {
      for (let i = 0; i < 1000; i++) {
        expect(exp.hash(i)).toBeGreaterThanOrEqual(0);
      }
    });
    test("is integer", () => {
      for (let i = 0; i < 1000; i++) {
        const hash = exp.hash(String(i));
        const integerHash = Math.floor(hash);
        expect(hash).toBe(integerHash);
      }
    });
    test("does not repeat", () => {
      const found: { [k: string]: boolean } = {};
      for (let i = 0; i < 1000; i++) {
        const hash = exp.hash(String(i));
        found[hash] = true;
      }
      expect(Object.keys(found)).toHaveLength(1000);
    });
  });
  describe("zeroToOne", () => {
    const exp = experiment("zeroToOne");
    test("is not negative", () => {
      for (let i = 0; i < 1000; i++) {
        expect(exp.zeroToOne(String(i))).toBeGreaterThanOrEqual(0);
      }
    });
    test("is not greater than 1", () => {
      for (let i = 0; i < 1000; i++) {
        expect(exp.zeroToOne(String(i))).toBeLessThanOrEqual(1);
      }
    });
    test("does not repeat", () => {
      const found: { [k: string]: boolean } = {};
      for (let i = 0; i < 1000; i++) {
        const hash = String(exp.zeroToOne(String(i)));
        found[hash] = true;
      }
      expect(Object.keys(found)).toHaveLength(1000);
    });
  });
  describe("randomInteger(0, 10000)", () => {
    const exp = experiment("randomInteger");
    test("is not negative", () => {
      for (let i = 0; i < 1000; i++) {
        expect(exp.randomInteger(0, 1000, String(i))).toBeGreaterThanOrEqual(0);
      }
    });
    test("is not greater than 10000", () => {
      for (let i = 0; i < 10000; i++) {
        expect(exp.randomInteger(0, 1000, String(i))).toBeLessThanOrEqual(
          10000
        );
      }
    });
    test("does not repeat", () => {
      const found: { [k: string]: boolean } = {};
      const count = 10;
      for (let i = 0; i < count; i++) {
        const hash = String(exp.randomInteger(0, 10000, String(i)));
        found[hash] = true;
      }
      expect(Object.keys(found)).toHaveLength(count);
    });
  });
  describe("randomInteger(3, 7)", () => {
    const exp = experiment("randomInteger");
    test("is not less than 3", () => {
      for (let i = 0; i < 100; i++) {
        expect(exp.randomInteger(3, 7, String(i))).toBeGreaterThanOrEqual(3);
      }
    });
    test("is not greater than 7", () => {
      for (let i = 0; i < 100; i++) {
        expect(exp.randomInteger(3, 7, String(i))).toBeLessThanOrEqual(7);
      }
    });
  });
  describe("randomInteger(-1000, 1000)", () => {
    const exp = experiment("randomInteger");
    test("is not less than -1000", () => {
      for (let i = 0; i < 1000; i++) {
        expect(
          exp.randomInteger(-1000, 1000, String(i))
        ).toBeGreaterThanOrEqual(-1000);
      }
    });
    test("is not greater than 1000", () => {
      for (let i = 0; i < 1000; i++) {
        expect(exp.randomInteger(-1000, 1000, String(i))).toBeLessThanOrEqual(
          1000
        );
      }
    });
    test("returns a different value each time (in general)", () => {
      const found: { [k: string]: boolean } = {};
      const count = 5;
      for (let i = 0; i < count; i++) {
        const hash = String(exp.randomInteger(-1000, 1000, String(i)));
        found[hash] = true;
      }
      expect(Object.keys(found)).toHaveLength(count);
    });
  });
  describe("randomFloat(0, 1000)", () => {
    const exp = experiment("randomFloat");
    test("is not negative", () => {
      for (let i = 0; i < 1000; i++) {
        expect(exp.randomFloat(0, 1000, String(i))).toBeGreaterThanOrEqual(0);
      }
    });
    test("is not greater than 1000", () => {
      for (let i = 0; i < 1000; i++) {
        expect(exp.randomFloat(0, 1000, String(i))).toBeLessThanOrEqual(1000);
      }
    });
    test("does not repeat", () => {
      const found: { [k: string]: boolean } = {};
      for (let i = 0; i < 10; i++) {
        const hash = String(exp.randomFloat(0, 1000, String(i)));
        found[hash] = true;
      }
      expect(Object.keys(found)).toHaveLength(10);
    });
  });
  describe("randomFloat(-1000, 1000)", () => {
    const exp = experiment("randomFloat");
    test("is not less than -1000", () => {
      for (let i = 0; i < 1000; i++) {
        expect(exp.randomFloat(-1000, 1000, String(i))).toBeGreaterThanOrEqual(
          -1000
        );
      }
    });
    test("is not greater than 1000", () => {
      for (let i = 0; i < 1000; i++) {
        expect(exp.randomFloat(-1000, 1000, String(i))).toBeLessThanOrEqual(
          1000
        );
      }
    });
    test("does not repeat", () => {
      const found: { [k: string]: boolean } = {};
      const count = 10;
      for (let i = 0; i < count; i++) {
        const hash = String(exp.randomFloat(-1000, 1000, String(i)));
        found[hash] = true;
      }
      expect(Object.keys(found)).toHaveLength(count);
    });
  });
  describe("uniformChoice([1,3,5,7,9])", () => {
    const exp = experiment("uniformChoice");
    const choices = generateChoices();
    test("always returns one of the array elements", () => {
      for (let i = 0; i < choices.length; i++) {
        expect(choices.includes(exp.uniformChoice(choices, String(i)))).toBe(
          true
        );
      }
    });
    test("eventually returns every element", () => {
      const found: { [k: string]: boolean } = {};
      for (let i = 0; i < choices.length * 10; i++) {
        const choice = String(exp.uniformChoice(choices, String(i)));
        found[choice] = true;
      }
      expect(Object.keys(found)).toHaveLength(choices.length);
    });
    test("returns elements in uniform frequency", () => {
      const found: { [k: string]: number } = {};
      const count = choices.length * 1000;
      for (let i = 0; i < count; i++) {
        const choice = String(exp.uniformChoice(choices, String(i)));
        found[choice] = (found[choice] || 0) + 1;
      }
      for (let i = 0; i < choices.length; i++) {
        const choice = choices[i];
        const frequency = found[choice] / count;
        expect(frequency).toBeCloseTo(1 / choices.length, 1);
      }
    });
  });
  describe("weightedChoice([1,3,5,7,9], [1,2,1,2,1])", () => {
    const exp = experiment("weightedChoice");
    const choices = generateChoices();
    const weights = choices.map(ch =>
      exp.randomInteger(1, choices.length, String(ch))
    );
    test("always returns one of the array elements", () => {
      for (let i = 0; i < choices.length * 10; i++) {
        expect(
          choices.includes(exp.weightedChoice(choices, weights, String(i)))
        ).toBe(true);
      }
    });
    test("eventually returns every element", () => {
      const found: { [k: string]: boolean } = {};
      for (let i = 0; i < choices.length * 100; i++) {
        const choice = String(exp.weightedChoice(choices, weights, String(i)));
        found[choice] = true;
      }
      expect(Object.keys(found)).toHaveLength(choices.length);
    });
    test("returns elements in frequency similar to their weight", () => {
      const found: { [k: string]: number } = {};
      const count = choices.length * 1000;
      for (let i = 0; i < count; i++) {
        const choice = String(exp.weightedChoice(choices, weights, String(i)));
        found[choice] = (found[choice] || 0) + 1;
      }
      const totalWeights = weights.reduce((s, w) => s + w);
      for (let i = 0; i < choices.length; i++) {
        const weight = weights[i];
        const choice = choices[i];
        const frequency = found[choice] / count;
        expect(frequency).toBeCloseTo(weight / totalWeights, 1);
      }
    });
  });
  describe("sample", () => {
    const exp = experiment("sample");
    const choices = generateChoices();
    test("always returns a subset of the given array", () => {
      for (let i = 0; i < choices.length * 10; i++) {
        const samples = exp.sample(
          choices,
          exp.randomInteger(1, choices.length - 1, String(choices.length)),
          String(i)
        );
        expect(samples.filter(sample => choices.includes(sample))).toEqual(
          samples
        );
      }
    });
    test("returns the number of elements specified", () => {
      for (let i = 0; i < choices.length * 10; i++) {
        const numDraws = exp.randomInteger(
          1,
          choices.length,
          String(choices.length)
        );
        const samples = exp.sample(choices, numDraws, String(i));
        expect(samples).toHaveLength(numDraws);
      }
    });
    test("returns a shuffled choices array when num draws is greater or equal to number of choices", () => {
      const numDraws =
        choices.length +
        exp.randomInteger(0, choices.length, String(choices.length));
      const samples = exp.sample(choices, numDraws, String(numDraws));
      expect(samples).toHaveLength(choices.length);
    });
    test("returns a variety of permutations of the input", () => {
      const found: { [k: string]: number } = {};
      for (let i = 0; i < choices.length * 500; i++) {
        const numDraws = exp.randomInteger(
          1,
          choices.length,
          String(choices.length)
        );
        const samples = exp.sample(choices, numDraws, String(i));
        const values = samples.join("::");
        found[values] = (found[values] || 0) + 1;
      }
      expect(Object.keys(found).length).toBeGreaterThanOrEqual(choices.length);
    });
  });
  describe("bernoulliFilter", () => {
    const exp = experiment("bernoulliFilter");
    const choices = generateChoices();
    test("only returns elements from the choices given", () => {
      for (let i = 0; i < choices.length * 10; i++) {
        let p = exp.zeroToOne(String(choices.length));
        const samples = exp.bernoulliFilter(choices, p, String(i));
        expect(samples.filter(sample => choices.includes(sample))).toEqual(
          samples
        );
      }
    });
    test("returns a variety of permutations of the input", () => {
      const found: { [k: string]: number } = {};
      for (let i = 0; i < choices.length * 100; i++) {
        const p = exp.zeroToOne(String(choices.length));
        const samples = exp.bernoulliFilter(choices, p, String(i));
        const values = samples.join("::");
        found[values] = (found[values] || 0) + 1;
      }
      expect(Object.keys(found).length).toBeGreaterThanOrEqual(choices.length);
    });
  });
  describe("bernoulliTrial", () => {
    const exp = experiment("bernoulliTrial");
    test("returns zero or one", () => {
      for (let i = 0; i < 100; i++) {
        const p = exp.zeroToOne(i);
        const v = exp.bernoulliTrial(p, i);
        expect(v === 1 || v === 0).toBe(true);
      }
    });
    test("returns zeroes and one with the expected distribution", () => {
      for (const p of [0, 1, exp.zeroToOne(2)]) {
        let counts = [0, 0];
        const iterations = 10000;
        for (let i = 0; i < iterations; i++) {
          const v = exp.bernoulliTrial(p, i);
          counts[v] += 1;
        }
        if (p === 0) {
          expect(counts[1]).toBe(0);
          expect(counts[0]).toBe(10000);
        } else if (p === 1) {
          expect(counts[0]).toBe(0);
          expect(counts[1]).toBe(10000);
        } else {
          expect(counts[1] / iterations).toBeCloseTo(p);
          expect(counts[0] / iterations).toBeCloseTo(1 - p, 1);
        }
      }
    });
  });
  describe("get", () => {
    const exp = experiment("get", { foo: "bar", n: null });
    test("gets a value", () => expect(exp.get("foo", "def")).toBe("bar"));
    test("uses default if no value", () =>
      expect(exp.get("non-existant", "def")).toBe("def"));
    test("uses a default if value null", () =>
      expect(exp.get("n", "def")).toBe("def"));
  });
});
