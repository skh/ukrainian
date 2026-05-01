/*
 * Training module — IndexedDB storage
 *
 * Design decisions:
 *
 * Three object stores:
 *   pools     — pool metadata (id, name, createdAt)
 *   poolItems — one record per (pool × question), keyPath [poolId, itemKey]
 *   itemMeta  — one record per question globally, keyPath itemKey
 *
 * itemKey encodes the full question identity as a string:
 *   verb_aspect:<pairId>:<slot>         e.g. "verb_aspect:42:present,1,singular"
 *   verb_infinitive:<pairId>:<slot>
 *   verb_number:<pairId>:<slot>
 *   verb_translation:<pairId>:<dir>     e.g. "verb_translation:42:uk→de"
 *   chunk:<chunkId>:<dir>               e.g. "chunk:17:de→uk"
 *
 * Weight is stored per (poolId, itemKey), not globally. The same question in
 * two pools accumulates weight independently — a word you know in one thematic
 * context may still need work in another. During a multi-pool session, weights
 * are summed (item in N pools is N× more likely to be drawn, which is intended:
 * you added it to multiple pools because you care about it more).
 *
 * itemMeta is keyed on itemKey globally. The accentFlag represents an intrinsic
 * property of the word (unresolved stress uncertainty), not a per-pool concern.
 * A future word-stress training mode will query itemMeta by accentFlag=true.
 *
 * No third-party library — raw IndexedDB wrapped in Promises. The surface area
 * is small enough that a library would add more complexity than it saves.
 */

const DB_NAME = 'ukrainian-training'
const DB_VERSION = 1

export interface Pool {
  id: string
  name: string
  createdAt: number
}

export type ItemKind =
  | 'verb_aspect'
  | 'verb_infinitive'
  | 'verb_number'
  | 'verb_translation'
  | 'chunk'

export interface VerbSlotParams {
  kind: 'verb_aspect' | 'verb_infinitive' | 'verb_number'
  pairId: number
  slot: string
}
export interface VerbTranslationParams {
  kind: 'verb_translation'
  pairId: number
  direction: 'uk→de' | 'de→uk'
}
export interface ChunkParams {
  kind: 'chunk'
  chunkId: number
  direction: 'uk→de' | 'de→uk'
}
export type ItemParams = VerbSlotParams | VerbTranslationParams | ChunkParams

export interface PoolItem {
  poolId: string
  itemKey: string
  weight: number
  displayLabel: string
  ukText: string
  deText: string | null
  params: ItemParams
}

export interface ItemMeta {
  itemKey: string
  accentFlag: boolean
  lastSeen: number | null
}

let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      db.createObjectStore('pools', { keyPath: 'id' })
      const items = db.createObjectStore('poolItems', { keyPath: ['poolId', 'itemKey'] })
      items.createIndex('byPoolId', 'poolId')
      const meta = db.createObjectStore('itemMeta', { keyPath: 'itemKey' })
      meta.createIndex('byAccentFlag', 'accentFlag')
    }
    req.onsuccess = () => { _db = req.result; resolve(req.result) }
    req.onerror = () => reject(req.error)
  })
}

function getAll<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const r = store.getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error)
  })
}
function getAllByIndex<T>(idx: IDBIndex, key: IDBValidKey): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const r = idx.getAll(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error)
  })
}
function getAllKeysByIndex(idx: IDBIndex, key: IDBValidKey): Promise<IDBValidKey[]> {
  return new Promise((resolve, reject) => {
    const r = idx.getAllKeys(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error)
  })
}
function idbGet<T>(store: IDBObjectStore, key: IDBValidKey | IDBKeyRange): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const r = store.get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error)
  })
}
function idbPut(store: IDBObjectStore, val: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const r = store.put(val); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error)
  })
}
function idbDelete(store: IDBObjectStore, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const r = store.delete(key); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error)
  })
}
function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
  })
}

// ── Pools ──────────────────────────────────────────────────────────────────

export async function getPools(): Promise<Pool[]> {
  const db = await openDB()
  const tx = db.transaction('pools', 'readonly')
  return getAll<Pool>(tx.objectStore('pools'))
}

export async function createPool(name: string): Promise<Pool> {
  const pool: Pool = { id: crypto.randomUUID(), name, createdAt: Date.now() }
  const db = await openDB()
  const tx = db.transaction('pools', 'readwrite')
  await idbPut(tx.objectStore('pools'), pool)
  await txDone(tx)
  return pool
}

