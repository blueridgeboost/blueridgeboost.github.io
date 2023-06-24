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

sass:
	 sass themes/brb/static/assets/sass/custom.scss themes/brb/static/css/style.blue.css

html: sass
	hugo --theme=$(THEME)  --destination $(DOCSDIR)

develop: sass
	sleep 1 && echo "Opening local browser..." &&  open http://localhost:1313 &
	hugo server --theme=$(THEME) --buildDrafts --watch --destination $(DESTINATION)

github: html
	rm -rf $(DESTINATION)/*
	hugo --destination $(DESTINATION)
	cp ../CNAME $(DESTINATION)
	git add -A :/; git commit -m "Rebuilt site" ; git push


.PHONY: html clean develop
