# Duplimancy Kit Spec (draft v0)

A **kit** is a designer-uploaded bundle that renders MTG cards in a custom frame style. Kits are written in Typst. Players browse the uploaded kits and apply one to a whole card list, or pick a kit per card.

Status: design draft. Nothing here is implemented yet.

---

## 1. Goals / non-goals

**Goals**
- Any designer can ship a frame style without Duplimancy-specific code changes.
- Rendering is deterministic: same kit version + same card data → identical output.
- Players can mix kits within one print sheet.
- Untrusted kit code can't harm the server or other users.

**Non-goals (MVP)**
- A browser-based kit editor.
- Kit-uploaded fonts (see §5).
- Every MTG layout covered by every kit.

---

## 2. Why Typst

- **Sandboxed by design.** No shell, no network, and file reads are confined to `--root`.
- **Compose-like model.** A layout is a pure function `card → content`, and the schema is the type contract.
- **Precise print output.** Units are in mm, and page breaks are deterministic.
- **Variable fonts.** Supported since Typst 0.15, so the Google Fonts variable files work as-is.
- **No custom DSL.** Typst replaces the shelved Vesuvan idea with an existing, maintained language.

---

## 3. Kit structure

```
retro-ink/
├── kit.toml
├── normal.typ
├── saga.typ
├── token.typ
├── images/
│   ├── frame-w.png
│   ├── frame-u.png
│   └── ...
└── preview.png   (optional; otherwise auto-generated)
```

### kit.toml

```toml
[kit]
name = "retro-ink"
version = "1.2.0"
author = "..."
license = "CC-BY-4.0"      # license for the kit's code + images
schema = 1                  # card schema version
core = "1.0.0"              # @duplimancy/core version

[layouts]
normal = "normal.typ"
saga = "saga.typ"
token = "token.typ"

[fonts]                     # references the Duplimancy font library, not files
families = ["Cinzel", "Crimson Pro", "Mana"]

[params]                    # optional player-tweakable options → auto-generated UI
accent = { type = "color", default = "auto" }
border = { type = "enum", values = ["black", "white", "silver"], default = "black" }
```

### Layout file contract

Each layout file exports one function with this name and signature:

```typ
#import "@duplimancy/core:1.0.0": *

#let render(card, accent: auto, border: "black") = box(width: 63mm, height: 88mm, clip: true)[
  // ...
]
```

- `card` is a dictionary that follows the card schema (§4).
- Named args correspond to `[params]` in the manifest.
- The function must return content exactly 63×88mm, or the bleed size if bleed is declared in a later schema version.

---

## 4. Card schema

The schema mirrors the **Scryfall card object** instead of inventing a new one. Player lists resolve through Scryfall anyway.

- Fields include `name`, `layout`, `mana_cost`, `type_line`, `oracle_text`, `flavor_text`, `power`, `toughness`, `loyalty`, `colors`, `color_identity`, `rarity`, `set`, `card_faces[]`, plus an `art` path the server resolves.
- The schema is versioned (`schema = 1`). Breaking changes bump the version, and kits declare which version they target.
- Multi-face layouts (transform, MDFC, adventure, split, flip) read `card.card_faces`.

---

## 5. Fonts: shared font library (no kit-uploaded fonts)

Kits don't ship font files. They reference families by name from a Duplimancy-hosted library.

**Source**
- Mirror the `google/fonts` GitHub repo. Everything in it is open-licensed (OFL, Apache 2.0, or UFL), so Duplimancy can legally redistribute all of it.
- Optional extras, each checked one at a time:
  - Mana and Keyrune by Andrew Gioia, for mana and set symbols. The font files are OFL. The underlying symbols are WotC's, so the same caveat as frames applies.
  - Other OFL sources such as The League of Moveable Type. Font Squirrel's licenses vary by font, so check each one.

**Why**
- **Licensing:** players never redistribute fonts they don't have rights to, such as Beleren or Matrix.
- **No collisions:** each family name maps to exactly one canonical file, so two kits can't ship conflicting copies of the same family.
- **Dedupe:** the font storage cost is paid once, not per kit.
- **Validation:** an unknown family in `[fonts]` rejects the kit at upload.

**Pinning**
- Upstream font versions change, and a change can shift metrics, which would reflow text on existing kits.
- Pin the font library to a google/fonts commit, and record that commit in each kit's validation record.
- When the library is updated, re-run the validation renders for every kit and diff them. Kits that drift get flagged for their author.

**Compile flags**
- `--ignore-system-fonts`
- `--font-path` pointed at only the families listed in `[fonts]`, symlinked into a temp dir per compile.

