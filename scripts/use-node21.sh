#!/bin/bash
# Pin npm scripts to Node v21+ since system Node is 18 (Next 16 needs ≥20.9).
NODE21="$HOME/.nvm/versions/node/v21.7.1/bin"
if [ -d "$NODE21" ]; then
  export PATH="$NODE21:$PATH"
fi
exec "$@"
