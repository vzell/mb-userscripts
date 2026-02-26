# Unused Identifier Audit Report
**Files audited:** `VZ_MBLibrary_user.js`, `ShowAllEntityData_user.js`
**Date:** 2026-02-26
**Method:** Automated regex-based static analysis + manual grep verification for each candidate.

---

## Methodology

A Python static analyzer extracted all identifier declarations (`var`/`let`/`const`/`function`/`class`,
including destructuring patterns) from the stripped source (comments + string/template-literal content
removed) and counted how many times each identifier appeared.

> **Important:** The initial automated pass had significant **false positives** because the template-literal
> stripper removed code inside `${...}` expressions.  Every "unused" candidate was subsequently
> **verified by raw `grep` on the original source** before being classified as truly dead.

---

## VZ_MBLibrary_user.js

### Summary
| Category                                       | Count |
|------------------------------------------------|-------|
| Declarations scanned                           | 59    |
| Initially flagged (automated)                  | 11    |
| Confirmed unused after manual verification     | **0** |
| False positives (template-literal false alarm) | 11    |

### False-Positive Analysis
All 11 automated "unused" hits in `VZ_MBLibrary_user.js` were **false positives**.
The identifiers are all actively used inside template literals (`${}`) within the IIFE — the string
stripper was removing those references.

| Line | Name                | Actual raw-grep count | Status                                    |
|------|---------------------|-----------------------|-------------------------------------------|
| 65   | `VZ_MBLibrary`      | 2                     | ✅ Used (instantiated by consumer script) |
| 91   | `_changelog`        | 24                    | ✅ Used extensively                       |
| 95   | `_changelogMeta`    | 30                    | ✅ Used extensively                       |
| 118  | `_saveLibPrefs`     | 2                     | ✅ Used                                   |
| 154  | `fetchCachedText`   | 5                     | ✅ Used                                   |
| 159  | `ageS`              | 2                     | ✅ Used inside template literal           |
| 227  | `iconChar`          | 2                     | ✅ Used inside template literal           |
| 241  | `duration`          | 2                     | ✅ Used inside template literal           |
| 389  | `showCustomAlert`   | 3                     | ✅ Used + exported                        |
| 400  | `showCustomConfirm` | 7                     | ✅ Used + exported                        |
| 405  | `settingsInterface` | 8                     | ✅ Used + exported                        |

**No changes made to `VZ_MBLibrary_user.js`.**

---

## ShowAllEntityData_user.js

### Summary
| Category                                          | Count |
|---------------------------------------------------|-------|
| Declarations scanned                              | 1,190 |
| Initially flagged (automated)                     | 50    |
| False positives (template-literal / comment uses) | 45    |
| Confirmed truly unused                            | **5** |
| Kept intentionally (debug aid)                    | 1     |

---

### ✅ FIXED — Dead code removed (5 items)

#### 1. `progressContainer` — Line 5865
```js
// BEFORE
const progressContainer = null; // removed from controls bar; fetch progress shown in globalStatusDisplay

// AFTER  — line deleted entirely
```
**Reason:** Explicitly noted in-line as "removed from controls bar". Assigned `null`, never read.
The feature it once represented now lives in `globalStatusDisplay`. Pure dead-code stub.

---

#### 2. `baseUrl` — Line 8063 (inside `startFetchingProcess`)
```js
// BEFORE
const baseUrl = window.location.origin + window.location.pathname;
const currentUrlParams = new URLSearchParams(window.location.search);

// AFTER — baseUrl line deleted
const currentUrlParams = new URLSearchParams(window.location.search);
```
**Reason:** `baseUrl` is never read anywhere in the file. The fetch loop builds page URLs via
`new URL(window.location.href)` directly. This variable is a leftover from an earlier URL-building
approach that was superseded.

---

#### 3. `countryDateIdx` — Line 8111
#### 4. `locationIdx` — Line 8112
#### 5. `areaIdx` — Line 8113
```js
// BEFORE
let countryDateIdx = -1; // kept for mainColIdx detection parity — not used for splitting
let locationIdx = -1;   // idem
let areaIdx = -1;       // idem
let mainColIdx = -1;

// AFTER
let mainColIdx = -1;
```
**Reason:** All three were declared as `-1` and never assigned or read in active code.
Their own comments explicitly acknowledged they were unused ("not used for splitting", "idem").
A single remaining reference to `countryDateIdx` was in a **commented-out** `Lib.debug(...)` call;
that dead comment block was also removed:
```js
// REMOVED along with the variables:
// Lib.debug(
//     'row',
//     `Row BEFORE push → cells=${newRow.cells.length}, mainColIdx=${mainColIdx}, countryDateIdx=${countryDateIdx}`
// );
```

---

### ℹ️ KEPT INTENTIONALLY — Named function expression (1 item)

#### `executedFunction` — Line 1766 (inside `debounce`)
```js
return function executedFunction(...args) { … }
```
**Status:** The name `executedFunction` is never called from outside — it is technically an
unused identifier. However, **naming anonymous function expressions is a deliberate best practice**:
the name appears in JavaScript stack traces and profiler output, making debugging significantly
easier. Removing it would produce a functionally equivalent but harder-to-debug anonymous function.
**Verdict: kept as-is.**

---

### False-Positive Examples (45 items)
The following are a representative sample of the 45 items initially flagged but confirmed as used:

| Name                                   | Why initially flagged             | Actual usage                          |
|----------------------------------------|-----------------------------------|---------------------------------------|
| `basePath`                             | In template literal `${basePath}` | Used in `Lib.debug(...)` call         |
| `isFilteredRelationshipPage`           | In template literal               | Used in `Lib.debug(...)` call         |
| `visibleCount`                         | In template literal               | Used in `Lib.debug(...)` call         |
| `ageS`                                 | In template literal               | Used in logger call                   |
| `rowsExported`                         | In template literal               | Counted during CSV export             |
| `filterInfo` / `globalFilterInfo`      | In template literals              | Used in status display                |
| `safeId` / `pfx`                       | In template literals              | Used in multiple places               |
| `compressionTime` / `compressionRatio` | In template literals              | Logged after save                     |
| All `Lib.debug(...)` args              | Same pattern                      | All legitimately used in debug output |

---

## Changes Made

| File                               | Version              | Change                                 |
|------------------------------------|----------------------|----------------------------------------|
| `ShowAllEntityData_user.js`        | `9.97.9` → `9.97.10` | 5 dead identifiers removed (−11 lines) |
| `ShowAllEntityData_CHANGELOG.json` | —                    | New entry `9.97.10` added              |
| `VZ_MBLibrary_user.js`             | unchanged            | No unused identifiers confirmed        |
