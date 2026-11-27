# Typst Primer

Typst is a modern LaTeX alternative: markup plus a real scripting language, compiles in milliseconds, and gives readable errors. You write `.typ` source and get PDF, PNG, or SVG output.

---

## Setup / CLI

| Command | Result |
|---|---|
| `typst compile main.typ` | → `main.pdf` |
| `typst watch main.typ` | rebuild on every save |
| `typst compile main.typ out-{p}.png --ppi 300` | one PNG per page |
| `typst compile main.typ --input key=val` | value available as `sys.inputs.key` |
| `--font-path ./fonts` | add local fonts (system fonts work by default) |

The web app at typst.app is a live editor, handy for experimenting.

---

## Three modes

- **Markup** (default): prose
- **Code**: start with `#`, or write inside `{ }`
- **Math**: `$...$` inline; `$ ... $` (with inner spaces) is a display block

```typ
= Heading
== Subheading

Plain text, *bold*, _italic_, `code`, #link("https://typst.app")[link].

- bullet
- bullet
+ numbered
+ numbered

Inline math $a^2 + b^2 = c^2$, block math:
$ sum_(i=1)^n i = (n(n+1))/2 $

See @intro.      // reference
= Intro <intro>  // label
```

---

## Code basics

```typ
#let mana = 3
#let name = "Llanowar Elves"
#let tags = ("elf", "druid")
#let card = (name: "Bolt", cost: "R")   // dictionary

#name costs #mana. First tag: #tags.at(0). #card.name

#if mana > 2 [Expensive] else [Cheap]

#for t in tags [- #t \ ]

// function returning content
#let pill(body, color: blue) = box(
  fill: color.lighten(70%), inset: 3pt, radius: 3pt, body
)
#pill[Legendary] #pill(color: red)[Instant]
```

- `[...]` is a content block (markup); `{...}` is a code block.
- Named args can have defaults. `..args` spreads or collects the rest.
- Arrays and strings have methods: `.map`, `.filter`, `.chunks`, `.join`, `.split`, `.len()`.

---

## Set rules: change defaults

```typ
#set page(paper: "us-letter", margin: 1in, numbering: "1")
#set text(font: "Libertinus Serif", size: 11pt)
#set par(justify: true, leading: 0.6em)
#set heading(numbering: "1.1")
```

A set rule changes a function's default arguments from that point to the end of the current scope.

---

## Show rules: restyle or transform

```typ
// restyle every heading
#show heading: it => block(fill: luma(230), inset: 6pt, it)

// replace text everywhere
#show "MTG": smallcaps

// whole-document template
#let template(title: "", body) = {
  set page(header: align(right, title))
  body
}
#show: template.with(title: "Proxy Sheet")
```

A show rule intercepts an element and rebuilds it. It works like a CSS selector, except you can run arbitrary code.

---

## Layout primitives

```typ
#align(center)[Centered]
#v(1em) #h(1fr)             // vertical / horizontal space; fr = fill remaining
#box(width: 2cm)[inline]    // inline container
#block(width: 100%)[block]  // block container
#place(top + right, dx: -5mm)[floating]  // absolute position within parent

#grid(columns: (1fr, 2fr), gutter: 8pt, [left], [right])

#table(
  columns: 3,
  table.header[*Name*][*Cost*][*Type*],
  [Bolt], [R], [Instant],
  [Elves], [G], [Creature],
)

#image("art.png", width: 50%, fit: "cover")
```

Units: `pt mm cm in em %`, plus `fr` (fraction of leftover space).

---

## Loading data

```typ
#let rows = csv("cards.csv", row-type: dictionary)
#let deck = json("deck.json")
#let raw-txt = read("list.txt")
```

Data plus loops gives you generated documents. This is the useful part for Duplimancy.

---

## Duplimancy example: 3×3 proxy sheet

`cards.csv`:

```
name,art,frame
Lightning Bolt,bolt.jpg,red-retro
Llanowar Elves,elves.jpg,green-retro
```

`sheet.typ`:

```typ
#let cw = 63mm
#let ch = 88mm
// center a 3×3 block on letter: (215.9-189)/2, (279.4-264)/2
#set page(paper: "us-letter", margin: (x: 13.45mm, y: 7.7mm))
#set text(font: "Beleren", size: 9pt)

#let cards = csv("cards.csv", row-type: dictionary)

#let card(c) = box(width: cw, height: ch, clip: true, stroke: 0.2pt + gray)[
  #place(image("art/" + c.art, width: 100%, height: 100%, fit: "cover"))
  #place(image("frames/" + c.frame + ".png", width: 100%, height: 100%))
  #place(top + left, dx: 4.5mm, dy: 4mm, text(weight: "bold", c.name))
]

#grid(
  columns: 3 * (cw,),
  rows: ch,
  ..cards.map(card)
)
```

- The grid breaks across pages automatically once 9 cards fill a page.
- `stroke` on each box doubles as a thin cut line. For bleed, make the box larger than the card and draw crop marks with `place`.
- Edit the CSV and `typst watch` regenerates the PDF immediately.

---

## Packages

- `#import "template.typ": *` imports a local file.
- `#import "@preview/<pkg>:<ver>"` pulls a package from Typst Universe (e.g. cetz for drawing). Check typst.app/universe for current versions.

---

## Gotchas

- `#` is required in markup and never used inside `{}`. Mixing these up is the most common error.
- To put a variable directly before text, close it with `;` or wrap it in parens: `#(x)px`.
- Anything that depends on where it lands in the document (counters, page numbers, measuring) needs `context`: `#context counter(page).display()`.
- Images and fonts can't be loaded from URLs. Everything has to be a local file.

---

## Fit for Duplimancy

- Typst beats browser print CSS for exact mm print output: page breaks are deterministic and nothing gets silently scaled.
- Running Typst in the browser means WASM (typst.ts), which is a heavy dependency.
- Suggested split: HTML+CSS for the editor and preview, Typst for the final PDF export. Don't maintain two competing renderers.
