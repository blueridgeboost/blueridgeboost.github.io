#!/bin/bash

## define image directory
DIR="."

## define image sizes
sizes=(300 600 1200)

## imagemagick function
## convert $1(image) $2(width) $3(newname)
resize() {
  convert $1 -thumbnail $2 $3
}

rm *_*

## find all images
for image in $(find ${DIR} -iregex ".*\.\(jpg\|gif\|png\|jpeg\)");
do

  ## get image width
  width=`convert $image -ping -format "%w" info:`

  ## get image path and name
  dir=$(dirname "$image")
  filename=$(basename "$image")

  ## set new image name
  newname="$width"_"$filename"

  echo "$image $width $newname"

  ## resize image with original width
  resize "$image" $width "$newname"

  ## run through image sizes
  for size in ${sizes[@]}; do

    ## set new image name
    newname="$size"_"$filename"

    ## resize image with define widths
    resize "$image" $size "$newname"

  done
done
