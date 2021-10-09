#!/bin/sh

git pull origin eos
while read f; do
    echo "Backup file $f..."
    cp -Rrf $HOME/$f ./$f
done < Dotfiles
echo "Backup files done, please commit!"

git add . -A
git commit -m "Backup at $(date)"
git push origin eos
