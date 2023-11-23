#for file in `ls *.jpg`
#do 
	cwebp -q 80 $1 -o  "${1%.jpg}.webp"
	for size in 300 600 1100 1440 1770 2048
	do
		cwebp -q 80 -resize $size 0 $1 -o "${size}_${1%.jpg}.webp"
	done
#done
