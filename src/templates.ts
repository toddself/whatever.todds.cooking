import { basename } from 'https://deno.land/std@0.90.0/path/mod.ts'
import { FileEntry } from './file-entry.ts'

const dateFormat: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "America/Los_Angeles"
}

export function entryTemplate({contents,  modified, fn}: FileEntry, index = false) {
  const u = basename(fn).replace(/md$/, 'html')
  return `<div data-canonical="/${u}" class="post">
  <div>${contents}</div>
  <time>${modified.toLocaleString('en-US', dateFormat)}</time>
  ${index ? '' : '<nav><a href="/index.html">back home</a></nav>'}
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
  ${title ? '' : "<h1>whatever todd's cooking</h1>"}
  <div class="content">
  ${Array.isArray(contents) ? contents.join('') : contents}
  <footer>All content copyright © 2021, license: <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/">Attribution-NonCommercial-NoDerivatives 4.0 International</a></footer>
  </div>
  <script src="links.js"></script>
  </body>
</html>`
}
