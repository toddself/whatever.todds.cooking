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
  return `<div class="post">
  <div>${contents}</div>
  <time>${modified.toLocaleString('en-US', dateFormat)}</time>
  ${tags.length > 0 ? `Tags: <ul class="tags">${tags.map(t => `<li class="tags"><a href="tags.html#${t}">${t}</a>`)}</ul>` : ''}
  ${index ? '' : '<nav><a href="index.html">back home</a></nav>'}
</div>`
}

export function pageTemplate(title: string, contents: string|string[]) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="content-type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Whatever Todd's Cooking. In a blog">
    <title>${title ? title : 'whatever todds cooking'}</title>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
  <a href="/" class="title"><h1>${title ? title : "whatever todd's cooking"}</h1></a>
  <div class="content">
  ${Array.isArray(contents) ? contents.join('') : contents}
  <footer>All content copyright © 2021, License: <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/">Attribution-NonCommercial-NoDerivatives 4.0 International</a> Source: <a href="https://github.com/toddself/whatever.todds.cooking">github</a></footer>
  </div>
  </body>
</html>`
}

export function tagTemplate(tagList: Map<string, Tag[]>) {
  const data = ['<dl>']
  const tags = Array.from(tagList).map(a => a[0]).sort()
  for (const tag of tags) {
    const entries = tagList.get(tag)
    if (!Array.isArray(entries)) continue
    data.push(`<dt id="${tag}">${tag}</dt><dd><ul>${entries.map(e => `<li><a href="${e.href}">${e.title}</a>`)}</ul></dd>`)
  }
  data.push('</dl>')
  return data.join('')
}
