###
### Makefile for building and pushing site
###

GITHUB_PAGES_BRANCH=gh-pages

DESTINATION = ../docs


update:
	node ./staticjs/config-generation.js

clean:
	rm -rf $(DESTINATION)


html: 
	hugo  --destination $(DESTINATION) 

copy:
	cp ../CNAME $(DESTINATION)
#	cp -r data/.well-known $(DESTINATION)


github: clean update refresh html copy 
	git add -A :/; git commit -m "Rebuilt site" ; git push

githubdev: clean update refresh html copy 
	git add -A :/; git commit -m "Rebuilt site" ; git push

develop: update
	sleep 1 && echo "Opening local browser..." &&  open http://localhost:1313 &
	hugo server  --disableFastRender --buildDrafts --watch --destination $(DESTINATION)

.PHONY: develop
