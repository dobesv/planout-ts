import { compile, execute } from "../src";

describe("execute", () => {
  test("Allows setting a variable", () => {
    expect(execute("evalCode", compile("out = 1;")).get("out", 0)).toBe(1);
  });
  test("Allows setting a variable from another variable", () => {
    expect(
      execute("evalCode", compile("out = anInt;"), {
        anInt: 1
      }).get("out", 0)
    ).toBe(1);
  });
  test("Marks experiment disabled if script returns false", () => {
    const exp = execute("evalCode", compile("return false;"));
    expect(exp.enabled).toBe(false);
    expect(exp.hash(1)).toBe(0);
  });
  test("Supports return true", () => {
    const exp = execute("evalCode", compile("return true;\nreturn false;"));
    expect(exp.enabled).toBe(true);
  });
  test("Supports uniformChoice", () => {
    const exp = execute(
      "evalCode",
      compile(`
          a = uniformChoice(choices=['a', 'b'], unit=1);
          b = uniformChoice(choices=['aaa', 'bbb'], unit=4);
        `)
    );
    expect(exp.get("a", "")).toBe("a");
    expect(exp.get("b", "")).toBe("bbb");
  });
  test("Supports weightedChoice", () => {
    const exp = execute(
      "evalCode",
      compile(`
          a = weightedChoice(choices=['a', 'b'], weights=[1,5], unit=111);
          b = weightedChoice(choices=['aaa', 'bbb'], weights=[2,1], unit=4);
        `)
    );
    expect(exp.get("a", "")).toBe("a");
    expect(exp.get("b", "")).toBe("aaa");
  });
  test("Supports conditionals", () => {
    const exp = execute(
      "evalCode",
      compile("if(1 == 0) { a = 1; } else { a = 2; } b = 3;")
    );
    expect(exp.get("a", "")).toBe(2);
    expect(exp.get("b", "")).toBe(3);
  });
  test("Supports arithmetic", () => {
    const exp = execute(
      "evalCode",
      compile(
        "sum = 1 + 2; difference = 17 - 4; product = 2 * 3; quotient = 12 / 4; modulo = 15 % 6;"
      )
    );
    expect(exp.get("sum")).toBe(3);
    expect(exp.get("difference")).toBe(13);
    expect(exp.get("product")).toBe(6);
    expect(exp.get("quotient")).toBe(3);
    expect(exp.get("modulo")).toBe(3);
  });
  test("Supports comparisons", () => {
    const exp = execute(
      "evalCode",
      compile(
        "lt = 3 < 5 ; nlt = 5 < 3 ; lte = 3 <= 3 ; nlte = 5 <= 0 ; gt = 5 > 3;ngt = 5 > 10; gte = 5 >= 5; ngte= -1 >= 0;"
      )
    );
    expect(exp.get("lt")).toBe(true);
    expect(exp.get("lte")).toBe(true);
    expect(exp.get("gt")).toBe(true);
    expect(exp.get("gte")).toBe(true);
    expect(exp.get("nlt")).toBe(false);
    expect(exp.get("nlte")).toBe(false);
    expect(exp.get("ngt")).toBe(false);
    expect(exp.get("ngte")).toBe(false);
  });
  test("Supports logical operators", () => {
    const exp = execute(
      "evalCode",
      compile(
        "a1=true&&true;a2=true&&false;a3=false&&true;o1=true||false;o2=false||true;o3=false||false;n1=!true;n2=!false;"
      )
    );
    expect(exp.get("a1")).toBe(true);
    expect(exp.get("a2")).toBe(false);
    expect(exp.get("a3")).toBe(false);
    expect(exp.get("o1")).toBe(true);
    expect(exp.get("o2")).toBe(true);
    expect(exp.get("o3")).toBe(false);
    expect(exp.get("n1")).toBe(false);
    expect(exp.get("n2")).toBe(true);
  });
});
