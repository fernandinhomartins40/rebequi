import type { VehicleInput } from '@rebequi/shared/schemas';
import { apiFetch } from './client';
export type Vehicle = { id: string; plate: string; label: string; maxLoadKg: string | null; maxVolumeM3: string | null; restrictions: string | null; active: boolean; version: number };
export const getVehicles = async (page = 1) => (await apiFetch<{ data: { vehicles: Vehicle[]; totalPages: number } }>(`/vehicles?page=${page}`)).data;
export const saveVehicle = (id: string | null, input: VehicleInput) => apiFetch(`/vehicles${id ? `/${encodeURIComponent(id)}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
