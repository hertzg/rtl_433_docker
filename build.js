const Path = require("path");
const fetch = require("node-fetch");
const ChildProcess = require("child_process");
const Util = require("util");

const log = (first, ...args) =>
  console.log(`[%s] ${first}`, new Date().toISOString(), ...args);

const {
  IMAGE_BASENAME = "hertzg/rtl_433",
  BUILD_PLATFORMS = "linux/amd64,linux/386,linux/arm64,linux/ppc64le,linux/arm/v7,linux/arm/v6",
  ALPINE_VERSIONS = "3.13,3.12,3.11,3.10",
} = process.env;

const alpineVersions = ALPINE_VERSIONS.split(',')

const escape = (str) => str.replace('"', '\\"');

const variant = (tags, revision, alpine) => ({
  imageTags: tags,
  buildArgs: { rtl433GitRevision: revision, alpineVersion: alpine },
  args: [
    ...tags.flatMap((tag) => ["--tag", `${IMAGE_BASENAME}:${tag}`]),
    `--build-arg`,
    `rtl433GitRevision=${revision}`,
    `--build-arg`,
    `alpineVersion=${alpine}`,
  ],
});

const docker = (args, ...rest) =>
  new Promise((resolve, reject) => {
    const proc = ChildProcess.spawn("docker", args, ...rest);
    proc.once("error", reject);
    proc.once("exit", (code) => {
      if (!code) {
        return resolve();
      }
      reject(new Error(`Process exited with code ${code}`));
    });
    return proc;
  });

const buildx = (variant) => {
  const args = [
    "buildx",
    "build",
    ...variant.args,
    `--platform`,
    BUILD_PLATFORMS,
    "--push",
    "--pull",
    "--progress",
    "plain",
    ...process.argv.slice(2),
    "./rtl433",
  ];
  const cwd = __dirname;
  log("%s: $ docker %s", cwd, args.join(" "));
  return docker(args, { cwd, stdio: "inherit" });
};

const buildParallel = (variants, builder) => Promise.all(variants.map(builder));
const buildSerial = (variants, builder) =>
  variants.reduce(
    (chain, variant) => chain.then(() => builder(variant)),
    Promise.resolve()
  );

log("Fetching releases for github.com/merbanan/rtl_433");
fetch("https://api.github.com/repos/merbanan/rtl_433/tags")
  .then((res) => res.json())
  .then((tags) => tags.map((tag) => tag.name))
  .then(([latestGitTag, ...others]) => [
    variant(["latest", latestGitTag], latestGitTag, "latest"),
    variant(["master"], "master", "latest"),
    ...others.flatMap((gitTag) => [
      variant([`${gitTag}`], gitTag, "latest"),
    ]),
    ...alpineVersions.flatMap((alpine) => [
      variant([`alpine${alpine}-latest`, `alpine${alpine}-${latestGitTag}`], latestGitTag, alpine),
      variant([`alpine${alpine}-master`], "master", alpine),
      ...others.flatMap((gitTag) => [
        variant([`alpine${alpine}-${gitTag}`], gitTag, alpine),
      ]),
    ])
  ])
  .then((variants) => {
    log("Build all variants", variants);
    return buildParallel(variants, buildx);
  })
  .then(() => console.log("Done"))
  .catch((e) => {
    console.error(e);
    throw e;
  });
