#!/bin/sh
# Usage: merge-manifest.sh <target> <platform-image>...
#
# Merges the platform images into the <target> index, but only when they differ
# from what <target> already holds. Every build attaches a provenance attestation
# that records the run URL, commit and build times, so merging unconditionally
# would give the tag a new index digest every night even when no image changed.
set -eu

target="$1"
shift

# Sorted digests of the image manifests in the given indexes, ignoring attestations.
image_digests() {
  for ref in "$@"; do
    docker buildx imagetools inspect --raw "$ref"
  done | jq -rs '[.[].manifests[]?
    | select(.annotations["vnd.docker.reference.type"] != "attestation-manifest")
    | .digest] | sort | join(" ")'
}

wanted=$(image_digests "$@")
current=$(image_digests "$target" 2>/dev/null || true)

if [ -n "$wanted" ] && [ "$wanted" = "$current" ]; then
  echo "$target: platform images unchanged, keeping the current index"
  exit 0
fi

docker buildx imagetools create -t "$target" "$@"
