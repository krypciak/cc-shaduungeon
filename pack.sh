#!/bin/sh
BASE_NAME="$(jq '.id' ccmod.json | sed 's/^"//;s/"$//')"
NAME="${BASE_NAME}-$(jq '.version' ccmod.json | sed 's/^"//;s/"$//').ccmod"
rm -rf "$BASE_NAME"*
pnpm install
pnpm run build
zip -r "$NAME" ./ -x "*.ccmod" "*.zip" "node_modules/*" ".git*" "*.ts" "README.md" "tsconfig.json" "pack.sh" "package-lock.json"
