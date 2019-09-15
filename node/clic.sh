#!/bin/sh

#node /Users/mdisibio/src_p/clic/node/index.js $@
#echo "readlink:"
#readlink -n $0
#echo '${0} = ' ${0}
#echo '$0 = ' $0
#echo '$@ = ' $@

cmdName=${0##*/}
this=$(readlink -n ${0})
if [ "$this" == "" ]; then
    this=$0
fi
dir=$(dirname $this)

clic="$dir/index.js"

#echo "cmdName: $cmdName"
#echo "this: $this"
#echo "dir: $dir"
#echo "clic: $clic"

if [ $cmdName == 'clic' ] || [ $cmdName = 'clic.sh' ]; then
    #echo 'called as clic'
    #echo "dir is $dir"
    node $clic $@
else
    #echo 'called as something else'
    node $clic run $cmdName $@
fi