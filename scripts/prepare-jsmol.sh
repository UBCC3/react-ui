#!/bin/sh
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
jsmol_version=16.3.33
archive_path="$repo_dir/vendor/jsmol-$jsmol_version-runtime.tar.gz"
checksum_path="$archive_path.sha256"
runtime_dir="$repo_dir/public/vendor/jsmol/$jsmol_version"
marker_path="$runtime_dir/.molmaker-runtime-sha256"

if [ ! -f "$archive_path" ] || [ ! -f "$checksum_path" ]; then
	printf 'Pinned JSmol archive or checksum is missing under %s/vendor.\n' "$repo_dir" >&2
	exit 1
fi

expected_sha256=$(awk 'NR == 1 { print $1 }' "$checksum_path")
actual_sha256=$(node -e 'const fs=require("fs");const crypto=require("crypto");const p=process.argv[1];process.stdout.write(crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"));' "$archive_path")

if [ -z "$expected_sha256" ] || [ "$actual_sha256" != "$expected_sha256" ]; then
	printf 'JSmol archive checksum mismatch: expected %s, got %s.\n' "$expected_sha256" "$actual_sha256" >&2
	exit 1
fi

if [ -s "$runtime_dir/JSmol.min.js" ] && \
	[ -s "$runtime_dir/j2s/core/corejmol.z.js" ] && \
	[ -f "$marker_path" ] && \
	[ "$(cat "$marker_path")" = "$actual_sha256" ]; then
	exit 0
fi

stage_dir=$(mktemp -d "${TMPDIR:-/tmp}/molmaker-jsmol.XXXXXX")
cleanup() {
	rm -rf "$stage_dir"
}
trap cleanup EXIT HUP INT TERM

tar -xzf "$archive_path" -C "$stage_dir"

if [ ! -s "$stage_dir/jsmol/JSmol.min.js" ] || \
	[ ! -s "$stage_dir/jsmol/j2s/core/corejmol.z.js" ]; then
	printf 'Pinned JSmol archive does not contain the required browser runtime.\n' >&2
	exit 1
fi

mkdir -p "$(dirname "$runtime_dir")"
rm -rf "$runtime_dir"
mv "$stage_dir/jsmol" "$runtime_dir"
printf '%s' "$actual_sha256" > "$marker_path"

printf 'Prepared JSmol %s under public/vendor/jsmol/%s.\n' "$jsmol_version" "$jsmol_version"
