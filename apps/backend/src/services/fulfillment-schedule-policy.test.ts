import test from 'node:test';
import assert from 'node:assert/strict';
import { fulfillmentScheduleEvent } from './fulfillment-schedule-policy.js';
test('Schedule history distinguishes first confirmation, actual rescheduling and withdrawing a previous date', () => {
  const first = '2026-11-17T13:30:00.000Z';
  assert.equal(fulfillmentScheduleEvent(null, null), 'DETAILS_CONFIRMED');
  assert.equal(fulfillmentScheduleEvent(null, first), 'DETAILS_CONFIRMED');
  assert.equal(fulfillmentScheduleEvent(new Date(first), '2026-11-17T13:30:00Z'), 'DETAILS_CONFIRMED');
  assert.equal(fulfillmentScheduleEvent(new Date(first), '2026-11-18T13:30:00.000Z'), 'RESCHEDULED');
  assert.equal(fulfillmentScheduleEvent(new Date(first), null), 'SCHEDULE_CLEARED');
});
