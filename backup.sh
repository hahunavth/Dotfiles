#!/bin/sh

git pull origin eos
echo "========== FILES =========="
while read f; do
    echo "BACKUP FILE $f..."
    cp -rf $HOME/$f ./data/ 
done < Dotfiles
echo "========== COMMIT =========="
echo "Backup files done, please commit!"

git add . -A
git commit -m "Backup at $(date)"
git push origin eos

echo "========== DONE =========="
