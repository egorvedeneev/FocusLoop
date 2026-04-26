#!/usr/bin/env sh
set -eu

alembic upgrade head

if [ "${SEED_ON_START:-true}" = "true" ]; then
  python -m app.seed
fi

exec "$@"
