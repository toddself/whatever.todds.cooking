import { tagTemplate, pageTemplate } from './templates.ts'

export interface Tag {
  title: string
  href: string
}

export class TagBuilder {
  tagList: Map<string, Tag[]> = new Map()

  add (tag: string, title: string, href: string) {
    const tl = this.tagList.get(tag) || []
    tl.push({title, href})
    this.tagList.set(tag, tl)
  }

  generate () {
    const tagContent = tagTemplate(this.tagList)
    const pageContent = pageTemplate('Entries by Tag', tagContent)
    return pageContent
  }
}
