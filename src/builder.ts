import { parse } from 'https://deno.land/std@0.90.0/flags/mod.ts'

import { BlogBuilder } from './blog-build.ts'

const { src, dest } = parse(Deno.args)

const builder = new BlogBuilder(src, dest)
await builder.build()
