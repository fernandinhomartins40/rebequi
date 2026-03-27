export type CountdownParts = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
};

export function getCountdownParts(targetAt?: string | Date | null): CountdownParts | null {
  if (!targetAt) {
    return null;
  }

  const targetDate = new Date(targetAt);
  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }

  const totalMs = Math.max(targetDate.getTime() - Date.now(), 0);
  const totalSeconds = Math.floor(totalMs / 1000);

  return {
    totalMs,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: Math.floor(totalSeconds % 60),
    isExpired: totalMs <= 0,
  };
}
