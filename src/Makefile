###
### Makefile for building and pushing site
###

GITHUB_PAGES_BRANCH=gh-pages
# THEME = brb

DESTINATION = ../docs

develop: 
	sleep 1 && echo "Opening local browser..." &&  open http://localhost:1313 &
	hugo server  --buildDrafts --watch --destination $(DESTINATION)

clean:
	rm -rf $(DESTINATION)

html: 
	hugo  --destination $(DESTINATION) 

copy:
	cp ../CNAME $(DESTINATION)

minify:
	mv $(DESTINATION)/js/bundle.min.js $(DESTINATION)/js/bundle.js
	uglifyjs $(DESTINATION)/js/bundle.js\
         -o $(DESTINATION)/js/bundle.min.js -c -m \
         --source-map "root='http://blueridgeboost.com/js',url='bundle.min.js.map'"

compress:
	find ../docs/ -type f -name *.html -exec gzip -k "{}" \;
	find ../docs/ -type f -name *.html -exec brotli -f -o "{}.br" "{}" \;
	find ../docs/ -type f -name *.js -exec gzip -k "{}" \;
	find ../docs/ -type f -name *.js -exec brotli -f -o "{}.br" "{}" \;
	find ../docs/ -type f -name *.css -exec gzip -k "{}" \;
	find ../docs/ -type f -name *.css -exec brotli -f -o "{}.br" "{}" \;
	find ../docs/ -type f -name *.xml -exec gzip -k "{}" \;
	find ../docs/ -type f -name *.xml -exec brotli -f -o "{}.br" "{}" \;
	find ../docs/ -type f -name *.svg -exec gzip -k "{}" \;
	find ../docs/ -type f -name *.svg -exec brotli -f -o "{}.br" "{}" \;


github: clean html copy 
#minify compress
	git add -A :/; git commit -m "Rebuilt site" ; git push

githubdev: clean html copy 
	git add -A :/; git commit -m "Rebuilt site" ; git push

.PHONY: html clean develop
