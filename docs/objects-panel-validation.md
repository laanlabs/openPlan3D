# Objects panel refactor — validation record

Date: October 16, 2026. Scope: the room-first Build panel Objects tab
(taxonomy, panel components, all three tabs, global search, mobile drawer).

## What shipped

### Taxonomy module (`src/lib/utils/objectTaxonomy.ts`)

A presentation-only taxonomy that maps the existing catalogs onto rooms and
sub-cards. It changes no catalog item or data file.

- `ObjectGroupId` (`furniture` / `outdoor` / `electrical` / `entourage`),
  `ObjectSubcard` (`id`, `labelKey`, `icon`, `group`, `source`, `itemIds`) and
  `ObjectRoom` (`id`, `labelKey`, `icon`, `kind: 'subcards' | 'direct'`,
  `subcards`).
- 4 groups, 63 sub-cards and 13 rooms.
- Helpers: `getSubcard`, `subcardsForRoom`, `catalogItemsForSubcard`,
  `entourageItemsForSubcard`, `itemsForDirectRoom`, `subcardHasItems`.

Invariants covered by `tests/object-taxonomy.test.ts` (6 tests):

1. Every catalog item is covered by at least one sub-card.
2. Sub-cards reference only known catalog/entourage ids and known groups, with
   no duplicate ids inside a sub-card.
3. Every room's sub-card references resolve; every room has at least one
   sub-card.
4. `raised_bed` moved from `Structures` to `Outdoor furniture`.
5. Living Room sub-cards keep the specified order (armchairs → … →
   fireplaces).
6. The helpers return the expected items (`sofa`/`loveseat`, the three
   vehicles), `subcardHasItems` is `false` for the empty `ottoman` card and
   `true` for `appliances`, and the `direct` Decor room returns only `Decor`
   items.

### New components (`src/lib/components/sidebar/objects/`)

| Component | Role |
| --- | --- |
| `ObjectsPanel.svelte` | Container: tabs, search wiring, drill-down state, favorites/recent. |
| `ObjectsSearch.svelte` | Global search input with clear control and result counts. |
| `RoomCard.svelte` | Room entry in the Rooms tab. |
| `SubcardCard.svelte` | Sub-card entry inside a room / category group. |
| `ObjectItemCard.svelte` | Catalog item tile (favorite heart, place). |
| `EntourageItemCard.svelte` | Entourage item tile. |
| `CategoryAccordion.svelte` | Grouped categories accordion. |
| `MyItemsPanel.svelte` | My Items tab + Import GLB card (renamed from `CustomModelPanel.svelte`). |
| `EmptyState.svelte` | Empty room / no-results placeholder. |

`BuildPanel.svelte` was reduced to a thin host that renders `ObjectsPanel`.

### Panel information architecture

- Global search bar above the tabs; matches item names, localized names, raw
  categories and localized category labels, plus entourage names.
- Three tabs: Rooms / Categories / My Items.
- Rooms tab: room → sub-card → items drill-down; a Favorite card and Recent
  row; `direct` rooms (Decor, Pool & Spa, Garage, Gym) render items flat.
- Categories tab: grouped accordion incl. Entourage / Vehicles / Planting.
- My Items tab: the Import GLB model card.
- Favorites/recent, empty sub-cards omitted, empty rooms show `EmptyState`.

### Mobile drawer

The tools drawer is full width below the `md` breakpoint (`max-md:w-full`) and
closes via the panel `✕` (`onClose` threaded through `BuildPanel`).

## Preserved contracts

- No change to `FurnitureDef.category`, `docs/furniture-manifest.json`, native
  or package categories, or `legacyFurnitureCategories.ts`.
- Favorites and recent still use the same storage keys
  (`o3d_favorite_furniture` / `o3d_recent_furniture`).
- The retired flat `CustomModelPanel.svelte` was renamed to
  `objects/MyItemsPanel.svelte` (commit `4dabc64`); its behavior is preserved
  inside the My Items tab.

## Search category-matching fix

The initial refactor dropped category-label matching from the global search
(regression caught by `catalog-categories-localization.spec.ts`). Commit
`af338f2` (`fix: match categories in objects panel search`) restored the old
`BuildPanel` predicate: `searchItems` now matches the localized name, raw name,
raw `item.category`, and the localized category label when mapped.

## Validation

Environment: Node `v22.23.2` on Linux (`.nvmrc` requests Node 24). No Firebase
credentials were needed.

### `npm run check`

```
svelte-check found 0 errors and 0 warnings
```

(The Vite config emits a non-fatal `Production builds require NODE_ENV=production`
notice before falling back to `svelte.config.js`; diagnostics are 0/0.)

### `npm test`

```
 Test Files  130 passed (130)
      Tests  1204 passed (1204)
   Duration  9.28s
```

### `npm run build`

```
✓ built in 19.00s

Run npm run preview to preview your production build locally.

> Using @sveltejs/adapter-node
Generated an empty chunk: "chunks/internal.js".
  ✔ done
```

(`Generated an empty chunk: "chunks/internal.js"` is a pre-existing
adapter-node notice, not an error.)

### `npm run catalog:check`

```
Verified 189 catalog entries and 204 bundled GLBs and 20 textures.
```

### Affected browser specs (Chromium) — 26 passed

Rebuilt before running; Playwright used its own server on port 4188.

- `tests/browser/objects-panel.spec.ts` (5)
- `tests/browser/catalog-categories-localization.spec.ts` (1)
- `tests/browser/catalog-keyboard.spec.ts` (6)
- `tests/browser/custom-model-localization.spec.ts` (2)
- `tests/browser/editor.spec.ts` (6)
- `tests/browser/furniture-fidelity.spec.ts` (3)
- `tests/browser/rotated-furniture-placement.spec.ts` (3)

```
Running 26 tests using 1 worker
  ...all 26 ✓...
  26 passed (1.9m)
```

### WebKit limitation

WebKit cannot launch on this machine. Playwright reports:

```
Error: browserType.launch:
Host system is missing dependencies to run browsers.
    sudo apt-get install libavif16
```

`libavif16` is absent, so all five `objects-panel.spec.ts` cases fail at launch
on WebKit. This is an environment limitation, not a product failure; WebKit CI
coverage does not replace Safari or physical iPhone/iPad checks.

### Mobile viewport note

The full-width mobile drawer case (`objects-panel.spec.ts:47`) sets a
`390 × 844` Playwright viewport. That is a resized desktop browser context, not
a physical device; it verifies layout and the `✕` close path only.

## Follow-up changes (same branch)

- **Recent strip:** the Rooms-tab Recent section is a single horizontally
  scrollable row (`ObjectsPanel.svelte`), so it can no longer push the Favorite
  and room cards down; the stored list is still capped at 10 on each placement.
- **Custom-model cards:** My Items cards now match the catalog cards (icon, name
  and `W×Dcm`), with provenance in the card tooltip and a `−` (Remove model)
  button. Clicking a card (or dragging it) arms the same placement rules as
  catalog items — grid snap, wall snap and pre-place rotation — via a
  `placingCustomModelId` store and `addFurniture(..., customModelId)`. The global
  search result cards use the same flow.

## Limits

- Physical iPhone/iPad interaction and Safari/WebKit qualification remain open.
- Asset attribution/dimension curation and native visual fidelity remain work
  areas (see [FEATURES.md](../FEATURES.md)).
- Follow-up: add real items for the empty sub-cards (ottoman, cabinets, toys,
  gym, …).
