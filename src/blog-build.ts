import { join, isAbsolute, basename } from 'https://deno.land/std@0.90.0/path/mod.ts'

import { Marked } from 'https://deno.land/x/markdown@v2.0.0/mod.ts'

import { FileEntry } from './file-entry.ts'
import { entryTemplate, pageTemplate } from './templates.ts'

export class BlogBuilder {
  srcDir: string
  destDir: string
  _td: TextDecoder
  _te: TextEncoder
  recent: {[key: string]: string} = {}
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
    const rawContents = this._td.decode(await Deno.readFile(fn))
    const [modified, ...content] = rawContents.split('\n')
    let mtime = new Date()
    if (modified.startsWith('$')) {
      mtime = new Date(modified.slice(1))
      if (isNaN(mtime.getTime())) {
        mtime = new Date()
      }
    } else {
      content.unshift(modified)
    }
    const contents = Marked.parse(content.join('\n').trim()).content

    const entry: FileEntry = {
      modified: mtime || new Date(),
      fn,
      contents,
    }
    return entry
  }

  async buildIndex () {
    console.log(`All posts: ${Object.keys(this.recent).join(', ')}`)
    const top10 = Object.keys(this.recent)
      .sort((a, b) => parseInt(b.split(':')[0], 10) - parseInt(a.split(':')[0], 10))
      .slice(0, 10)
    const entries = []
    for (const key of top10) {
      const contents = entryTemplate(await this.buildEntry(this.recent[key]), true)
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
        const rk = `${entry.modified.getTime()}:${entry.fn}`
        this.recent[rk] = entry.fn
      }
    }

    await this.buildIndex()
  }
}
