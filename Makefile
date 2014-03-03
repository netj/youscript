# Makefile for YouScript web site

STAGEDIR = gh-pages
DEPENDSDIR = .depends

include buildkit/modules.mk
buildkit/modules.mk:
	git submodule update --init

# maintain gh-pages repo
$(POLISHED): stage-gh-pages-git
stage-gh-pages-git:
	@echo 'cd $(STAGEDIR); git status'
	@set -eu; cd $(STAGEDIR); \
[ -d .git ] || { \
    rm -rf ../.git.clone; \
    git clone --no-checkout --shared .. ../.git.clone; \
    mv -f ../.git.clone/.git .; \
    rm -rf ../.git.clone; \
    git remote add     github https://github.com/netj/youscript.git || true; \
    git remote set-url github https://github.com/netj/youscript.git; \
    git fetch github; \
    git read-tree github/gh-pages; \
    git checkout --quiet -B gh-pages --track github/gh-pages; \
}; \
git add --all .; \
git add --update .; \
git status


# publish to GitHub
publish: polish
	@set -eu; cd $(STAGEDIR); \
git commit -a -m "publishing $(shell git rev-parse HEAD)$(shell \
	[ `git status --porcelain | wc -l` -eq 0 ] || echo +WIP)" || true; \
git push github gh-pages
