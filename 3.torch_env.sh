#!/bin/bash
echo STAGE 3: Setup pytorch for development
set -x

#conda init zsh

# note: using python 3.10
conda create -n py310 python=3.10 -y
conda activate py310
conda install pytorch torchvision torchaudio cpuonly -c pytorch -y
pip install -U scikit-learn librosa soundfile tqdm hyperpyyaml tensorboard
