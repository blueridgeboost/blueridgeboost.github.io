#!/bin/bash

rm *_*

## define image directory
DIR="."

## define image sizes
sizes=(300 600 1200)

rm *_*

## imagemagick function
## convert $1(image) $2(width) $3(newname)
resize() {
  convert $1 -thumbnail $2 $3
}

## find all images
for image in $(find ${DIR} -maxdepth 1 -iregex ".*\.\(jpg\|gif\|png\|jpeg\)");
do
  ## get image width
  width=`convert $image -ping -format "%w" info:`

  ## get image path and name
  dir=$(dirname "$image")
  filename=$(basename "$image")

  ## set new image name
  newname="$dir"/"$width"_"$filename"

  ## resize image with original width
  resize "$image" $width "$newname"

  ## run through image sizes
  for size in ${sizes[@]}; do

    ## set new image name
    newname="$dir"/"$size"_"$filename"

    ## resize image with define widths
    resize "$image" $size "$newname"

  done
done
