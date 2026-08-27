#!/bin/sh
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
molden_path=${1:-"$repo_dir/test/fixtures/jsmol/orbitals.molden"}
esp_path=${2:-"$repo_dir/test/fixtures/jsmol/ESP.cube"}

jmol_version=16.4.21
jmol_archive_name="Jmol-$jmol_version-binary.zip"
jmol_sha256=c79372ea7a61ab5dbe77c48e17017fe70cb2883b14c250e982e9877c0ff9752a
jmol_url="https://downloads.sourceforge.net/project/jmol/Jmol/Version%2016.4/Jmol%20$jmol_version/$jmol_archive_name"
cache_dir=${JMOL_TEST_CACHE_DIR:-"${TMPDIR:-/tmp}/molmaker-jsmol-test/$jmol_version"}
archive_path="$cache_dir/$jmol_archive_name"
jmol_jar=${JMOL_JAR:-"$cache_dir/jmol-$jmol_version/Jmol.jar"}

mkdir -p "$cache_dir"

if [ -z "${JMOL_JAR:-}" ]; then
	if [ ! -f "$archive_path" ]; then
		curl -fL --retry 2 --connect-timeout 20 "$jmol_url" -o "$archive_path"
	fi

	actual_sha256=$(node -e 'const fs=require("fs");const crypto=require("crypto");const p=process.argv[1];process.stdout.write(crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"));' "$archive_path")
	if [ "$actual_sha256" != "$jmol_sha256" ]; then
		printf 'Jmol archive checksum mismatch: expected %s, got %s\n' "$jmol_sha256" "$actual_sha256" >&2
		exit 1
	fi

	unzip -oq "$archive_path" "jmol-$jmol_version/Jmol.jar" -d "$cache_dir"
fi

if [ ! -f "$jmol_jar" ]; then
	printf 'Jmol.jar not found at %s\n' "$jmol_jar" >&2
	exit 1
fi

classes_dir="$cache_dir/classes"
mkdir -p "$classes_dir"
javac -cp "$jmol_jar" -d "$classes_dir" "$repo_dir/test/jsmol/JmolArtifactVerifier.java"
java -cp "$classes_dir:$jmol_jar" JmolArtifactVerifier "$molden_path" "$esp_path"
