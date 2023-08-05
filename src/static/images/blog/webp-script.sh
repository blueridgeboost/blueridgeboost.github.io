#for file in `ls *.jpg`
#do 
	for size in 300 600 1100 1440 1770 2048
	do
		cwebp.exe -q 80 -resize $size 0 $1 -o "${size}_${1%.jpg}.webp"
	done
#done
