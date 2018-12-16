const HOOK_LAST = {order: 100, filter: {fake: null}}

module.exports = function ItemCache(mod) {
		let lock = false,
		inven = null,
		invenNew = null,
		ware = {}

	mod.game.on('enter_game', () => {
		inven = invenNew = null
		delete ware[9] // Pet bank
	})

	mod.hook('S_INVEN', 'raw', HOOK_LAST, (code, data) => {
		if(lock) return

		if(data[25]) invenNew = [] // Check first flag

		invenNew.push(data = Buffer.from(data))

		data[24] = 1 // Set open flag

		if(!data[26]) { // Check more flag
			inven = invenNew
			invenNew = null
		}
	})

	mod.hook('C_SHOW_INVEN', 1, HOOK_LAST, event => {
		if(event.unk !== 1) return // Type?

		lock = true
		for(let data of inven) mod.toClient(data)
		return lock = false
	})

	mod.hook('S_VIEW_WARE_EX', 'raw', HOOK_LAST, (code, data) => {
		if(lock) return

		const event = {
			gameId: BigInt(data.readUInt32LE(8)) | BigInt(data.readUInt32LE(12)) << 32n,
			type: data.readInt32LE(16),
			action: data.readInt32LE(20),
			offset: data.readInt32LE(24)
		}

		if(!mod.game.me.is(event.gameId) || event.action) return

		let wareType = ware[event.type]

		if(!wareType) wareType = ware[event.type] = {}
		else
			for(let page of Object.values(wareType)) { // Update global information for each page
				data.copy(page, 8, 8, 20)
				data.copy(page, 28, 28, 46)
			}

		wareType[event.offset] = Buffer.from(data)
	})

	mod.hook('C_VIEW_WARE', 2, HOOK_LAST, event => {
		if(!mod.game.me.is(event.gameId)) return

		const wareType = ware[event.type]

		if(wareType && wareType[event.offset]) {
			lock = true
			mod.toClient(wareType[event.offset]) // Pre-send the requested page
			lock = false
		}
	})
}