###
### Makefile for building and pushing site
###

GITHUB_PAGES_BRANCH=gh-pages

DESTINATION = ../docs

develop: 
	sleep 1 && echo "Opening local browser..." &&  open http://localhost:1313 &
	hugo server  --disableFastRender --buildDrafts --watch --destination $(DESTINATION)

update:
	cd ../../brb-utils; git pull; cd src; node config-generation.js

clean:
	rm -rf $(DESTINATION)

html: 
	hugo  --destination $(DESTINATION) 

copy:
	cp ../CNAME $(DESTINATION)
#	cp -r data/.well-known $(DESTINATION)


github: clean html copy 
	git add -A :/; git commit -m "Rebuilt site" ; git push

githubdev: clean html copy 
	git add -A :/; git commit -m "Rebuilt site" ; git push

.PHONY: html clean develop
