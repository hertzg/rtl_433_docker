const { matrixEntryConverter, promoteAppendTags } = require('../shared')

const loadDebianVersions = (() => {
  const versions = {
    latest: 'buster',
    rest: [],
  }

  return async () => versions
})()

const variant = (version, debian, override = (s) => s) =>
  override({
    id: `debian-${debian}-${version}`,
    flavour: 'debian',
    tags: [`debian-${debian}-${version}`],
    buildArgs: {
      debianVersion: debian,
      rtl433GitVersion: version,
    },
    platforms: [
      // 'linux/386', // fails to install build dependencies
      'linux/amd64',
      // "linux/arm/v5", // fails to install build dependencies
      'linux/arm/v7',
      'linux/arm64/v8',
      'linux/mips64le',
      'linux/ppc64le',
      'linux/s390x', // fails to install runtime dependencies
    ],
    cacheScope: `debian-${debian}-${version}`
  })

module.exports = {
  promote: promoteAppendTags(['debian-latest-latest', 'debian-latest']),
  candidate: async ({ version }) => {
    const { latest } = await loadDebianVersions()

    return variant(version, latest, (defaults) => ({
      ...defaults,
      versions: {
        overall: [],
        app: ['latest', version],
        debian: ['latest', latest],
      },
      tags: [
        ...defaults.tags,
        `debian-latest-${version}`,
        `debian-${version}`,
        'debian',
      ],
    }))
  },
  rest: async ({ version }) => {
    const { latest, rest } = await loadDebianVersions()

    return [
      variant(version, latest, (defaults) => ({
        ...defaults,
        versions: { app: [version], debian: ['latest', latest] },
        tags: [
          ...defaults.tags,
          `debian-latest-${version}`,
          `debian-${version}`,
        ],
      })),
      ...rest.map((debian) =>
        variant(version, debian, (defaults) => ({
          ...defaults,
          versions: { app: [version], debian: [debian] },
        }))
      ),
    ]
  },
  matrixEntry: matrixEntryConverter({
    context: './images/debian/build-context',
    file: './images/debian/build-context/Dockerfile',
  }),
}
