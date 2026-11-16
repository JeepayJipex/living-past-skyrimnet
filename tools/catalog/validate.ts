export type CatalogIdentity = { plugin: string; localId: string };
export type CatalogActor = {
  reference: CatalogIdentity;
  base: CatalogIdentity;
  name: string;
  editorId: string;
  location: string;
};
export type Catalog = {
  schemaVersion: 1;
  actors: CatalogActor[];
  exclusions: Record<string, number>;
};

const reasons = ['deleted', 'initiallyDisabled', 'nonPersistent', 'invalidBase', 'unnamed', 'nonUnique', 'conditional', 'ambiguous'];

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

function identity(value: unknown): value is CatalogIdentity {
  return object(value) && hasKeys(value, ['plugin', 'localId']) && typeof value.plugin === 'string' &&
    /^[^\\/:*?"<>|\x00-\x1f]+\.(esm|esp|esl)$/i.test(value.plugin) &&
    typeof value.localId === 'string' && /^[0-9A-F]{6}$/.test(value.localId) &&
    value.localId !== '000000';
}

export function validateCatalog(value: unknown): asserts value is Catalog {
  if (!object(value) || !hasKeys(value, ['schemaVersion', 'actors', 'exclusions']) || value.schemaVersion !== 1 || !Array.isArray(value.actors) || !object(value.exclusions)) {
    throw new Error('Invalid catalog envelope');
  }
  const exclusions = value.exclusions;
  if (Object.keys(exclusions).length !== reasons.length ||
      reasons.some(reason => !Number.isSafeInteger(exclusions[reason]) || (exclusions[reason] as number) < 0)) {
    throw new Error('Invalid exclusion counts');
  }
  const references = new Set<string>();
  const bases = new Set<string>();
  for (const actor of value.actors) {
    if (!object(actor) || !hasKeys(actor, ['reference', 'base', 'name', 'editorId', 'location']) || !identity(actor.reference) || !identity(actor.base) ||
        typeof actor.name !== 'string' || !actor.name.trim() ||
        typeof actor.editorId !== 'string' || typeof actor.location !== 'string') {
      throw new Error('Invalid catalog actor');
    }
    const reference = `${actor.reference.plugin.toLowerCase()}:${actor.reference.localId}`;
    const base = `${actor.base.plugin.toLowerCase()}:${actor.base.localId}`;
    if (references.has(reference) || bases.has(base)) throw new Error('Duplicate actor identity');
    references.add(reference);
    bases.add(base);
  }
}
