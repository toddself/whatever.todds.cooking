import { FileEntry } from './file-entry.ts'
import { Tag } from './tag-builder.ts'

const dateFormat: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "America/Los_Angeles"
}

export function entryTemplate({contents,  modified, tags}: FileEntry, index = false) {
  return `<article class="post">
  <div>${contents}</div>
  <time>${modified.toLocaleString('en-US', dateFormat)}</time>
  ${tags.length > 0 ? `Tags: <ul class="tags">${tags.map(t => `<li class="tags"><a href="tags.html#${t}">${t}</a>`).join('')}</ul>` : ''}
  ${index ? '' : '<nav><a href="index.html">back home</a></nav>'}
</article>`
}

export function pageTemplate(title: string, contents: string|string[], pagination?: string[]) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="content-type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Whatever Todd‘s Cooking. In a blog">
    <title>${title ? title : 'whatever todd‘s cooking'}</title>
    <link rel="stylesheet" href="style.css">
    <link rel="alternate" type="application/rss+xml" title="Whatever Todd's Cooking, but in RSS" href="https://whatever.todds.cooking/index.rss">
    <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "82fdb0078f0f4fefbdc9c3788047400d"}'></script>
  </head>
  <body>
  <header><a href="/" class="title"><h1>${title ? title : "whatever todd’s cooking"}</h1></a></header>
  <main class="content">
  ${Array.isArray(contents) ? contents.join('') : contents}
  </main>
  ${Array.isArray(pagination) ? `<nav class="content">Other posts: <ol class="tags">${pagination.map((p, i) => `<li class="tags"><a href="${p}">${i > 0 ? `page ${i}` : 'home'}</a>`)}</ol></nav>` : ''}
  <footer class="content">All content copyright © 2021, License: <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/">Attribution-NonCommercial-NoDerivatives 4.0 International</a> Source: <a href="https://github.com/toddself/whatever.todds.cooking">github</a></footer>
  </body>
</html>`
}

export function tagTemplate(tagList: Map<string, Tag[]>) {
  const data = ['<dl>']
  const tags = Array.from(tagList).map(a => a[0]).sort()
  for (const tag of tags) {
    const entries = tagList.get(tag)
    if (!Array.isArray(entries)) continue
    data.push(`<dt id="${tag}">${tag}</dt><dd><ul>${entries.map(e => `<li><a href="${e.href}">${e.title}</a>`).join('')}</ul></dd>`)
  }
  data.push('</dl>')
  return data.join('')
}

const truncateLength = 200
const ws = /\s/
function truncate (s: string){
  if (s.length < truncateLength) return s
  const source = [...s]
  const trunc = source.slice(0, truncateLength)
  const last = trunc[truncateLength - 1]
  if (!last.match(ws)) {
    const p = Array.from(trunc).reverse().findIndex(c => c.match(ws))
    const prev = truncateLength - p
    const prevDist = truncateLength - prev
    const n = source.slice(truncateLength).findIndex(c => c.match(ws))
    const next = truncateLength + n
    const nextDist = next - truncateLength
    if (prevDist > nextDist) {
      return s.substring(0, next) + '...'
    } else {
      return s.substring(0, prev) + '...'
    }
  }
  return trunc.join('') + '...'
}

export function rss(entries: FileEntry[]) {
  return `<?xml version="1.0"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <atom:link href="https://whatever.todds.cooking/index.rss" rel="self" type="application/rss+xml" />
    <title>whatever todd's cooking</title>
    <link>https://whatever.todds.cooking</link>
    <description>A blog about whatever, todd's cooking</description>
    <language>en-US</language>
    <copyright>Copyright ${new Date().getFullYear()} whatever.todds.cooking</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>whatever.todds.cooking</generator>
    <ttl>40</ttl>
    ${entries.map((e => {
      const entry = e.rawContents.split('\n')[1]
      return `<item>
      <title>${(e.title || "a mystery entry").replace(/&/g, '&amp;')}</title>
      <description>${truncate(entry).replace(/&/g, '&amp;')}</description>
      <pubDate>${e.modified.toUTCString()}</pubDate>
      <guid>https://whatever.todds.cooking/${e.fn}</guid>
      <link>https://whatever.todds.cooking/${e.fn}</link>
      <source url="https://whatever.todds.cooking">whatever, todd's cooking</source>
    </item>`
    })).join('')}
  </channel>
</rss>`
}
