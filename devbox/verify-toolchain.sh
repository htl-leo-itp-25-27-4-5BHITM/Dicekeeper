#!/usr/bin/env bash
set -euo pipefail

java -version
mvn --version
node --version
npm --version
npx --version
tsc --version
git --version
ssh -V
psql --version
openspec --version
bash --version | sed -n '1p'
curl --version | sed -n '1p'
jq --version
tar --version | sed -n '1p'
unzip -v | sed -n '1p'
zip --version | sed -n '2p'
