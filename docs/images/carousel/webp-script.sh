for file in *.gif
do
	cwebp -q 70 "$file" -o "${file%.gif}.webp"
done
for file in *.jpg
do
        cwebp -q 70 "$file" -o "${file%.jpg}.webp"
done
for file in *.png
do
        cwebp -q 70 "$file" -o "${file%.png}.webp"
done
