const fetch = require("node-fetch");

const {
  IMAGE_BASENAME = "hertzg/rtl_433",
  BUILD_PLATFORMS = "linux/amd64,linux/386,linux/arm64/v8,linux/arm/v7,linux/arm/v6,linux/ppc64le,linux/mips64le",
  DEBIAN_VERSIONS = "bullseye,buster,stretch,jessie",
} = process.env;

const debianVersions = DEBIAN_VERSIONS.split(",");

const variant = (tags, revision, debian) => ({
  meta: { revision, debianVersion: debian },
  tags: tags.map((tag) => `${IMAGE_BASENAME}:${tag}`).join("\n"),
  buildArgs: [`rtl433GitRevision=${revision}`, `debianVersion=${debian}`].join(
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
    /** Latest debian :debian-latest-* **/
    variant(
      ["debian-master", "debian-latest-master"],
      "master",
      "latest" /*  */
    ), // master - latest
    variant(
      [
        latest,
        "debian-latest",
        `debian-${latest}`,
        "debian-latest-latest",
        `debian-latest-${latest}`,
      ],
      latest,
      "latest"
    ), // latest - latest
    ...variantsFromRevisions(revisions, "latest", (revision) => [
      `debian-${revision}`,
      `debian-latest-${revision}`,
    ]), // <revision>* - latest

    /** Other debians: :debian-<version>-* **/
    ...debianVersions.flatMap((debian) => [
      variant([`debian-${debian}-master`], "master", debian), // master - <debian>
      variant(
        [`debian-${debian}-latest`, `debian-${debian}-${latest}`],
        latest,
        debian
      ), // latest - <debian>
      ...variantsFromRevisions(revisions, debian, (tag, debian) => [
        `debian-${debian}-${tag}`,
      ]), // <revision>* - <debian>
    ]),
  ])
  .then((variants) => {
    console.log(variants);
    console.log(
      `::set-output name=builds::${JSON.stringify({ include: variants })}`
    );
  });
