const { matrixEntryConverter, promoteAppendTags } = require('../shared')

const loadAlpineVersions = (() => {
  const versions = {
    latest: '3.14',
    rest: ['3.13', '3.12'],
  }

  return async () => versions
})()

const variant = (version, alpine, override = (s) => s) =>
  override({
    id: `alpine-${alpine}-${version}`,
    flavour: 'alpine',
    buildArgs: {
      alpineVersion: alpine,
      rtl433GitVersion: version,
    },
    tags: [`alpine-${alpine}-${version}`],
    platforms: [
      'linux/386',
      'linux/amd64',
      'linux/arm/v6',
      'linux/arm/v7',
      'linux/arm64/v8',
      'linux/ppc64le',
      'linux/s390x',
    ],
    cacheScope: `alpine-${alpine}`
  })

module.exports = {
  promote: promoteAppendTags(['alpine-latest-latest', 'alpine-latest']),
  candidate: async ({ version }) => {
    const { latest } = await loadAlpineVersions()

    return variant(version, latest, (defaults) => ({
      ...defaults,
      versions: {
        overall: [],
        app: ['latest', version],
        alpine: ['latest', latest],
      },
      tags: [
        ...defaults.tags,
        `alpine-latest-${version}`,
        `alpine-${version}`,
        'alpine',
      ],
    }))
  },
  rest: async ({ version }) => {
    const { latest, rest } = await loadAlpineVersions()

    return [
      variant(version, latest, (defaults) => ({
        ...defaults,
        versions: { app: [version], alpine: ['latest', latest] },
        tags: [
          ...defaults.tags,
          `alpine-latest-${version}`,
          `alpine-${version}`,
        ],
      })),
      ...rest.map((alpine) =>
        variant(version, alpine, (defaults) => ({
          ...defaults,
          versions: { app: [version], alpine: [alpine] },
        }))
      ),
    ]
  },
  matrixEntry: matrixEntryConverter({
    context: './images/alpine/build-context',
    file: './images/alpine/build-context/Dockerfile',
  }),
}
