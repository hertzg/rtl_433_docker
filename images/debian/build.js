const { fetchSourceGitTags } = require("../../utils");

const {
  IMAGE_BASENAME = "hertzg/rtl_433",
  BUILD_PLATFORMS = [
    "linux/386",
    "linux/amd64",
    // "linux/arm/v5", // fails to install build dependencies
    "linux/arm/v7",
    "linux/arm64/v8",
    "linux/mips64le",
    "linux/ppc64le",
    // "linux/s390x", // fails to install runtime dependencies
  ].join(","),
  DEBIAN_VERSIONS = "bullseye,buster",
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
    //console.log(variants);
    console.log(
      `::set-output name=builds::${JSON.stringify({ include: variants })}`
    );
  });
