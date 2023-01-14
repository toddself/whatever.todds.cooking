#!/bin/bash

# download latest blog-builder
PLATFORM=$(uname | tr A-Z a-z)
ARCH=$(uname -m)
BIN_NAME="blog-builder-${PLATFORM}-${ARCH}"

if [ -f ${BIN_NAME} ]; then
  echo "Binary exists"
else
  echo "Binary doesn't exist, downloading latest version"
  DOWNLOAD_URL=$(curl -s https://api.github.com/repos/toddself/blog-builder/releases/latest | jq -r ".assets[] | select(.name == \"${BIN_NAME}\").browser_download_url")
  curl -sLO $DOWNLOAD_URL
  chmod +x ${BIN_NAME}
fi

./${BIN_NAME} data docs

# handle images
shopt -s nullglob dotglob
if [ -e $PWD/raw_images ]; then
  RAW_FILE_LIST=($PWD/raw_images/*jpg)
  if [ ${#RAW_FILE_LIST[@]} -gt 0 ]; then
    echo $RAW_FILE_LIST
    for IMG in $PWD/raw_images/*jpg; do
      BASE=$(basename $IMG)
      DEST="assets/${BASE}"
      echo "Converting ${IMG} to ${DEST}"
      convert "${IMG}" -resize 1600x1600 -quality 40 -strip "${DEST}"
    done
    rm $PWD/raw_images/*jpg
  fi
fi

# copy assets
cp -R assets/* docs/.
