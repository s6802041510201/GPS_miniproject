function isValidLatitude(value) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function isValidRadius(value) {
  return Number.isFinite(value) && value > 0;
}

function getGpsAccuracyLimit() {
  const configuredLimit = Number(process.env.GPS_ACCURACY_LIMIT_METERS);
  return Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 150;
}

function isValidAccuracy(value, limit = getGpsAccuracyLimit()) {
  return Number.isFinite(value) && value >= 0 && value <= limit;
}

function isValidId(value) {
  return Number.isInteger(value) && value > 0;
}

module.exports = { getGpsAccuracyLimit, isValidAccuracy, isValidId, isValidLatitude, isValidLongitude, isValidRadius };
