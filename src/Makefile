###
### Makefile for building and pushing site
###

GITHUB_PAGES_BRANCH=gh-pages
THEME = brb

MARKDOWN = python3 -m markdown
BASEDIR = .
LATEXDIR = $(BASEDIR)/latex
DOCSDIR = $(BASEDIR)/docs
PAGEDIR = $(BASEDIR)/content/
LATEXIFY = python3 $(LATEXDIR)/utils/latexify.py

html:
	hugo --theme=$(THEME)  --destination ../public

develop:
	sleep 1 && echo "Opening local browser..." &&  open http://localhost:1313 &
	hugo server --theme=$(THEME) --buildDrafts --watch --destination ../public

github: html
	rm -rf ../public/*
	hugo --destination ../public
	git add -A :/; git commit -m "Rebuilt site" ; git push


.PHONY: html clean develop
