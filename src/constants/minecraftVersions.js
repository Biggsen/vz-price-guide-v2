const MINECRAFT_VERSIONS = [
	{
		id: '1.16',
		key: '1_16',
		label: 'Minecraft 1.16',
		format: 'classic',
		patches: [0, 4, 5],
		public: true
	},
	{
		id: '1.17',
		key: '1_17',
		label: 'Minecraft 1.17',
		format: 'classic',
		patches: [0, 1],
		public: true
	},
	{
		id: '1.18',
		key: '1_18',
		label: 'Minecraft 1.18',
		format: 'classic',
		patches: [0, 2],
		public: true
	},
	{
		id: '1.19',
		key: '1_19',
		label: 'Minecraft 1.19',
		format: 'classic',
		patches: [0, 1, 2, 3, 4],
		public: true
	},
	{
		id: '1.20',
		key: '1_20',
		label: 'Minecraft 1.20',
		format: 'classic',
		patches: [0, 1, 2, 3, 4, 5, 6],
		public: true
	},
	{
		id: '1.21',
		key: '1_21',
		label: 'Minecraft 1.21',
		format: 'classic',
		patches: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
		public: true
	},
	// Year/gamedrop format: catalog id is the gamedrop (e.g. 26.2); no patch segment
	{
		id: '26.2',
		key: '26_2',
		label: 'Minecraft 26.2',
		format: 'gamedrop',
		patches: [],
		public: false
	}
]

function parseVersionParts(version) {
	if (!version) return null
	const normalized = String(version).trim().replace('_', '.')
	const parts = normalized.split('.')
	if (parts.length < 2) return null
	const major = parseInt(parts[0], 10)
	const minor = parseInt(parts[1], 10)
	if (Number.isNaN(major) || Number.isNaN(minor)) return null
	return { major, minor }
}

export function getAllVersions() {
	return MINECRAFT_VERSIONS.map((v) => v.id)
}

export function getPublicVersions() {
	return MINECRAFT_VERSIONS.filter((v) => v.public).map((v) => v.id)
}

export function getDefaultVersion() {
	const publicVersions = MINECRAFT_VERSIONS.filter((v) => v.public)
	return publicVersions[publicVersions.length - 1]?.id ?? null
}

export function getOldestVersion() {
	return MINECRAFT_VERSIONS[0]?.id ?? null
}

export function getVersionById(id) {
	return MINECRAFT_VERSIONS.find((v) => v.id === id) ?? null
}

export function isGamedropVersion(id) {
	return getVersionById(id)?.format === 'gamedrop'
}

export function versionToKey(version) {
	if (!version) return null
	return String(version).trim().replace('.', '_')
}

export function keyToVersion(key) {
	if (!key) return null
	return String(key).trim().replace('_', '.')
}

export function compareVersions(a, b) {
	const pa = parseVersionParts(a)
	const pb = parseVersionParts(b)
	if (!pa && !pb) return 0
	if (!pa) return -1
	if (!pb) return 1
	if (pa.major !== pb.major) return pa.major - pb.major
	return pa.minor - pb.minor
}

export function isVersionLessOrEqual(a, b) {
	if (!a || !b) return false
	return compareVersions(a, b) <= 0
}

export function getMajorMinorVersion(fullVersion) {
	if (!fullVersion) return null
	const parts = fullVersion.split('.')
	if (parts.length >= 2) {
		return `${parts[0]}.${parts[1]}`
	}
	return fullVersion
}

export function getPatches(id) {
	if (!id) return []
	const entry = getVersionById(id)
	if (!entry || entry.format === 'gamedrop') return []
	return entry.patches.map((patch) => ({
		value: patch,
		label: `${id}.${patch}`
	}))
}

export function getMinecraftVersions(options = {}) {
	const includePrivate = options.includePrivate === true
	return MINECRAFT_VERSIONS.filter((v) => v.public || includePrivate).map((v) => ({
		value: v.id,
		label: v.label,
		public: v.public,
		format: v.format
	}))
}
