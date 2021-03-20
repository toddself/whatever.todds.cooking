# whatever.todds.cooking

[The blog](https://whatever.todds.cooking), but like, in source format. 


This is written using [Deno](https://deno.land) -- you'll need like 1.8.1 or higher.  I guess you could use this to make your own blog too? This runs in netlify.

## Usage

Create a directory of markdown files.  The first line in the file should start with a `$` and have a date parseable by javascript's `new Date` constructor. If you omit this, it's fine, the post will receive no date and be pinned to the top of the blog.

The title is the next line. It's gonna get autolinked to the page that hosts the entry.  It should be an `##` for an `h2` tag. It'll be coerced into that no matter what you do, so like, jokes on you.

Then run `deno run --allow-read --allow-write src/builder.ts --src [your directory of markdown] --dest [where you want it]`  Anything in `assets` will be copied over to the destination directory as well.

Everything is very minimally formatted, you can change the templates in `src/templates.ts` and the minimal styles are in `assets/style.css`.


## License
Copyright © 2021 Todd Kennedy
See LICENSE for details in this repo.
