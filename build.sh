#!/bin/bash

# make blog
DENO_CMD="${HOME}/.deno/bin/deno"
[ ! -f $DENO_CMD ] && curl -fsSL https://deno.land/x/install/install.sh | sh
$DENO_CMD run --allow-read --allow-write ./src/builder.ts --src data --dest dist

# handle images
shopt -s nullglob dotglob
if [ -e $PWD/raw_images ]; then
  RAW_FILE_LIST=($PWD/raw_images/*)
  if [ ${#RAW_FILE_LIST[@]} -gt 0 ]; then
    echo $RAW_FILE_LIST
    for IMG in $RAW_FILE_LIST; do
      BASE=$(basename $IMG)
      DEST="assets/${BASE}"
      convert "${IMG}" -resize 1600x1600 -quality 40 -strip "${DEST}"
    done
  fi
fi

# copy assets
cp -R assets/* dist/.
