import type { DriverAssignmentInput } from '@rebequi/shared/schemas';
import { apiFetch } from './client';
export type DriverTask = { id: string; status: string; region: string | null; address: string | null; scheduledAt: string | null; sale: { referenceCode: string; customerNameSnapshot: string | null }; items: { id: string; nameSnapshot: string; quantity: number; checked: number; delivered: number }[] };
export const getDriverTasks = async (page = 1) => (await apiFetch<{ data: { tasks: DriverTask[]; totalPages: number } }>(`/driver/tasks?page=${page}`)).data;
export const getDriverTask = async (id: string) => (await apiFetch<{ data: DriverTask }>(`/driver/tasks/${encodeURIComponent(id)}`)).data;
export const getActiveDrivers = async (page = 1) => (await apiFetch<{ data: { drivers: { id: string; name: string }[]; page: number; totalPages: number } }>(`/fulfillments/drivers?page=${page}`)).data;
export const assignDriver = (id: string, input: DriverAssignmentInput) => apiFetch(`/fulfillments/${encodeURIComponent(id)}/driver`, { method: 'PUT', body: JSON.stringify(input) });
