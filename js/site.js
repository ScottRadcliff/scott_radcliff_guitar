const currentPage = window.location.pathname.split('/').pop();

function safeText(value) {
  return value.replace(/[&<>"']/g, function (char) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function parseFrontmatter(markdownText) {
  const fmMatch = markdownText.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) {
    return { meta: {}, body: markdownText };
  }

  const raw = fmMatch[1];
  let body = markdownText.slice(fmMatch[0].length).replace(/^\s*#\s+.+\n+/, '');
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
      const listMatch = line.match(/^\s*-\s*(.+)$/);
      if (listMatch) {
        meta.tags.push(listMatch[1].trim());
        continue;
      }
      inTags = false;
    }

    const [key, ...rest] = line.split(':');
    if (!key || rest.length === 0) continue;
    const value = rest.join(':').trim();
    meta[key.trim()] = value;
  }

  return { meta, body };
}

function mdToHtml(input) {
  const esc = (text) => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let text = esc(input);
  text = text.replace(/^#{1,6}\s(.+)$/gm, (m, h) => {
    const level = m.indexOf(' ');
    return `<h${level}>${h}</h${level}>`;
  });
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  text = text.replace(/^```(\w*)\n([\s\S]*?)\n```$/gm, '<pre><code>$2</code></pre>');
  text = text.replace(/<h1>/g, '<h2>').replace(/<\/h1>/g, '</h2>');
  text = text.replace(/(?:^|\n)(\* .+(?:\n\* .+)*)/g, (match) => {
    const rows = match.trim().split('\n').map((r) => `<li>${r.replace(/^\* /, '')}</li>`).join('');
    return `<ul>${rows}</ul>`;
  });
  text = `<p>${text}</p>`;
  text = text.replace(/\n{2,}/g, '</p><p>');
  text = text.replace(/<p>(<h\d>)/g, '$1');
  text = text.replace(/(<\/h\d>)<\/p>/g, '$1');
  text = text.replace(/<p>(<ul>)/g, '$1');
  text = text.replace(/(<\/ul>)<\/p>/g, '$1');
  text = text.replace(/<p>(<pre><code>[\s\S]*?<\/code><\/pre>)<\/p>/g, '$1');

  return text;
}

function makeArticleCard(article) {
  const tags = Array.isArray(article.tags) ? article.tags : [];
  const tagHtml = tags
    .map((tag) => `<span class="tag">${safeText(tag)}</span>`)
    .join(' ');

  return `
    <article class="panel">
      <p class="muted">${formatDate(article.date)}</p>
      <h2>${safeText(article.title)}</h2>
      <p>${safeText(article.summary || '')}</p>
      <p>${tagHtml}</p>
      <a href="article.html?slug=${encodeURIComponent(article.slug)}">Read article →</a>
    </article>
  `;
}

function makeDownloadCard(item) {
  const priceLabel = item.isFree ? 'Free' : `${item.currency || 'USD'} ${item.price}`;
  return `
    <article class="panel">
      <p>
        <span class="tag ${item.isFree ? 'is-free' : 'is-paid'}">${safeText(priceLabel)}</span>
        <span class="tag">${safeText(item.type || '')}</span>
      </p>
      <h2>${safeText(item.title)}</h2>
      <p>${safeText(item.description || '')}</p>
      <a
        class="btn btn--primary"
        href="${safeText(item.url || '#')}"
        target="${item.url && item.url.startsWith('http') ? '_blank' : '_self'}"
        rel="noreferrer"
      >${item.isFree ? 'Download' : 'Purchase'}</a>
    </article>
  `;
}

async function loadArticles() {
  const response = await fetch('content/articles/index.json');
  if (!response.ok) return [];
  return await response.json();
}

async function loadDownloads() {
  const response = await fetch('content/downloads.json');
  if (!response.ok) return [];
  return await response.json();
}

async function renderArticlesPage() {
  const articles = await loadArticles();
  const list = document.getElementById('article-list');
  if (!list) return;
  if (!articles.length) {
    list.innerHTML = '<p class="muted">No articles yet. Add markdown files in content/articles.</p>';
    return;
  }
  list.innerHTML = articles.map(makeArticleCard).join('');
}

async function renderArticlePage() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) {
    document.getElementById('article-title').textContent = 'Missing article';
    return;
  }

  const articles = await loadArticles();
  const article = articles.find((item) => item.slug === slug);
  if (!article) {
    document.getElementById('article-title').textContent = 'Article not found';
    return;
  }

  const fileResponse = await fetch(article.file);
  if (!fileResponse.ok) {
    document.getElementById('article-title').textContent = 'Article file unavailable';
    return;
  }
  const markdown = await fileResponse.text();
  const parsed = parseFrontmatter(markdown);
  document.getElementById('article-title').textContent = article.title;
  document.getElementById('article-meta').textContent = `${formatDate(article.date)} — ${article.tags?.join(', ')}`;
  document.getElementById('article-content').innerHTML = mdToHtml(parsed.body);

  const shareLink = document.getElementById('share-link');
  shareLink.href = `mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(location.href)}`;
}

async function renderDownloads() {
  const downloads = await loadDownloads();
  const list = document.getElementById('download-list');
  if (!list) return;
  if (!downloads.length) {
    list.innerHTML = '<p class="muted">No downloadables available yet.</p>';
    return;
  }
  list.innerHTML = downloads.map(makeDownloadCard).join('');
}

function setFooterYear() {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
}

(async () => {
  setFooterYear();

  if (currentPage === 'articles.html') {
    await renderArticlesPage();
    return;
  }

  if (currentPage === 'article.html') {
    await renderArticlePage();
    return;
  }

  if (currentPage === 'downloads.html') {
    await renderDownloads();
    return;
  }
})().catch(() => {
  // leave graceful fallback text in the page if fetch fails
});
