# Anhelo — design notes

Anhelo is Duplimancy's deterministic abstract art generator for proxies when the user has no art. Decision: never fetch or host official WotC art; users may upload their own.

Test bench (single-file HTML/SVG prototype): https://claude.ai/artifact/V1zhqnXCR5GQgXtnQPg74G

## Determinism
- Seed = `lowercase(card name) | salt`. Production should use Scryfall `oracle_id` instead of the name so reprints share art.
- PRNG: `xmur3` → `mulberry32`. Never `Math.random`.
- One independent seed stream per concern: `pal, bg, field, sym, motif, face, horizon, hero, figure, detail, grad, print, age`. Changing one setting (symmetry override, detail, palette mood) never reshuffles the others.
- All coordinates rounded to 0.1 → identical SVG across browsers. Output is pure SVG (CPU-deterministic; avoid WebGL).
- Palette mood is a recolour applied after the seeded picks: same card + salt gives the same composition in every mood.
- Detail lives in `<g class="d">` groups drawn from its own stream; stripping them yields the detail-off render exactly (used as a regression test).

## Inputs
Card name, colour identity (WUBRG / colourless), card type, mana value, salt. Settings: symmetry override, faces & figures (creatures & planeswalkers / every card / never), palette mood (balanced / vivid / pastel / aged parchment).

## Layer order (full-bleed cards)
1. Background gradient (linear or radial, 3 palette stops)
2. Field, chosen by type: bands, blobs, rings, rays, stripes, triangle mesh, ridges. Rich detail on each (strata lines, topo rings, dotted rings, hairlines, facet creases, pinstripes) + optional fabric print overlay.
3. Motif shapes under a symmetry group (see below)
4. Land horizons (lands only)
5. Focal form: hero shape (instant/sorcery/enchantment/battle) or planeswalker figure
6. Face (creatures)
7. Vignette, then parchment ageing overlay (parchment mood only)

Artifacts use **emblem mode** instead: plain ground, a central plate (round, 4/6/8/12-sided, or mirror-symmetric blob) with drop shadow; motif clipped inside the plate; rivets or ticks on the rim; round plates may carry an inscription band.

## Symmetry
Asymmetric; mirror (1 axis, any angle); mirror (2 axes); rotational Cn (2–12); kaleidoscope Dn (2–12); wallpaper groups p1, p2, pm, pg, pmm, p4, p4m; 2–3 independent rosettes. ~35% centred. Motif drawn once, repeated with `<use>`.

## Palettes
Per colour, 6 hand-picked HSL anchors, seeded jitter; multicolour cards take a share from each colour. Balanced = saturation × 0.86. Each palette colour gets three gradient variants (light→dark at a seeded angle, blend to next palette colour, radial highlight).
Moods: vivid (pre-reduction saturation), pastel (L 72–90, S × .55, warm-grey ink, artifacts always on a light ground), aged parchment (RGB blend toward sepia ~34%, colourless only ~16%; darks preserved; brown ink; burnt edges + foxing spots).

## Shapes
Abstract base set: circle, ring, polygon, diamond, arc, dots, blob, spirograph (hypotrochoid).
Colour-keyed set (mixed in at ~40%), **only in repeating layouts** (Cn, Dn, wallpaper, multi-rosette) — repetition makes icons read as ornament; scattered they read as clip-art stamps:
- W sun, feather, shield · U drop(s), cloud, crab claw · B skull, bat wings, crescent · R flame, lightning bolt, mountain · G leaf, paw, claw · C star, cylix, gear
- Skull, cylix, cloud, shield, mountain, bat are kept within ±25° of upright.

Rejected: icon stamps (game-icons.net / Font Awesome / Phosphor / Material Symbols) — removed; looked pasted on. Emoji — font rendering differs per OS and licensing for print. Diffusion models — contradict the "respect the artists" rationale; cost/moderation overhead.

## Fabric prints
One colour/cue shape tiled small (two per tile, seeded size/angle) as a dark and a light `<pattern>`; ~35% of field elements get a 20%-opacity overlay, light print on dark fills and vice versa.

