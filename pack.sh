#!/bin/sh
BASE_NAME="$(jq '.id' ccmod.json | sed 's/^"//;s/"$//')"
NAME="${BASE_NAME}-$(jq '.version' ccmod.json | sed 's/^"//;s/"$//').ccmod"
rm -rf "$BASE_NAME"*
esbuild --target=es2018 --format=esm --platform=node --bundle --outfile='plugin.js' 'src/plugin.ts'
zip -r "$NAME" ./ -x "*.zip" "node_modules/*" ".git*" "*.ts" "README.md" "tsconfig.json" "pack.sh" "package-lock.json"
