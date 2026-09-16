function isValidLatitude(value) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function isValidRadius(value) {
  return Number.isFinite(value) && value > 0;
}

function isValidAccuracy(value) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function isValidId(value) {
  return Number.isInteger(value) && value > 0;
}

module.exports = { isValidAccuracy, isValidId, isValidLatitude, isValidLongitude, isValidRadius };