## Inscriptions (magic-circle bands)
Scripts: I Ching trigrams (keyed to colour: W Heaven/Wind, U Lake/Water/Wind, B Water, R Fire/Thunder/Mountain, G Mountain/Earth, C Earth/Heaven), Elder Futhark, alchemical/planetary signs.
**Futhark excludes Othala, Algiz, Tiwaz, Sowilo** (appropriated by hate groups). Hexagrams avoided.
Placement: round artifact plates (60%; motif shrinks to leave a band), sorcery vortex (65%), enchantment orbit rings (75%).

## Lands
2–4 horizon layers with atmospheric perspective (each farther layer blends toward a haze colour; per-layer vertical gradient; haze glow band). Near layer: flat, waves, jagged, hills, mesa, dunes, with ground detail (contours, furrows, pebbles, tufts) clipped to it. ~55% get a structure on a middle layer: medieval town (low gabled houses, chimneys, conical towers, spires, onion domes, keeps; lit windows; often on a hill), castle, wizard tower, pyramids (lit face). Curling/Hokusai waves were tried and removed.

## Faces (creatures)
~45% headless (eyes/mouth floating on the symmetric design). Head types: human (sculpted cheekbones, jaw, chin), reptile/dragon (angular, crest, frills, scales), fish (fins, dorsal crest, gills, belly), beast (ears, fur tufts, muzzle, nose), demon (bone horns, heavy brow, sharp chin). Oval heads removed.
Eyes 1/2/3/4/6 in five styles; lids only level or sloping toward the nose (no sad/sleepy tilts), mirrored, outline drawn over the lid. Mouths: smile, fangs, teeth, o, flat, wave.

## Hero shapes
Instant → blast (starburst, comet, flame, bolt) · Sorcery → vortex (2–5 tapering spiral arms) · Enchantment → ring (gyroscope orbits, figure-eight, ribbon) · Battle → clash (two arrowheads + starburst). Placed on the symmetry centre; a forced face replaces the hero.

## Planeswalker figures
Frutiger-Metro-style pictogram silhouettes from rounded capsules with a floating head; 9 hand-authored poses (victory, cast, leap, stride, dancer, float, reach, guard, summon) with seeded jitter and mirroring; halo circles; optional orb in the highest hand. Procedural poses rejected (look broken).
**Clothing (two-tone):** body stays ink or glow; garments use palette colours with gradients, trim in glow or another palette colour. Outfit is seeded per card and **deliberately not keyed to colour identity**; name cues can force it (knight/paladin/soldier/Gideon… → armour; wizard/mage/witch/druid/priest… → robe).
- Robe (calm poses only; otherwise falls back to tunic): hem stretched between the feet, bell sleeves, sash, collar trim.
- Tunic: to mid-thigh, short sleeves, belt, boots.
- Armour: breastplate with centre ridge, tassets, greaves with knee cops, bracers, two-lame pauldrons rotated to the upper-arm angle.
- Plain (no garments), rare.
- Extras: cape flowing to a seeded side (behind body), scarf tails, headwear (hood, pointed wizard hat, helm, plumed crest helm, crown).
- Draw order: halo → cape/scarf/hood → body → garments → headwear → orb.

## Name cues
~40 keyword rules on the card name; applied only after the normal seeded picks, so unmatched cards are unchanged. Examples: elf → pointy ears; goblin → wide ears + fangs; dragon → reptile head; demon → demon head; cat/wolf/leonin → beast head; merfolk/shark → fish head; angel → halo; ghost → glowing eyes, headless; knight → armour; wizard → robe; bolt → lightning shapes / bolt hero; fire/lava/pyro → flames / flame hero; ring/orb/coin → round plate + rotation; gem/crystal → hexagonal plate; mountain/plains/swamp/desert → horizon kinds; city/gate/Baldur's/Waterdeep → town; castle/keep → castle; tower/academy → wizard tower.
Production: also read type-line subtypes (Elf, Dragon, Goblin…) and keywords — more reliable than names; matching is English-only.

## Next
- Port `anhelo()` to a TypeScript module behind an art-provider interface feeding the frame's art slot (alongside user upload and public-domain/CC0 museum search).
- Possible: cue-driven hero variants beyond flame/bolt/water; contrast check between figure body and garments in pastel mood.
