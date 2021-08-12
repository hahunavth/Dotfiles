" thêm script này vào file init.vim
" load .vim files in ~/config/nvim/configs
for f in split(glob('~/.config/nvim/configs/*.vim'), '\n')
   exe 'source' f
endfor
