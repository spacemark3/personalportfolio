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
    blog/
      on-making-do.md     one post: frontmatter + its body
      notes-on-shipping.md
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

## Adding a blog post

1. Make a file in `content/en/blog/`. **Its name is the URL** —
   `on-making-do.md` is published at `/en/blog/on-making-do/` — so use
   lowercase letters, digits and single hyphens. Anything else fails the build.
   Renaming a file later changes a published address; that is the one thing
   here worth being careful about.
2. Order comes from `date:`, not from the filename — the opposite of a journey
   entry, which has no date and is ordered by its `10-`, `20-` prefix. Newest
   post first, everywhere.
3. `category:` is free text. Whatever you write becomes a group in the index,
   so a new subject is a new word rather than a list to go and update. The
   groups are ordered by their newest post, which puts whatever you are writing
   about now at the top.
4. Write the body as full Markdown: `##` and `###` headings, lists, `>` quotes,
   code fences, `**bold**`, links. (`#` is pushed down to `##` — the post's
   title is already the page's heading.)
5. Images go in `public/blog/` and are written `![alt](/blog/name.webp)`. The
   leading slash matters: it is what lets the site add its own path prefix when
   it is published.
6. Italian: drop a file with the **same name** into `content/it/blog/` and
   translate it. Until then the English post shows on both routes, with the
   nav, the index and the date in Italian around it — the post list is the same
   either way, so nothing disappears from the Italian index.

### A post's frontmatter

| field      | required | what it is                                      |
| ---------- | -------- | ----------------------------------------------- |
| `title`    | yes      | the post's title, and the page's heading         |
| `date`     | yes      | `YYYY-MM-DD` — what orders the index             |
| `category` | yes      | any word; it becomes a group in the index        |
| `summary`  | no       | one line under the title, and the page's meta description |

```markdown
---
title: "On making do"
date: "2026-02-14"
category: "Ideas"
summary: "What a bamboo house taught me about deleting code."
---

Every structure I have liked was mostly what someone left out.

## The house

It stood on stilts, and nothing in it was load-bearing twice.

- bamboo, because it was there
- a nipa roof, because it was cheap to replace
- no nails

> A good structure is mostly what you leave out.

The same is true of a `useEffect` you did not write. See
[the journey](/en/journey/) for the long version.
```

## Adding a language

1. Add it to `locales/` as a new JSON file, copied from `en.json`.
2. Add it to `locales` in `lib/i18n.ts`, with its name and abbreviation.
3. Copy `content/en/` to `content/<code>/` and translate.

Nothing else: the routes, the switcher, the hreflang tags and the `/`
redirect all read that one list.
