import { build, fetchVersions, getMeta, makeOutput, pick } from '../utils.js'

const REPOSITORIES = ['hertzg/rtl_433', 'ghcr.io/hertzg/rtl_433_docker']

const flavourConfigs = {
  alpine: (await import('./alpine/config.js')).default,
  debian: (await import('./debian/config.js')).default,
}

const getConfig = (build) => flavourConfigs[getMeta(build).flavour]

const buildImages = (versions, options = {}) =>
  build(versions, flavourConfigs, options)

const generateBuild = async ({ latest, tags, extras }) => {
  return {
    candidates: await buildImages([latest], {
      candidate: true,
    }),
    rest: await buildImages([...tags, ...extras]),
  }
}

const tagOverallLatest = async ({ candidates, rest }) => {
  const [toPromote, deferred] = pick(
    candidates,
    (latest) => getConfig(latest) === flavourConfigs.alpine
  )

  if (toPromote.length !== 1) {
    throw new Error(
      `No or multiple candidates selected for latest: ${JSON.stringify({
        selected: toPromote,
        candidates,
      })}`
    )
  }

  const [latest] = toPromote
  const promoted = await getConfig(latest).promote(latest)

  return [
    {
      ...promoted,
      tags: [...promoted.tags, 'latest'],
    },
    ...deferred,
    ...rest,
  ]
}

const tagOverallMaster = async (builds) => {
  // TODO: This script is quite unwiedly, simplifing the whole thing is not a bad idea
  const [toPromote] = pick(
    builds,
    (build) =>
      build.flavour === 'alpine' &&
      build.versions.alpine.includes('latest') &&
      build.versions.app.includes('master')
  )

  if (toPromote.length !== 1) {
    throw new Error(
      `No or multiple candidates selected for master: ${JSON.stringify({
        selected: toPromote,
      })}`
    )
  }

  // TODO: Prety hacky, ugh
  toPromote[0].tags.push('master')

  return builds
}

const outputBuilds = (builds) => {
  console.log(makeOutput('builds', JSON.stringify(builds)))
  return builds
}

const generateEntries = async (builds) => {
  return await Promise.all(
    builds.map(async (build) => ({
      ...build,
      entry: await getConfig(build).matrixEntry({
        ...build,
        fullTags: build.tags.flatMap((tag) =>
          REPOSITORIES.map((repo) => `${repo}:${tag}`)
        ),
      }),
    }))
  )
}

const createMatrices = async (builds) => ({ matrix: builds })

const createOutputs = async (matrices) =>
  Object.fromEntries(
    Object.entries(matrices).map(([name, builds]) => [
      name,
      { include: builds.map((b) => b.entry) },
    ])
  )

const writeOutputs = async (outputs) => {
  Object.entries(outputs).forEach(([name, output]) => {
    console.log(makeOutput(name, JSON.stringify(output)))
  })

  return outputs
}

const outputGitRefs = (versions) => {
  console.log(
    makeOutput(
      'gitRefs',
      JSON.stringify([versions.latest, ...versions.tags, ...versions.extras])
    )
  )
  return versions
}

await fetchVersions('merbanan/rtl_433', ['master'])
  .then(outputGitRefs)
  .then(generateBuild)
  .then(tagOverallLatest)
  .then(tagOverallMaster)
  .then(outputBuilds)
  .then(generateEntries)
  .then(createMatrices)
  .then(createOutputs)
  .then(writeOutputs)
