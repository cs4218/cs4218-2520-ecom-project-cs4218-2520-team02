import { check } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

export const businessErrorRate = new Rate("business_error_rate");
export const endpointDuration = new Trend("endpoint_duration", true);
export const transactionSuccessRate = new Rate("transaction_success_rate");
export const completedTransactions = new Counter("completed_transactions");
export const failedTransactions = new Counter("failed_transactions");

function isJsonResponse(response) {
  const contentType = response?.headers?.["Content-Type"] || response?.headers?.["content-type"];
  return typeof contentType === "string" && contentType.includes("application/json");
}

export function readJson(response) {
  if (!response || !response.body || !isJsonResponse(response)) {
    return null;
  }

  try {
    return response.json();
  } catch (error) {
    return null;
  }
}

export function trackResponse(
  response,
  { name, expectedStatuses = [200], requireSuccess = false, tags = {} } = {}
) {
  const metricTags = { endpoint: name || "unnamed", ...tags };
  const body = readJson(response);
  const statusOk = expectedStatuses.includes(response.status);
  const successOk = !requireSuccess || body?.success === true;
  const passed = statusOk && successOk;

  check(
    response,
    {
      [`${metricTags.endpoint} returned expected status`]: () => statusOk,
      ...(requireSuccess
        ? {
            [`${metricTags.endpoint} returned success=true`]: () => successOk,
          }
        : {}),
    },
    metricTags
  );

  businessErrorRate.add(passed ? 0 : 1, metricTags);
  endpointDuration.add(response.timings.duration, metricTags);

  return {
    body,
    ok: passed,
  };
}

export function recordTransaction(success, tags = {}) {
  transactionSuccessRate.add(success ? 1 : 0, tags);
  // Always add to both counters (adding 0 is a no-op on the value) so that both
  // metrics are registered in the same k6 metric event from the very first call.
  // If only one branch is ever hit early on, the other counter gets registered late
  // mid-run, causing a metric index shift that corrupts the VU chart in the report.
  completedTransactions.add(success ? 1 : 0, tags);
  failedTransactions.add(success ? 0 : 1, tags);
}

export function pickByIteration(items, iteration) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return items[iteration % items.length];
}
