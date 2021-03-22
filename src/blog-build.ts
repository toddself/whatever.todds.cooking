import { join, isAbsolute, basename } from 'https://deno.land/std@0.90.0/path/mod.ts'

import { Marked } from 'https://deno.land/x/markdown@v2.0.0/mod.ts'

import { FileEntry } from './file-entry.ts'
import { entryTemplate, pageTemplate } from './templates.ts'
import { TagBuilder } from './tag-builder.ts'

export class BlogBuilder {
  srcDir: string
  destDir: string
  _td: TextDecoder
  _te: TextEncoder
  recent: {[key: string]: string} = {}
  tb: TagBuilder = new TagBuilder()

  constructor (srcDir: string, destDir: string) {
    this.srcDir = isAbsolute(srcDir) ? srcDir : join(Deno.cwd(), srcDir)
    this.destDir = isAbsolute(destDir) ? destDir : join(Deno.cwd(), destDir)
    this._td = new TextDecoder('utf-8')
    this._te = new TextEncoder()
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

  async buildEntry (fn: string, skipTagging = false): Promise<FileEntry> {
    const rawContents = this._td.decode(await Deno.readFile(fn))
    const [modified, tags, ...blogText] = rawContents.split('\n')

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

    const u = `${basename(fn).replace(/md$/, 'html')}`
    const titleLine = blogText.findIndex(a => a.trim().length > 0)
    if (!skipTagging) {
      tagList.forEach(t => this.tb.add(t, blogText[titleLine].slice(2), u))
    }
    blogText[titleLine] = `## [${blogText[titleLine].slice(2)}](${u})\n`
    const contents = Marked.parse(blogText.join('\n').trim()).content

    const entry: FileEntry = {
      modified: mtime || new Date(),
      fn,
      contents,
      tags: tagList
    }
    return entry
  }

  async buildIndex () {
    const top10 = Object.keys(this.recent)
      .sort((a, b) => parseInt(b.split(':')[0], 10) - parseInt(a.split(':')[0], 10))
      .slice(0, 10)
    const entries = []
    for (const key of top10) {
      const contents = entryTemplate(await this.buildEntry(this.recent[key], true), true)
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
  }
}
