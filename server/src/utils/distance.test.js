const assert = require('node:assert/strict');
const test = require('node:test');
const { calculateDistanceInMeters } = require('./distance');
const { isWithinRadius } = require('./geofence');
const { isValidLatitude, isValidLongitude, isValidRadius } = require('./validation');

const classroom = { latitude: 13.7563, longitude: 100.5018 };
const productionBuildings = [
  { code: '44', latitude: 13.8138, longitude: 100.5334, radius: 50 },
  { code: '52', latitude: 13.8147, longitude: 100.5358, radius: 50 },
];

function coordinateAtMeters(meters) {
  const longitudeDelta = meters / (111320 * Math.cos((classroom.latitude * Math.PI) / 180));
  return { latitude: classroom.latitude, longitude: classroom.longitude + longitudeDelta };
}

test('Haversine distance returns expected geofence boundaries', () => {
  for (const expectedMeters of [10, 49, 50, 51, 100]) {
    const point = coordinateAtMeters(expectedMeters);
    const distance = calculateDistanceInMeters(
      classroom.latitude,
      classroom.longitude,
      point.latitude,
      point.longitude,
    );

    assert.ok(Math.abs(distance - expectedMeters) < 1, `${distance}m is not close to ${expectedMeters}m`);
  }
});

test('classroom coordinate and radius validation rejects invalid values', () => {
  assert.equal(isValidLatitude(90), true);
  assert.equal(isValidLatitude(90.1), false);
  assert.equal(isValidLongitude(-180), true);
  assert.equal(isValidLongitude(-180.1), false);
  assert.equal(isValidRadius(50), true);
  assert.equal(isValidRadius(0), false);
});

test('geofence accepts points on or inside the radius and rejects points outside', () => {
  for (const distance of [10, 49, 50]) {
    assert.equal(isWithinRadius(distance, 50), true);
  }

  for (const distance of [51, 100]) {
    assert.equal(isWithinRadius(distance, 50), false);
  }
});

test('production building coordinates support inside, boundary, and outside cases', () => {
  for (const building of productionBuildings) {
    const inside = calculateDistanceInMeters(building.latitude, building.longitude, building.latitude, building.longitude);
    assert.equal(isWithinRadius(inside, building.radius), true, `${building.code} should accept its center point`);
    assert.equal(isWithinRadius(building.radius, building.radius), true, `${building.code} should accept the boundary`);
    assert.equal(isWithinRadius(building.radius + 1, building.radius), false, `${building.code} should reject outside points`);
  }
});
