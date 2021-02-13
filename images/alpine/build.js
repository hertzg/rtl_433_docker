const fetch = require("node-fetch");

const {
  IMAGE_BASENAME = "hertzg/rtl_433",
  BUILD_PLATFORMS = [
    "linux/386",
    "linux/amd64",
    "linux/arm/v6",
    "linux/arm/v7",
    "linux/arm64/v8",
    "linux/ppc64le",
    "linux/s390x",
  ].join(","),
  ALPINE_VERSIONS = "3.13,3.12",
} = process.env;

const alpineVersions = ALPINE_VERSIONS.split(",");

const variant = (tags, revision, alpine) => ({
  meta: { revision, alpineVersion: alpine },
  tags: tags.map((tag) => `${IMAGE_BASENAME}:${tag}`).join("\n"),
  buildArgs: [`rtl433GitRevision=${revision}`, `alpineVersion=${alpine}`].join(
    "\n"
  ),
  platforms: BUILD_PLATFORMS,
});

const variantsFromRevisions = (revisions, base, toImageTags) =>
  revisions.map((revision) =>
    variant(toImageTags(revision, base), revision, base)
  );

const fetchSourceGitTags = () =>
  fetch("https://api.github.com/repos/merbanan/rtl_433/tags")
    .then((res) => res.json())
    .then((tags) => tags.map((tag) => tag.name))
    .then(([latest, ...tags]) => ({ latest, tags }));

fetchSourceGitTags()
  .then(({ latest, tags: revisions }) => [
    /** Latest Alpine :alpine-latest-* **/
    variant(
      ["master", "alpine-master", "alpine-latest-master"],
      "master",
      "latest"
    ), // master - latest
    variant(
      [
        "latest",
        latest,
        "alpine-latest",
        `alpine-${latest}`,
        "alpine-latest-latest",
        `alpine-latest-${latest}`,
      ],
      latest,
      "latest"
    ), // latest - latest
    ...variantsFromRevisions(revisions, "latest", (revision) => [
      revision,
      `alpine-${revision}`,
      `alpine-latest-${revision}`,
    ]), // <revision>* - latest

    /** Other Alpines: :alpine<version>-* **/
    ...alpineVersions.flatMap((alpine) => [
      variant([`alpine-${alpine}-master`], "master", alpine), // master - <alpine>
      variant(
        [`alpine-${alpine}-latest`, `alpine-${alpine}-${latest}`],
        latest,
        alpine
      ), // latest - <alpine>
      ...variantsFromRevisions(revisions, alpine, (tag, alpine) => [
        `alpine-${alpine}-${tag}`,
      ]), // <revision>* - <alpine>
    ]),
  ])
  .then((variants) => {
    console.log(variants);
    console.log(
      `::set-output name=builds::${JSON.stringify({ include: variants })}`
    );
  });
