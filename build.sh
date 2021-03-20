#!/bin/sh
DENO_CMD="${HOME}/.deno/bin/deno"
[ ! -f $DENO_CMD ] && curl -fsSL https://deno.land/x/install/install.sh | sh
$DENO_CMD run --allow-read --allow-write ./src/builder.ts --src data --dest dist
cp -R assets/* dist/.
