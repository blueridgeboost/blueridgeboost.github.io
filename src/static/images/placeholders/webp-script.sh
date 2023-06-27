for file in `ls *.png`
do 
	for size in 300 400 500 600 1100 1440 1770 2048
	do
		cwebp.exe -resize $size 0 $file -o "${size}_${file%.png}.webp"

	done
done
