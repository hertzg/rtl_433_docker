const { fetchVersions, getMeta, build, pick } = require('../utils')
const _ = require('lodash')

const flavourConfigs = {
  alpine: require('./alpine/config'),
  debian: require('./debian/config'),
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

const generateEntries = async (builds) => {
  return await Promise.all(
    builds.map(async (build) => ({
      ...build,
      entry: await getConfig(build).matrixEntry({
        ...build,
        fullTags: build.tags.map((tag) => `hertzg/rtl_433:${tag}`),
      }),
    }))
  )
}

const createMatrices = async (builds) => {
  const flavours = _.groupBy(builds, (build) => getMeta(build).flavour)
  console.log({ flavours })
  return flavours
}

const createOutputs = async (matrices) =>
  Object.fromEntries(
    Object.entries(matrices).map(([name, builds]) => [
      name,
      { include: builds.map((b) => b.entry) },
    ])
  )

const writeOutputs = async (outputs) => {
  console.log({ outputs })

  Object.entries(outputs).forEach(([name, output]) => {
    console.log(`::set-output name=${name}::${JSON.stringify(output)}`)
  })
}

fetchVersions('merbanan/rtl_433', ['master'])
  .then(generateBuild)
  .then(tagOverallLatest)
  .then(generateEntries)
  .then(createMatrices)
  .then(createOutputs)
  .then(writeOutputs)
