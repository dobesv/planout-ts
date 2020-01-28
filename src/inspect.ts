import { PlanOutCode } from "./PlanOutCode";
import {
  MetaEnvironment,
  PlanOutParameterGatherer
} from "./PlanOutParameterGatherer";

type PlanOutScriptMetadata = { parameters: MetaEnvironment };

const inspect = (
  code: PlanOutCode,
  input: MetaEnvironment = null
): PlanOutScriptMetadata => {
  const interpreter = new PlanOutParameterGatherer(input);
  const parameters = interpreter.inspect(code);
  return { parameters };
};

export default inspect;
