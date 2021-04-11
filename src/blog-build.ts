import { join, isAbsolute, basename } from 'https://deno.land/std@0.90.0/path/mod.ts'

import { Marked } from 'https://deno.land/x/markdown@v2.0.0/mod.ts'

import { FileEntry } from './file-entry.ts'
import { entryTemplate, pageTemplate, rss } from './templates.ts'
import { TagBuilder } from './tag-builder.ts'
import { stripMarkdown } from './strip-markdown.ts'

const ENTRIES_PER_PAGE = 20

function* range(start: number, end: number): IterableIterator<number> {
  yield start;
  if (start === end) return;
  yield* range(++start, end)
}

export class BlogBuilder {
  srcDir: string
  destDir: string
  entriesPerPage: number
  _td: TextDecoder
  _te: TextEncoder
  recent: {[key: string]: string} = {}
  tb: TagBuilder = new TagBuilder()
  entryList: {[key: string]: FileEntry} = {}

  constructor (srcDir: string, destDir: string, entriesPerPage: number = ENTRIES_PER_PAGE) {
    this.srcDir = isAbsolute(srcDir) ? srcDir : join(Deno.cwd(), srcDir)
    this.destDir = isAbsolute(destDir) ? destDir : join(Deno.cwd(), destDir)
    this._td = new TextDecoder('utf-8')
    this._te = new TextEncoder()
    this.entriesPerPage = entriesPerPage
  }

  async createEntry (entry: FileEntry) {
    const contents = entryTemplate(entry)
    const page = pageTemplate('', contents, undefined)
    const outFn = join(this.destDir, basename(entry.fn.replace(/\md$/, 'html')))
    try {
      await Deno.writeFile(outFn, this._te.encode(page))
      console.log(`Wrote ${outFn}`)
    } catch (e) {
      console.log(`Unable to write ${outFn}`, e)
    }
  }

  fixQuotes (lines: string): string {
    const l = [...lines]
    let inQuote = false
    let inTag = false
    for (let i = 0, ll = l.length; i < ll; i++) {
      const char = l[i]
      if (char === '<') {
        inTag = true
      }
      if (char === '>') {
        inTag = false
      }
      if (char === "'") {
        l[i] = "’"
      }
      if (char === '"' && !inTag) {
        if (inQuote) {
          l[i] = '”'
          inQuote = false
        } else {
          l[i] = '“'
          inQuote = true
        }
      }
    }
    return l.join('')
  }

  async parseEntry(fn: string): Promise<FileEntry> {
    const entry = this._td.decode(await Deno.readFile(fn))
    const [modified, tags, ...blogText] = entry.split('\n')

    let mtime = new Date()
    if (modified.startsWith('$')) {
      mtime = new Date(modified.slice(1))
      if (isNaN(mtime.getTime())) {
        mtime = new Date()
      }
    } else {
      blogText.unshift(modified)
    }

    const tagList: string[] = []
    if (tags.startsWith('%')) {
      tagList.push.apply(tagList, tags.slice(1).split(',').map(a => a.trim()))
    } else{
      blogText.unshift(tags)
    }

    const titleLine = blogText.findIndex(a => a.trim().length > 0)
    const title = blogText[titleLine].slice(2)
    const u = `${basename(fn).replace(/md$/, 'html')}`

    blogText[titleLine] = `## [${blogText[titleLine].slice(2)}](${u})\n`
    const contents = Marked.parse(this.fixQuotes(blogText.join('\n').trim())).content

    return {
      modified: mtime,
      rawContents: stripMarkdown(blogText.join('')),
      fn,
      contents,
      tags: tagList,
      title: title,
      url: u
    }
  }

  async buildEntry (fn: string, skipTagging = false): Promise<FileEntry> {
    const e = await this.parseEntry(fn)
    if (!skipTagging) {
      e.tags.forEach(t => this.tb.add(t, e.title || '', e.url || ''))
    }
    this.entryList[fn] = e
    return e
  }

  async buildIndex () {
    const indexPages = this.getPaginatedEntryList()

    // make individual index pages for each chunk
    for (let i = 0, il = indexPages.length; i < il; i++) {
      const batch = indexPages[i]
      const entries = []
      for (const key of batch) {
        const contents = entryTemplate(await this.buildEntry(this.recent[key], true), true)
        entries.push(contents)
      }

      const pagination = []
      for (const i of range(0, il - 1)) {
        pagination.push(`index${i > 0 ? i : ''}.html`)
      }

      const index = pageTemplate('', entries, pagination.length > 1 ? pagination : undefined)
      const fn = join(this.destDir, `index${i > 0 ? i : ''}.html`)
      try {
        await Deno.writeFile(fn, this._te.encode(index))
        console.log('Wrote index')
      } catch (e) {
        console.log('Unable to write index', e)
        Deno.exit(1)
      }
    }
  }

  // sort by entry date, and create page chunks for paginating
  getPaginatedEntryList () {
    const sorted = Object.keys(this.recent)
      .sort((a, b) => parseInt(b.split(':')[0], 10) - parseInt(a.split(':')[0], 10))
    const indexPages = []
    let currIndex = 0
    for (let i = this.entriesPerPage, sl = sorted.length; currIndex < sl; i += this.entriesPerPage) {
      if (i > sl) i = sl
      indexPages.push(sorted.slice(currIndex, i))
      currIndex = i
    }
    return indexPages
  }

  async buildRSS() {
    const rssList = this.getPaginatedEntryList()[0]
      .map(entry => entry.split(':')[1] || '')

    const entries:FileEntry[] = await Promise.all(rssList.map(entry => {
      if (this.entryList[entry]) {
        return this.entryList[entry]
      } else {
        return this.parseEntry(entry)
      }
    }))

    const rssData = rss(entries)

    const fn = join(this.destDir, `index.rss`)
    try {
      await Deno.writeFile(fn, this._te.encode(rssData))
      console.log('Wrote rss')
    } catch (e) {
      console.log('Unable to write rss', e)
      Deno.exit(1)
    }
  }
  async buildTags () {
    const data = this._te.encode(this.tb.generate())
    const fn = join(this.destDir, 'tags.html')
    try {
      await Deno.writeFile(fn, data)
      console.log('Wrote tag list')
    } catch (e) {
      console.log('Unable to write tag list', e)
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
        const rk = `${entry.modified.getTime()}:${entry.fn}`
        this.recent[rk] = entry.fn
      }
    }

    await this.buildIndex()
    await this.buildTags()
    await this.buildRSS()
  }
}
