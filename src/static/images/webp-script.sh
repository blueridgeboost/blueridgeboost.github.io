#!/bin/bash

## define image directory
DIR="."

## define image sizes
sizes=(320 640 1280)

## imagemagick function
## convert $1(image) $2(width) $3(newname)
resize() {
  convert $1 -thumbnail $2 $3
}

## find all images
for image in $(find ${DIR} -maxdepth 1 -iregex ".*\.\(jpg\|gif\|png\|jpeg\)");
do
  ## get image path and name
  dir=$(dirname "$image")
  filename=$(basename "$image")

  cwebp -q 50 -resize 800 0 $image -o ${filename%.*}.webp

  ## run through image sizes
  for size in ${sizes[@]}; do

    ## set new image name
    newname="$dir"/"$size"_"${filename%.*}.webp"

    ## resize image with define widths
    cwebp -q 50 -resize $size 0 "$image" -o "$newname"

  done
done
