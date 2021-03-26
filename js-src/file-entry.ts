export interface FileEntry {
  modified: Date
  fn: string
  rawContents: string
  contents: string
  tags: string[]
  title?: string
  url?: string
}
