#!/bin/sh
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
runtime_dir="$repo_dir/dist/vendor/jsmol/16.3.33"
runtime_script="$runtime_dir/JSmol.min.js"
runtime_core="$runtime_dir/j2s/core/corejmol.z.js"

if [ ! -s "$runtime_script" ] || [ ! -s "$runtime_core" ]; then
	printf 'Production build is incomplete: the pinned JSmol runtime is missing from dist.\n' >&2
	exit 1
fi

runtime_script_size=$(wc -c < "$runtime_script" | tr -d ' ')
runtime_core_size=$(wc -c < "$runtime_core" | tr -d ' ')

if [ "$runtime_script_size" -lt 100000 ] || [ "$runtime_core_size" -lt 1000000 ]; then
	printf 'Production build is invalid: a JSmol JavaScript asset is unexpectedly small.\n' >&2
	exit 1
fi

printf 'Verified JSmol runtime in production build.\n'