export async function renamePool(id: string, name: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('pools', 'readwrite')
  const store = tx.objectStore('pools')
  const pool = await idbGet<Pool>(store, id)
  if (pool) await idbPut(store, { ...pool, name })
  await txDone(tx)
}

export async function deletePool(poolId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(['pools', 'poolItems'], 'readwrite')
  const poolsStore = tx.objectStore('pools')
  const itemsStore = tx.objectStore('poolItems')
  const idx = itemsStore.index('byPoolId')
  const keys = await getAllKeysByIndex(idx, poolId)
  for (const k of keys) await idbDelete(itemsStore, k)
  await idbDelete(poolsStore, poolId)
  await txDone(tx)
}

// ── Pool items ─────────────────────────────────────────────────────────────

export async function getPoolItems(poolId: string): Promise<PoolItem[]> {
  const db = await openDB()
  const tx = db.transaction('poolItems', 'readonly')
  return getAllByIndex<PoolItem>(tx.objectStore('poolItems').index('byPoolId'), poolId)
}

export async function addPoolItems(
  items: Omit<PoolItem, 'weight'>[],
): Promise<{ added: number; skipped: number }> {
  if (items.length === 0) return { added: 0, skipped: 0 }
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('poolItems', 'readwrite')
    const store = tx.objectStore('poolItems')
    let added = 0, skipped = 0, remaining = items.length
    const done = () => { if (--remaining === 0) resolve({ added, skipped }) }
    for (const item of items) {
      const req = store.get([item.poolId, item.itemKey])
      req.onsuccess = () => {
        if (req.result) { skipped++; done() }
        else {
          const put = store.put({ ...item, weight: 1.0 })
          put.onsuccess = () => { added++; done() }
          put.onerror = () => reject(put.error)
        }
      }
      req.onerror = () => reject(req.error)
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function removePoolItem(poolId: string, itemKey: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('poolItems', 'readwrite')
  await idbDelete(tx.objectStore('poolItems'), [poolId, itemKey])
  await txDone(tx)
}

export async function updateWeight(
  sources: Array<{ poolId: string; itemKey: string }>,
  rating: -1 | 0 | 1,
): Promise<void> {
  if (rating === 0 || sources.length === 0) return
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('poolItems', 'readwrite')
    const store = tx.objectStore('poolItems')
    let remaining = sources.length
    const done = () => { if (--remaining === 0) resolve() }
    for (const { poolId, itemKey } of sources) {
      const req = store.get([poolId, itemKey])
      req.onsuccess = () => {
        const item = req.result as PoolItem | undefined
        if (!item) { done(); return }
        const w = item.weight
        item.weight = rating === -1
          ? Math.min(w * 1.4, 4.0)
          : Math.max(w * 0.75, 0.25)
        const put = store.put(item)
        put.onsuccess = () => done()
        put.onerror = () => reject(put.error)
      }
      req.onerror = () => reject(req.error)
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPoolItemCount(poolId: string): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('poolItems', 'readonly')
    const req = tx.objectStore('poolItems').index('byPoolId').count(poolId)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ── Item meta ──────────────────────────────────────────────────────────────

export async function getItemMeta(itemKey: string): Promise<ItemMeta> {
  const db = await openDB()
  const tx = db.transaction('itemMeta', 'readonly')
  const existing = await idbGet<ItemMeta>(tx.objectStore('itemMeta'), itemKey)
  return existing ?? { itemKey, accentFlag: false, lastSeen: null }
}

export async function setAccentFlag(itemKey: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('itemMeta', 'readwrite')
  const store = tx.objectStore('itemMeta')
  const existing = await idbGet<ItemMeta>(store, itemKey)
  await idbPut(store, { ...(existing ?? { itemKey, lastSeen: null }), accentFlag: true })
  await txDone(tx)
}

export async function touchLastSeen(itemKey: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('itemMeta', 'readwrite')
  const store = tx.objectStore('itemMeta')
  const existing = await idbGet<ItemMeta>(store, itemKey)
  await idbPut(store, { ...(existing ?? { itemKey, accentFlag: false }), lastSeen: Date.now() })
  await txDone(tx)
}
