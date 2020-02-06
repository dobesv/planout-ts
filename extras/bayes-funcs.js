function probabilityVariantBeatsOriginal(
  priorSuccesses,
  priorFailures,
  controlSuccesses,
  controlFailures,
  testSuccesses,
  testFailures
) {
  const controlAlpha = priorSuccesses + controlSuccesses;
  const controlBeta = priorFailures + controlFailures;
  const testAlpha = priorSuccesses + testSuccesses;
  const testBeta = priorFailures + testFailures;
  const sampleCount = 5000;
  let testWins = 0;

  for (let i = 0; i < sampleCount; i++) {
    const testValue = jStat.jStat.beta.sample(testAlpha, testBeta);
    const controlValue = jStat.jStat.beta.sample(controlAlpha, controlBeta);
    if (testValue > controlValue) {
      testWins++;
    }
  }

  return testWins / sampleCount;
}

//
// This version of the algorithm takes parallel arrays of successes and failures
// and returns an array describing the probability of a given variant being the best
//
function probabilitiesOfBeingBestForEachVariant(
  priorSuccesses,
  priorFailures,
  variantSuccesses,
  variantFailures
) {
  const variantCount = variantSuccesses.length;
  const sampleCount = 5000;
  const results = new Array(variantCount).fill(0);
  const values = new Array(variantCount).fill(0);
  for (let i = 0; i < sampleCount; i++) {
    for (let j = 0; j < variantCount; j++) {
      values[j] = jStat.jStat.beta.sample(
        priorSuccesses + variantSuccesses[j],
        priorFailures + variantFailures[j]
      );
    }
    const bestScore = Math.max.apply(Math, values);
    for (let j = 0; j < variantCount; j++) {
      if(values[j] === bestScore) {
        results[j]++;
      }
    }
  }
  for (let j = 0; j < variantCount; j++) {
    results[j] = results[j] / sampleCount;
  }
  return results;
}
