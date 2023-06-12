for file in *.gif
do
	cwebp -q 70 "$file" -o "${file%.gif}.webp"
	cwebp -q 5 "$file" -o "low-${file%.gif}.webp"

done
for file in *.jpg
do
        cwebp -q 70 "$file" -o "${file%.jpg}.webp"
	cwebp -q 5 "$file" -o "low-${file%.jpg}.webp"
done
for file in *.png
do
        cwebp -q 70 "$file" -o "${file%.png}.webp"
	cwebp -q 5 "$file" -o "low-${file%.png}.webp"
done
