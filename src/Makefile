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
DESTINATION = $(BASEDIR)/../docs

html:
	hugo --theme=$(THEME)  --destination $(DOCSDIR)

develop:
	sleep 1 && echo "Opening local browser..." &&  open http://localhost:1313 &
	hugo server --theme=$(THEME) --buildDrafts --watch --destination $(DESTINATION)

github: html
	rm -rf $(DESTINATION)/*
	hugo --destination $(DESTINATION)
	git add -A :/; git commit -m "Rebuilt site" ; git push


.PHONY: html clean develop
