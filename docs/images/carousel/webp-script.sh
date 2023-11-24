for file in `ls *.jpg`
do 
	for size in 300 400 500 600 1100 1440 1770 2048
	do
		cwebp -resize $size 0 $file -o "${size}_${file%.jpg}.webp"
	done
done
