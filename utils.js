const fetch = require('node-fetch')

const fetchSourceGitTags = (repo) =>
  fetch(`https://api.github.com/repos/${repo}/tags`)
    .then((res) => res.json())
    .then((tags) => tags.map((tag) => tag.name))
    .then(([latest, ...tags]) => ({ latest, tags }))

const fetchVersions = async (repo, extras) =>
  fetchSourceGitTags(repo).then((tags) => ({ ...tags, extras }))

const kVariantMeta = Symbol('kVariantMeta')

const withMeta = (object, meta) => ({ ...object, [kVariantMeta]: meta })

const buildFlavours = async (version, flavours, options) =>
  Object.fromEntries(
    await Promise.all(
      Object.entries(flavours).map(async ([name, config]) => {
        const props = { version }
        const meta = {
          flavour: name,
          version,
          options,
        }

        const builds = options.candidate
          ? [withMeta(await config.candidate(props), meta)]
          : (await config.rest(props)).map((build) => withMeta(build, meta))

        return [name, builds]
      })
    )
  )

const build = async (versions, flavours, options = {}) =>
  (
    await Promise.all(
      versions.flatMap(async (version) =>
        Object.values(await buildFlavours(version, flavours, options))
      )
    )
  ).flatMap((s) => s.flatMap((v) => v))

const getMeta = (obj) => obj[kVariantMeta]

const pick = (array, predicate) =>
  array.reduce(
    (acc, entry) => {
      acc[predicate(entry) ? 0 : 1].push(entry)
      return acc
    },
    [[], []]
  )

module.exports = { build, pick, getMeta, fetchVersions }
