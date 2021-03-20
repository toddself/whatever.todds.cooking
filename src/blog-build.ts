import { join, isAbsolute, basename } from 'https://deno.land/std@0.90.0/path/mod.ts'
import { createHash } from 'https://deno.land/std@0.90.0/hash/mod.ts'

import { Marked } from 'https://deno.land/x/markdown@v2.0.0/mod.ts'

interface FileEntry {
  modified: Date
  created: Date
  fn: string
  contents: string
  hash: string
}

const dateFormat: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "long", day: "numeric"
}

function entryTemplate({contents, created, modified, fn}: FileEntry, index = false) {
  let mod =  ""
  if (created.getTime() !== modified.getTime()) {
    mod = `, Updated ${modified.toLocaleString('en-US', dateFormat)}`
  }

  const u = basename(fn).replace(/md$/, 'html')
  return `<div data-canonical="/${u}" class="post">
  <div>${contents}</div>
  <time>${created.toLocaleString('en-US', dateFormat)}${mod}</time>
  ${index ? '' : '<nav><a href="/index.html">back home</a></nav>'}
</div>`
}

function pageTemplate(title: string, contents: string|string[]) {
  return `<html>
  <head>
    <meta http-equiv="content-type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title ? title : 'whatever todds cooking'}</title>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
  ${title ? '' : "<h1>whatever todd's cooking</h1>"}
  <div class="content">
  ${Array.isArray(contents) ? contents.join('') : contents}
  </div>
  <script src="links.js"></script>
  </body>
</html>`
}

export class BlogBuilder {
  srcDir: string
  destDir: string
  _td: TextDecoder
  _te: TextEncoder
  recent: {[key: number]: string} = {}
  manifestFile: string

  constructor (srcDir: string, destDir: string) {
    this.srcDir = isAbsolute(srcDir) ? srcDir : join(Deno.cwd(), srcDir)
    this.destDir = isAbsolute(destDir) ? destDir : join(Deno.cwd(), destDir)
    this._td = new TextDecoder('utf-8')
    this._te = new TextEncoder()
    this.manifestFile = join(Deno.cwd(), 'data.json')
  }

  async createEntry (entry: FileEntry) {
    const contents = entryTemplate(entry)
    const page = pageTemplate('', contents)
    const outFn = join(this.destDir, basename(entry.fn.replace(/\md$/, 'html')))
    try {
      await Deno.writeFile(outFn, this._te.encode(page))
      console.log(`Wrote ${outFn}`)
    } catch (e) {
      console.log(`Unable to write ${outFn}`, e)
    }
  }

  async buildEntry (fn: string): Promise<FileEntry> {
    const { mtime, birthtime } = await Deno.stat(fn)
    const rawContents = this._td.decode(await Deno.readFile(fn))
    const contents = Marked.parse(rawContents).content
    const hash = createHash('sha1')

    const entry: FileEntry = {
      modified: mtime || new Date(),
      created: birthtime || new Date(),
      fn,
      contents,
      hash: hash.update(contents).toString()
    }
    return entry
  }

  async buildIndex () {
    const top10 = Object.keys(this.recent).sort().map(a => parseInt(a, 10)).slice(0, 10)
    const entries = []
    for (const key of top10) {
      const contents = entryTemplate(await this.buildEntry(this.recent[key]))
      entries.push(contents)
    }

    const index = pageTemplate('', entries)
    const fn = join(this.destDir, 'index.html')
    try {
      await Deno.writeFile(fn, this._te.encode(index))
      console.log('Wrote index')
    } catch (e) {
      console.log('Unable to write index', e)
      Deno.exit(1)
    }
  }

  async build (): Promise<void> {
    console.log(`Source: ${this.srcDir}, Output dir: ${this.destDir}`)

    try {
      await Deno.mkdir(this.destDir)
    } catch (e) {
      if (!(e instanceof Deno.errors.AlreadyExists)) {
        console.log(`Unable to create directory ${e.name}`, e)
      }
      console.log('Build directory exists')
    }

    for await (const e of Deno.readDir(this.srcDir)) {
      console.log(`Parsing ${e.name}`)
      if (e.isFile) {
        const fn = join(this.srcDir, e.name)
        const entry = await this.buildEntry(fn)
        await this.createEntry(entry)
        this.recent[entry.modified.getDate()] = entry.fn
      }
    }

    await this.buildIndex()
  }
}
