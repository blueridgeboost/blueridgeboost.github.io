for file in *.gif
do
	cwebp -q 80 "$file" -o "${file%.gif}.webp"
done
