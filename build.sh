#!/usr/bin/env sh
# Assemble the deployable static site into ./site (index.html at root,
# everything on relative paths so it serves at any origin, incl.
# https://<name>.tailor.zone). No build tooling required.
set -eu
rm -rf site
mkdir -p site
cp index.html site/
cp -r css js fonts assets site/
# LAGOM — the cozy plant-care life-sim. Shares js/ and fonts/ via ../ paths,
# so it just drops in as a subfolder of the deployed site.
cp -r lagom site/
echo "Built ./site:"
find site -type f | sort
