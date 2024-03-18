#!/bin/bash
echo STAGE 2: INSTALL CONDA, PYTHON, ...
set -x

cd /tmp

curl https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -o Miniconda3-latest-Linux-x86_64.sh
chmod +x Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh -b

echo NOTE: require export path...

cd -
