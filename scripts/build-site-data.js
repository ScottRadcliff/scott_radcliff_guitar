#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ARTICLES_DIR = path.join(__dirname, '..', 'content', 'articles');
const OUTPUT_MANIFEST = path.join(ARTICLES_DIR, 'index.json');
const OUTPUT_RSS = path.join(__dirname, '..', 'rss.xml');
const SITE_URL = process.env.SITE_URL || 'https://example.com';
const SITE_TITLE = 'Scott Radcliff Guitar';

function parsePost(fileName, content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`Missing frontmatter in ${fileName}`);
  }

  const raw = match[1];
  const body = match[2].trim();
  const lines = raw.split('\n');
  const meta = {};
  let inTags = false;

  for (const line of lines) {
    if (line.startsWith('tags:')) {
      inTags = true;
      meta.tags = [];
      continue;
    }

    if (inTags) {
      const tagLine = line.match(/^\s*-\s*(.+)$/);
      if (tagLine) {
        meta.tags.push(tagLine[1].trim());
        continue;
      }
      inTags = false;
    }

    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && value !== '') {
      meta[key] = value;
    }
  }

  if (!meta.slug) {
    meta.slug = fileName.replace(/\.md$/, '');
  }
  meta.file = `content/articles/${fileName}`;
  meta.summary = meta.summary || body.slice(0, 160).replace(/\s+/g, ' ');
  return meta;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildRss(posts) {
  const items = posts
    .map((post) => {
      const link = `${SITE_URL}/article.html?slug=${encodeURIComponent(post.slug)}`;
      const pubDate = new Date(post.date).toUTCString();
      return `
  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${escapeXml(link)}</link>
    <guid isPermaLink="true">${escapeXml(link)}</guid>
    <pubDate>${escapeXml(pubDate)}</pubDate>
    <description>${escapeXml(post.summary)}</description>
  </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>Articles and updates from Scott Radcliff Guitar</description>
    ${items}
  </channel>
</rss>`;
}

function main() {
  const files = fs.readdirSync(ARTICLES_DIR).filter((file) => file.endsWith('.md'));
  const posts = files
    .map((file) => {
      const filePath = path.join(ARTICLES_DIR, file);
      const raw = fs.readFileSync(filePath, 'utf8');
      const post = parsePost(file, raw);
      return {
        title: post.title || file,
        slug: post.slug,
        date: post.date || new Date().toISOString(),
        summary: post.summary || '',
        tags: post.tags || [],
        file: post.file
      };
    })
    .filter((post) => post.title)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  fs.writeFileSync(OUTPUT_MANIFEST, JSON.stringify(posts, null, 2));
  fs.writeFileSync(OUTPUT_RSS, buildRss(posts));
  console.log(`Generated ${OUTPUT_MANIFEST} and ${OUTPUT_RSS}`);
}

main();
