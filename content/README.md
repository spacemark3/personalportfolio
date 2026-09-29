# Editing the content

Everything a reader reads lives here as Markdown, one mirrored tree per
language. `content.ts` holds only what has no language: the name, and the
sketchbook's file list.

```
content/
  en/
    about.md              the hero kicker (frontmatter) + the bio (body)
    journey/
      _chapters.md        the page lede and the chapter list, in order
      10-selexi.md        one entry: frontmatter + its paragraph
      20-agm-solutions.md
      …
  it/                     the same file names, in Italian
```

UI strings — nav labels, button names, page titles — are not here. They live
in `locales/en.json` and `locales/it.json`.

## Changing some text

Open the file in `content/en/`, edit it, then open the same file name in
`content/it/`. That is the whole workflow. If the Italian copy of a file is
missing, the English one is shown in its place rather than failing the
build — so a new entry can go up in one language and be translated after.

## Adding a journey entry

1. Copy an existing entry, e.g. `content/en/journey/20-agm-solutions.md`.
2. Name it so it sorts where you want it inside its chapter — the number
   prefix is the only thing that orders entries (`10-`, `20-`, `30-`…).
   Leave gaps, so a later entry can be slotted between two without renaming
   anything.
3. Set `chapter:` to one of the keys in `_chapters.md` (`tech`, `other`,
   `studies`). A key that isn't in that list fails the build with a message
   naming the file — an entry never silently disappears from the page.
4. Write the body as one paragraph. It can be hard-wrapped over several
   lines; single line breaks are joined back into one sentence. Its first
   letter becomes the drop cap.
5. Copy it to `content/it/journey/` under the **same file name** and
   translate it.

### An entry's frontmatter

| field      | required | what it is                                     |
| ---------- | -------- | ---------------------------------------------- |
| `chapter`  | yes      | a chapter key from `_chapters.md`              |
| `title`    | yes      | the role, the degree, the certification        |
| `place`    | yes      | the company, the school, the issuing body      |
| `span`     | yes      | "2023 - 2024", "in corso", "during studies"    |
| `subtitle` | no       | what the work actually was, in one line        |
| `note`     | no       | an aside: honours, a credential, the stack     |

Links and emphasis work in any body text (`[label](https://…)`, `*emphasis*`)
— it is Markdown, rendered inline into the page's own paragraph.

## Adding a language

1. Add it to `locales/` as a new JSON file, copied from `en.json`.
2. Add it to `locales` in `lib/i18n.ts`, with its name and abbreviation.
3. Copy `content/en/` to `content/<code>/` and translate.

Nothing else: the routes, the switcher, the hreflang tags and the `/`
redirect all read that one list.
