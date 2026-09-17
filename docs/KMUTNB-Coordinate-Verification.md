# KMUTNB Coordinate Verification

## Verified building references

| Building | Latitude | Longitude | Radius | Room used by the app | Verification status |
|---|---:|---:|---:|---|---|
| 44 | 13.81972 | 100.51553 | 50 m | Room 4401 | Reference verified; field confirmation recommended |
| 52 | 13.82039 | 100.51512 | 50 m | Room 5201 | Reference verified; field confirmation recommended |

The previous project-brief coordinates (`13.8138, 100.5334` and `13.8147, 100.5358`) were replaced because they did not match the KMUTNB Bangkok campus building locations.

## Sources

- [KMUTNB official contact and campus information](https://www.kmutnb.ac.th/contact-us.aspx) identifies Building 52 as the Faculty of Technical Education and Building 44 as the shared laboratory and practice building.
- [Faculty of Technical Education facilities site](https://facility.fte.kmutnb.ac.th/) confirms that the facilities team manages Buildings 44 and 52 and lists their classrooms.
- [OpenStreetMap-derived 44 KMUTNB reference](https://mapcarta.com/W158475016) reports Building 44 at `13.81972, 100.51553`.
- [Building 52 location reference](https://bangkok.worldplaces.me/th/review/215039996-52.html) reports Building 52 at `13.82039, 100.51512`.

## Field verification before production

1. Stand at the intended check-in point or classroom entrance for each building.
2. Capture a high-accuracy reading in the mobile app outdoors, then repeat indoors.
3. Compare the reading with the stored building coordinate and record the observed error.
4. Set the radius based on the measured error and the university's attendance policy; do not increase it only to hide weak GPS accuracy.
5. Run inside-radius, boundary, outside-radius, disabled-location, low-accuracy, and GPS-spoofing test cases.

The stored coordinates are authoritative application references only until this field test is completed.
