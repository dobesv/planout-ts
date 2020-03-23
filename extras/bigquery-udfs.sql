-- First upload required scripts to google storage:
-- * //cdn.jsdelivr.net/npm/jstat@latest/dist/jstat.min.js
-- * ./beta-js.js
-- * ./bayes-funcs.js
-- If you didn't call the storage bucket "bigquery-udf-js-libs" you will have to update the URLs below
--
-- Then you can install these user-defined functions
--

--
-- This function returns a number from zero to one indicating the probability that the variant
-- beats the control/original
--
-- Supply priorSuccesses and priorFailures using actual data if this is a follow-up to a previous test, it will
-- set an initial confidence value on the conversion rate and improve the result.
--
-- Otherwise you can set priorSuccesses and priorFailures based on your own estimate of the conversion rate and your
-- confidence in it.
--
-- Or you can pass zero for both of these, it will just have a higher confidence in the new numbers.
--
-- Read more: https://making.lyst.com/bayesian-calculator/#explanation
--

CREATE OR REPLACE FUNCTION probabilityVariantBeatsOriginal(
  priorSuccesses INT64,
  priorFailures INT64,
  controlSuccesses INT64,
  controlFailures INT64,
  testSuccesses INT64,
  testFailures INT64)
RETURNS FLOAT64
LANGUAGE js
OPTIONS (library = [
    "gs://bigquery-udf-js-libs/jstat.min.js",
    "gs://bigquery-udf-js-libs/bayes-funcs.js"
])
AS """
    return probabilityVariantBeatsOriginal(priorSuccesses, priorFailures, controlSuccesses, controlFailures, testSuccesses, testFailures);
""";

--
-- This can be used when there may be more than 2 variants.  Pass two arrays, one with
-- the number of successes for each variant, and one with the number of failures for each
-- variant.  The result is an array with the probability of the variant in that position
-- being the most successful.
--
CREATE OR REPLACE FUNCTION probabilitiesOfBeingBestForEachVariant(
  priorSuccesses INT64,
  priorFailures INT64,
  variantSuccesses ARRAY<INT64>,
  variantFailures ARRAY<INT64>
) RETURNS ARRAY<FLOAT64>
LANGUAGE js
OPTIONS (library = [
    "gs://bigquery-udf-js-libs/jstat.min.js",
    "gs://bigquery-udf-js-libs/bayes-funcs.js"
])
AS """
    return probabilitiesOfBeingBestForEachVariant(priorSuccesses, priorFailures, variantSuccesses, variantFailures);
""";

-- The following is an example query that could give a table with each variant
-- and it's likelihood of being the winning choice.  Use as a baseline for
-- creating your own report.
SELECT
  variant, exposures, conversions, ROUND(winChance * 100) as winChancePercent
FROM (
  SELECT
    variants,
    exposureCounts,
    conversionCounts,
    failureCounts,
    probabilitiesOfBeingBestForEachVariant(
      50,
      1,
      conversionCounts,
      failureCounts) AS winFactors
  FROM (
    SELECT
      ARRAY_AGG(variant) AS variants,
      ARRAY_AGG(exposures) AS exposureCounts,
      ARRAY_AGG(conversions) AS conversionCounts,
      ARRAY_AGG(exposures - conversions) AS failureCounts
    FROM (
      SELECT
        e1.label AS `variant`,
        COUNT(e1.anonymousId) AS `exposures`,
        SUM(CASE WHEN EXISTS(SELECT timestamp FROM events e2 WHERE  e2.anonymousId = e1.anonymousId
        AND e2.event = 'Conversion'
        AND e2.timestamp >= e1.timestamp
        AND e2.timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP, INTERVAL 60 DAY)) THEN 1 ELSE 0 END) AS `conversions`
      FROM
        events e1
      WHERE
        e1.event = 'Exposure to Experiment X'
        AND e1.timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP, INTERVAL 60 DAY)
        AND e1.anonymousId IS NOT NULL
        AND e1.label IS NOT NULL
        AND e1.label <> ''
      GROUP BY
        e1.label ))) AS data,
UNNEST(variants) variant WITH OFFSET
LEFT JOIN UNNEST(exposureCounts) exposures WITH OFFSET USING(offset)
LEFT JOIN UNNEST(conversionCounts) conversions WITH OFFSET USING(offset)
LEFT JOIN UNNEST(winFactors) winChance WITH OFFSET USING(offset)
ORDER BY variant ASC;


--
--
