import { EnvironmentType, PlanOutExperiment } from "./PlanOutExperiment";
import { PlanOutCode } from "./PlanOutCode";
import { PlanOutInterpreter } from "./PlanOutInterpreter";

const execute = (
  name: string,
  code: PlanOutCode,
  input?: EnvironmentType
): PlanOutExperiment => {
  const experiment = new PlanOutExperiment(name, input);
  const interpreter = new PlanOutInterpreter(experiment);
  interpreter.execute(code);
  return experiment;
};

export default execute;
