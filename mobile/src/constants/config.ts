const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const configuredGpsAccuracyLimit = Number(process.env.EXPO_PUBLIC_GPS_ACCURACY_LIMIT_METERS);

export const API_BASE_URL = (configuredApiUrl || 'http://localhost:3000').replace(/\/+$/, '');
export const GPS_ACCURACY_LIMIT_METERS = Number.isFinite(configuredGpsAccuracyLimit) && configuredGpsAccuracyLimit > 0
  ? configuredGpsAccuracyLimit
  : 150;
