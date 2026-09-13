# Reuse the room graph during floor builds — 2026-09-09

The active and stacked 3D builders now resolve a floor's rooms and polygons in one
call. Previously, resolving rooms built the intersection graph once, then every
polygon request built that same graph again. The large furnished-home fixture
has 16 rooms on each of three floors, so a stacked build repeated graph creation
51 times. The new path builds it three times, once per floor.

The graph is local to the call and discarded afterwards. There is no persistent
identity cache: in-place wall edits are recomputed, and callers cannot corrupt a
later build by changing a returned polygon. The existing single-room polygon and
room-resolution APIs remain available to their other callers.

## Local measurements

Node 24.19.0 on macOS arm64, using the existing furnished-home fixtures. Each
method received five warm-up calls; seven samples each averaged 20 resolutions
of all project floors. The sequential comparison uses the previous caller pattern
(`resolveRooms` followed by `getRoomPolygon` for each room) against the same current
geometry implementation. No rendering, network or model loading is timed.

| Fixture | Rooms / floors | Sequential median | Shared graph median |
| --- | --- | ---: | ---: |
| Small | 4 / 1 | 0.119 ms | 0.042 ms |
| Medium | 18 / 2 | 0.523 ms | 0.132 ms |
| Large | 48 / 3 | 2.402 ms | 0.393 ms |

The large fixture's measured room-computation time fell about 84%. These are local
microbenchmarks, not browser FPS, physical-phone results, memory or battery
budgets. Full scene construction and active navigation remain separate work.
Raw samples are in [the measurement JSON](room-geometry-benchmark.json).

Reproduce from the web repository:

```sh
ROOM_GEOMETRY_BENCHMARK=1 npm test -- --run tests/room-geometry-batch.test.ts
```

The opt-in run writes `/tmp/openplan3d-room-geometry-benchmark.json`. Timing is not
used as a brittle CI pass/fail threshold. Ordinary tests compare room metadata and
polygons against sequential resolution for curved, crossing, overlapping and
furnished fixtures, and verify fresh results after in-place geometry edits and
mutation of previously returned polygons.

Validation passed **679 unit tests in 49 files**, Svelte checks with zero errors
and warnings, and the production build. All **six Chromium/WebKit browser checks**
passed for curved, crossing and overlapping rooms across active-floor switches,
including checks of actual exported slab geometry. No native code changed.