**Later**
- Allow kit-uploaded fonts only if they include an OFL or Apache license file. Uploaded fonts go into the shared library after review.

---

## 6. `@duplimancy/core` library

A shared package served from a local package dir (`--package-path`). Kits import it so they don't reimplement the hard parts.

- `mana(cost)`: turns `{2}{G}{U/P}` into glyphs, covering hybrid, phyrexian, snow, X, and tap/untap.
- `oracle(text, box)`: shrinks text until it fits the box, using `measure` + `layout`. It also handles paragraph breaks, reminder-text italics, and inline mana symbols.
- `pt-box(card)`, `loyalty-box(card)`, `set-symbol(card)` helpers.
- Fixture cards for testing (§8).
- Schema docs.

Kits declare a `core` version. Old core versions stay available so existing kits never break.

---

## 7. Rendering pipeline

**Per card** (this is what makes mixing kits possible):
1. Unpack the kit into an isolated temp root.
2. Generate `main.typ`, which imports the kit's layout file and calls `render(card, ..params)`.
3. Run `typst compile` with:
   - `--root <tmp>`
   - `--ignore-system-fonts` and `--font-path <kit fonts>`
   - `--package-path <vendored core>`, with no `@preview` network access
4. Output SVG. Typst's SVG export draws glyphs as paths, so the font travels inside the file. Confirm this during implementation.
5. Cache the result by `hash(kit@version, core@version, font-lib commit, card data, params)`.

**Per sheet:**
6. A separate Typst compile places the per-card SVGs on the print grid (3×3 on letter or A4, with cut lines and optional bleed), then outputs the PDF.

**Process isolation (required):**
- As far as we know, Typst has no built-in compile timeout. Run each compile as its own process with:
  - a wall-clock timeout, e.g. 10s per card
  - a memory cap via cgroup or ulimit
  - limits on output size and page count
- Run compiles in a worker pool, separate from the web server.

**Client-side (future):**
- typst.ts (WASM) could power live previews in a kit editor. It's not needed for MVP, and the server CLI stays the source of truth.

---

## 8. Upload validation

1. Size limits on the zip and each image, and an allowlist of file types (`.typ`, `.toml`, `.png`, `.jpg`, `.svg`).
2. Parse `kit.toml`. Check the schema/core versions, check that `[fonts]` families exist in the library, and check that every file listed in `[layouts]` exists.
3. Compile every declared layout against the core fixture set:
   - long oracle text
   - 0-cost card
   - hybrid and phyrexian mana
   - `*/*` power/toughness
   - a very long card name
   - multi-face cards, for layouts that need them
   - every color and colorless
4. Any compile error, timeout, or wrong output size rejects the kit with the compiler's error message.
5. Passing renders become the gallery previews.

---

## 9. Layout coverage + fallback

- The manifest declares which layouts a kit supports.
- The UI shows coverage before a player applies a kit to a list, e.g. "covers 46/60 cards; 14 will use fallback".
- Fallback goes to a Duplimancy default kit. The player can instead pick a different kit per uncovered card.

Layouts to recognize: normal, split, flip, transform, modal_dfc, adventure, saga, class, leveler, planeswalker, battle, token, emblem, meld, prototype, mutate. Scryfall's `layout` values are the source of truth.

---

## 10. Legal / IP

- WotC owns the official frames, the Beleren and Matrix fonts, the mana and set symbols, and the card text.
- Proxies are a gray area. Hosting user uploads moves Duplimancy from tool to distributor.
- MVP mitigations:
  - an uploader license field and a ToS that puts responsibility on the uploader
  - a takedown/DMCA process
  - a "not for sale" print watermark option, or default-on
  - nudge designers toward original frames
- If card art comes from Scryfall, review Scryfall's API and image-use guidelines before launch.
- Consider invite-only uploads at launch, to limit both the legal and the DoS exposure.

---

## 11. Designer onboarding

Graphic artists think in layers, not functions, so writing code from a blank file is a big ask.

- Ship a **starter kit** where the 80% case is replacing PNG layers per color and adjusting coordinates in one config dict at the top of each file.
- Docs: a Typst primer (see `docs/typst-primer.md`), a schema reference, and the core lib API.
- Later: a browser kit editor with live typst.ts preview.

---

## 12. Open questions

- Card size and bleed: is 63×88mm the only target, or should 3mm bleed be standard in the schema?
- Do params apply per card, per list, or both?
- Kit versioning: when a kit updates, do saved lists auto-upgrade or stay pinned?
- Should kits be able to depend on other kits, e.g. to extend a base frame? Probably YAGNI for now.
- Moderation workflow for uploads.
