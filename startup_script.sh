#/bin/zsh

sleep 10;
notify-send Onedrive "Start tmux service ( oned )";
tmux new -A -D -s oned "onedrive --monitor"; 
