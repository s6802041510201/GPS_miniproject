function isValidLatitude(value) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function isValidRadius(value) {
  return Number.isFinite(value) && value > 0;
}

module.exports = { isValidLatitude, isValidLongitude, isValidRadius };

