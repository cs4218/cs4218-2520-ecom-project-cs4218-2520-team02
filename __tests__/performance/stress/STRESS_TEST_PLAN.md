# Stress Test Plan

## Goal

This stress-test suite is designed to push the ecommerce system beyond normal operating load, identify the breaking point for each critical flow, and observe whether the system degrades gracefully instead of crashing.

The focus is on four business-critical flows:

- browsing flow
- authentication flow
- payment flow
- order tracking flow

## Test Type

- progressive stress test
- short, high-intensity phases
- controlled ramp-up to increasingly extreme concurrency

## Default Load Profile

The default stress profile is intentionally short and aggressive:

| Phase | Duration | Concurrent Users |
|-------|----------|------------------|
| Warmup | 20s | 20 |
| Ramp 1 | 30s | 100 |
| Ramp 2 | 30s | 250 |
| Ramp 3 | 30s | 500 |
| Ramp 4 | 30s | 750 |
| Peak | 30s | 1000 |
| Cooldown | 20s | 0 |

This profile is used by default across the stress suite, but it can still be overridden through environment variables when a higher or lower limit is needed.

## Metrics Tracked

The stress tests focus on observable performance outcomes:

- response time
- `p90` response time
- `p95` response time
- error rate
- transaction success rate
- throughput / requests per second
- concurrency

Where external monitoring is available, the following should also be recorded during the same run:

- CPU utilization
- memory utilization
- MongoDB connection count

## Default Success Thresholds

The suite currently enforces these default thresholds:

- `p90 < 1500ms`
- `p95 < 2000ms`
- `http_req_failed < 10%`
- `business_error_rate < 10%`
- `transaction_success_rate > 90%`

These are default automated thresholds, not absolute business guarantees. Final evaluation should still consider the phase where degradation begins and whether the system remains stable under stress.

## Breaking Point Definition

The breaking point is reached when any of the following becomes sustained at a given phase:

1. error rate reaches or exceeds `5%`
2. `p95` response time exceeds `5000ms`
3. throughput drops significantly relative to the previous phase
4. repeated timeouts or `5xx` responses appear
5. the application becomes unresponsive or unstable

## Flow Models

### Browsing Flow

The browsing stress test simulates short user journeys rather than isolated random requests. A single journey starts from homepage-style traffic and then continues into one of:

- search journey
- filter journey
- category exploration journey
- load-more journey

Optional product photo requests can be included to increase realism and payload pressure.

### Authentication Flow

The authentication stress test is split into two separate stress scenarios:

- registration stress
- login stress

This separation makes failures easier to attribute and keeps each scenario focused on one main behavior.

### Payment Flow

The payment stress test models:

- user login
- Braintree token retrieval
- payment submission with a realistic cart

Dedicated stress users are seeded into MongoDB before the run and removed afterward.

### Order Tracking Flow

The order-tracking stress test models:

- user login
- authenticated order-history retrieval

Dedicated stress users with seeded order history are created before the run and removed afterward.

## Test Data Strategy

For seeded flows, the runner prepares dedicated MongoDB data before execution:

- auth: seeded login users plus per-run registration users
- payment: seeded login users
- orders: seeded login users and seeded order history

Cleanup runs after the test even when the stress flow fails under normal exception and non-zero-exit conditions.

## Pass / Marginal / Fail Guidance

### PASS

- baseline and moderate phases remain stable
- no crashes occur
- error rate stays low
- the system remains responsive through the 500-1000 VU phases

### MARGINAL

- noticeable slowdown appears under high stress
- some errors occur in the 500-1000 VU phases
- the system degrades but remains usable and recoverable

### FAIL

- errors appear too early
- the system becomes unstable before meaningful stress levels
- the application crashes, hangs, or produces corrupted behavior

## Reporting Expectations

A stress-test report based on this plan should include:

- test date and environment
- flow under test
- load profile used
- per-phase response time and error results
- identified breaking point
- first failure symptom
- bottleneck observations
- final verdict and recommendations
