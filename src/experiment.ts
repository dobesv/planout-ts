import {EnvironmentType, PlanOutExperiment} from "./PlanOutExperiment";

const experiment = (name: string, env: EnvironmentType = {}): PlanOutExperiment =>
  new PlanOutExperiment(name, env);

export default experiment;
