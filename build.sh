#!/bin/bash

export CGO_ENABLED=0;

commit=$(git rev-parse --short HEAD 2> /dev/null || true)
version=${1:-0.0.0}

for GOOS in darwin linux; do
    for GOARCH in amd64; do
        export GOOS GOARCH;

        echo ----- Building $GOOS $GOARCH -----;
        go build -ldflags=" \
        -X 'main.CompiledVersion=$version' \
        -X 'main.CompiledPlatformName=$GOOS/$GOARCH' \
        -X 'main.CompiledTime=$(date)' \
        -X 'main.CompiledGitCommit=$commit' \
        " -o ../bin/$GOOS-$GOARCH/clic;
    done;
done;