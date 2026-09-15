const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

/**
 * Calculate the shortest distance between two GPS coordinates in meters.
 */
function calculateDistanceInMeters(latitude1, longitude1, latitude2, longitude2) {
  const latitudeDelta = toRadians(latitude2 - latitude1);
  const longitudeDelta = toRadians(longitude2 - longitude1);
  const firstLatitude = toRadians(latitude1);
  const secondLatitude = toRadians(latitude2);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

module.exports = { calculateDistanceInMeters };

