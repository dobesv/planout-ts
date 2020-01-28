import { compile, inspect } from "../src";
import { booleanParameter } from "../src/PlanOutParameterGatherer";

describe("inspect", () => {
  test("Allows setting a variable", () => {
    expect(inspect(compile("out = 1;")).parameters).toMatchObject({ out: 1 });
  });
  test("Allows setting a variable from another variable", () => {
    expect(
      inspect(compile("out = anInt;"), {
        anInt: 1
      }).parameters
    ).toMatchObject({ out: 1 });
  });
  test("Supports uniformChoice", () => {
    expect(
      inspect(
        compile(`
          a = uniformChoice(choices=['a', 'b'], unit=1);
          b = uniformChoice(choices=['aaa', 'bbb'], unit=4);
        `)
      ).parameters
    ).toMatchObject({
      a: {
        type: "select",
        limit: 1,
        values: ["a", "b"]
      },
      b: {
        type: "select",
        limit: 1,
        values: ["aaa", "bbb"]
      }
    });
  });
  test("Supports weightedChoice", () => {
    expect(
      inspect(
        compile(`
          a = weightedChoice(choices=['a', 'b'], weights=[1,5], unit=111);
          b = weightedChoice(choices=['aaa', 'bbb'], weights=[2,1], unit=4);
        `)
      ).parameters
    ).toMatchObject({
      a: {
        type: "select",
        limit: 1,
        values: ["a", "b"]
      },
      b: {
        type: "select",
        limit: 1,
        values: ["aaa", "bbb"]
      }
    });
  });
  test("Supports conditionals", () => {
    expect(
      inspect(
        compile(`
      if(1 == 0) { 
        a = 1;
        q = uniformChoice(choices=['A', 'B']);
        r = weightedChoice(choices=[1, 2], weights=[1, 2]);
        s = sample(choices=['A', 'B', 'C'], draws=2);
      } else {
        a = 2;
        q = uniformChoice(choices=['C', 'D']);
        r = uniformChoice(choices=[1, 2, 3, 4]);
        s = sample(choices=['A', 'B', 'C'], draws=3);
      }
      t = r * 2;
      tt = 2 * r;
      ttt = 2 * r + 1;
      b = 3;`)
      ).parameters
    ).toMatchObject({
      a: { type: "union", variants: [1, 2] },
      b: 3,
      q: { type: "select", limit: 1, values: ["A", "B", "C", "D"] },
      r: { type: "select", limit: 1, values: [1, 2, 3, 4] },
      s: {
        type: "union",
        variants: [
          { type: "select", limit: 2, values: ["A", "B", "C"] },
          { type: "select", limit: 3, values: ["A", "B", "C"] }
        ]
      },
      t: { type: "select", limit: 1, values: [2, 4, 6, 8] },
      tt: { type: "select", limit: 1, values: [2, 4, 6, 8] },
      ttt: { type: "select", limit: 1, values: [3, 5, 7, 9] }
    });
  });
  test("Supports arithmetic", () => {
    expect(
      inspect(
        compile(
          "sum = 1 + 2; difference = 17 - 4; product = 2 * 3; quotient = 12 / 4; modulo = 15 % 6;"
        )
      ).parameters
    ).toMatchObject({
      sum: 3,
      difference: 13,
      product: 6,
      quotient: 3,
      modulo: 3
    });
  });
  test("Supports comparisons", () => {
    expect(
      inspect(
        compile(
          "lt = 3 < 5 ; nlt = 5 < 3 ; lte = 3 <= 3 ; nlte = 5 <= 0 ; gt = 5 > 3;ngt = 5 > 10; gte = 5 >= 5; ngte= -1 >= 0;"
        )
      ).parameters
    ).toMatchObject({
      lt: booleanParameter,
      lte: booleanParameter,
      gt: booleanParameter,
      gte: booleanParameter,
      nlt: booleanParameter,
      nlte: booleanParameter,
      ngt: booleanParameter,
      ngte: booleanParameter
    });
  });
  test("Supports logical operators", () => {
    expect(
      inspect(
        compile(
          "a1=true&&true;a2=true&&false;a3=false&&true;o1=true||false;o2=false||true;o3=false||false;n1=!true;n2=!false;"
        )
      ).parameters
    ).toMatchObject({
      a1: booleanParameter,
      a2: booleanParameter,
      a3: booleanParameter,
      o1: booleanParameter,
      o2: booleanParameter,
      o3: booleanParameter,
      n1: booleanParameter,
      n2: booleanParameter
    });
  });
});
