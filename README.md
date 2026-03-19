# Scott Radcliff Guitar Website

Static marketing site for Scott Radcliff Guitar with articles, downloads, contact, and RSS.

## What’s included

- Clean, typography-first landing page
- Markdown-authored articles
- Downloads catalog (free and paid)
- Contact form for Netlify Forms
- Bio page
- RSS feed generated from markdown article source
- Netlify deploy configuration

## Project structure

- `index.html` — landing page
- `articles.html` — article listing page
- `article.html` — individual article page
- `downloads.html` — downloadable resources
- `contact.html` — contact form
- `bio.html` — about section
- `css/styles.css` — site styling
- `js/site.js` — frontend data/rendering logic
- `scripts/build-site-data.js` — build step that generates:
  - `content/articles/index.json`
  - `rss.xml`
- `content/articles/` — markdown articles
- `content/downloads.json` — downloads catalog
- `netlify.toml` — Netlify build settings
- `.gitignore` — ignores generated artifacts and local tooling files

## Getting started locally

1. Build article index + RSS:

```bash
node scripts/build-site-data.js
```

2. Start a local web server (required for `fetch()`):

```bash
python3 -m http.server 8000
```

3. Open your browser to:

```text
http://localhost:8000
```

## Netlify local workflow

For full local behavior (including Netlify form detection), run:

```bash
npx netlify-cli dev
```

Or install globally:

```bash
npm i -g netlify-cli
netlify dev
```

## Publishing

- Netlify uses `netlify.toml` with:
  - `publish = "."`
  - `command = "node scripts/build-site-data.js"`
- On each deploy, Netlify rebuilds `content/articles/index.json` and `rss.xml` from markdown.

## Adding a new article

1. Create a new file in `content/articles/` with frontmatter, for example:

```md
---
title: My New Article
slug: my-new-article
date: 2026-03-19
summary: One-line summary
tags:
  - practice
  - technique
---

# My New Article

Write your article body here.
```

2. Run:

```bash
node scripts/build-site-data.js
```

3. Commit generated `rss.xml` (optional if generated at deploy) and test locally.

## RSS

- Feed location: `rss.xml`
- Feed metadata is generated from:
  - article title
  - article date
  - slug-based article link
  - summary

Set `SITE_URL` if deploying to a real domain:

```bash
SITE_URL=https://your-domain.com node scripts/build-site-data.js
```

## Notes

- `content/articles/index.json` and `rss.xml` are now ignored for future commits via `.gitignore`.
- Keep the article body from starting with a markdown `#` title if you want all pages to use a single title render.
- Contact form submits via Netlify Forms using the `<form data-netlify="true">` setup in `contact.html`.

