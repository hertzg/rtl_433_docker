const main = (_tags: string, _platforms: string) => {
  const tags = _tags.split("\n").map((s) => s.trim());
  const platforms = _platforms.split(",").map((s) => s.trim());

  const tagify = (text) => text.replace(/[^a-zA-Z0-9-_]/g, "_");

  const builds = platforms.map((platform) => ({
    platforms: platform,
    tags: tags.map((tag) => `${tag}-${tagify(platform)}`).join("\n"),
  }));

  const manifests = tags.map((tag) => ({
    tag: tag,
    sources: platforms
      .map((platform) => `${tag}-${tagify(platform)}`)
      .join(" "),
  }));

  return {
    builds,
    manifests,
  };
};

const res = main(
  [
    `foo/bar:1.0`,
    `foo/bar:1.0-alpine`,
    `foo/bar:1.0-alpine-3`,
    `foo/bar:1.0-alpine-3.19`,
    `foo/bar:1.0-alpine-3.19.0`,
    `ghcr.io/foo/bar:1.0`,
    `ghcr.io/foo/bar:1.0-alpine`,
    `ghcr.io/foo/bar:1.0-alpine-3`,
    `ghcr.io/foo/bar:1.0-alpine-3.19`,
    `ghcr.io/foo/bar:1.0-alpine-3.19.0`,
  ].join("\n"),
  ["linux/amd64"].join(",")
);

console.log(res);
