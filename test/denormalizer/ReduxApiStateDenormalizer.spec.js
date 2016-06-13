import { assert } from 'chai';
import { ReduxApiStateDenormalizer } from '../../src/index';
import { createSchemasMap } from '../../src/denormalizer/ReduxApiStateDenormalizer';
import {
  STATUS,
  createStatus,
  updateStatus,
} from '../../src/status';


function createStorageMap() {
  return {
    type1: 'storage.type1',
    'type2.test': 'storage["type2.test"]',
  };
}

// NOTE!
// Take care when passing getStore in FindStorageMode,
// items statuses will be changed which means item has changed
// Better way is to first create storage and then pass the same storage with new function
const getStore = () => {
  const store = {
    storage: {
      type1: {
        type1Id1: {
          id: 'type1Id1',
          type: 'type1',
          attributes: {
            name: 'type1Id1',
          },
          relationships: {
            type1: {
              data: [
                {id: 'type1Id2', type: 'type1'},
                {id: 'type1Id3', type: 'type1'},
              ],
            },
            'type2.test': {
              data: {
                id: 'type2Id1', type: 'type2.test',
              },
            },
          },
        },
        type1Id2: {
          id: 'type1Id2',
          type: 'type1',
          attributes: {name: 'type1Id2'},
        },
        type1Id3: {
          id: 'type1Id3',
          type: 'type1',
          attributes: {name: 'type1Id3'},
          relationships: {
            type1: {
              data: [
                {id: 'type1Id2', type: 'type1'},
              ],
            },
          },
        },
      },
      'type2.test': {
        type2Id1: {
          id: 'type2Id1',
          type: 'type2.test',
          attributes: {
            name: 'type2Id1',
          },
        },
      },
    },
  };
  store.storage.type1.type1Id1[STATUS] = createStatus();
  store.storage.type1.type1Id2[STATUS] = createStatus();
  store.storage.type1.type1Id3[STATUS] = createStatus();
  store.storage['type2.test'].type2Id1[STATUS] = createStatus();
  return store;
};
function getModifiedStore(store) {
  // Date.now() seems to not be fast enough to create different timestamp
  store.storage.type1.type1Id3[STATUS].modifiedTimestamp =
    store.storage.type1.type1Id3[STATUS].modifiedTimestamp + 1;
  return store;
}
describe('ReduxApiStateDenormalizer', () => {
  describe('new instance', () => {
    it('creates ReduxApiStateDenormalizer instance', () => {
      const denormalizer = new ReduxApiStateDenormalizer();
      assert.isOk(
        denormalizer instanceof ReduxApiStateDenormalizer,
        'denormalizer not instance ReduxApiStateDenormalizer'
      );
    });
  });
  describe('denormalizeItem', () => {
    it('denormalizes valid object relationships data', () => {
      const denormalizer = new ReduxApiStateDenormalizer();
      const expectedData = {
        id: 'type1Id1',
        type: 'type1',
        name: 'type1Id1',
        'type2.test': {
          id: 'type2Id1',
          type: 'type2.test',
          name: 'type2Id1',
        },
        type1: [
          { id: 'type1Id2', type: 'type1', name: 'type1Id2' },
          {
            id: 'type1Id3',
            type: 'type1',
            name: 'type1Id3',
            type1: [{ id: 'type1Id2', type: 'type1', name: 'type1Id2' }],
          },
        ],
      };
      const storage = createSchemasMap(getStore(), createStorageMap());

      const denormalizedData =
        denormalizer.denormalizeItemFromStorage({id: 'type1Id1', type: 'type1'}, storage);
      assert.deepEqual(
        denormalizedData,
        expectedData,
        'item not denormalized correctly'
      );
      assert.isObject(denormalizedData[STATUS]);
      assert.isObject(denormalizedData['type2.test'][STATUS]);
    });
    it('gets object from cache', () => {
      const denormalizer = new ReduxApiStateDenormalizer();
      const storage = createSchemasMap(getStore(), createStorageMap());

      const denormalizedData =
        denormalizer.denormalizeItemFromStorage({id: 'type1Id1', type: 'type1'}, storage);
      const cachedDenormalizedData =
        denormalizer.denormalizeItemFromStorage({id: 'type1Id1', type: 'type1'}, storage);

      assert.isOk(cachedDenormalizedData === denormalizedData, 'didn\'t get cached item');
      assert.isObject(cachedDenormalizedData[STATUS]);
      assert.isObject(cachedDenormalizedData['type2.test'][STATUS]);
    });
    it('returns new object when relationship changed', () => {
      const denormalizer = new ReduxApiStateDenormalizer();
      const expectedData = {
        id: 'type1Id1',
        type: 'type1',
        name: 'type1Id1',
        'type2.test': {
          id: 'type2Id1',
          type: 'type2.test',
          name: 'type2Id1',
        },
        type1: [
          { id: 'type1Id2', type: 'type1', name: 'type1Id2' },
          {
            id: 'type1Id3',
            type: 'type1',
            name: 'type1Id3',
            type1: [{ id: 'type1Id2', type: 'type1', name: 'type1Id2' }],
          },
        ],
      };
      const store = getStore();
      let storage = createSchemasMap(store, createStorageMap());

      const denormalizedData =
        denormalizer.denormalizeItemFromStorage({id: 'type1Id1', type: 'type1'}, storage);

      storage = createSchemasMap(getModifiedStore(store), createStorageMap());
      const notCachedDenormalizedData =
        denormalizer.denormalizeItemFromStorage({id: 'type1Id1', type: 'type1'}, storage);

      assert.isOk(notCachedDenormalizedData !== denormalizedData, 'didn\'t create new object');
      assert.deepEqual(
        notCachedDenormalizedData,
        expectedData,
        'item not denormalized correctly'
      );
      assert.isObject(notCachedDenormalizedData[STATUS]);
      assert.isObject(notCachedDenormalizedData['type2.test'][STATUS]);
    });
  });
  describe('denormalizeCollection', () => {
    it('denormalizes valid object collection', () => {
      const denormalizer = new ReduxApiStateDenormalizer(getStore, createStorageMap());
      const expectedData = [
        {
          id: 'type1Id1',
          type: 'type1',
          name: 'type1Id1',
          'type2.test': {
            id: 'type2Id1',
            type: 'type2.test',
            name: 'type2Id1',
          },
          type1: [
            { id: 'type1Id2', type: 'type1', name: 'type1Id2' },
            {
              id: 'type1Id3',
              type: 'type1',
              name: 'type1Id3',
              type1: [{ id: 'type1Id2', type: 'type1', name: 'type1Id2' }],
            },
          ],
        },
      ];
      const collection = ['type1Id1'];
      collection[STATUS] = createStatus({ schema: 'type1', tag: ''});
      const denormalizedData =
        denormalizer.denormalizeCollection(collection);
      assert.deepEqual(
        denormalizedData,
        expectedData,
        'collection not denormalized correctly'
      );
      assert.isObject(denormalizedData[STATUS]);
    });
    it('gets collection from cache', () => {
      const store = getStore();
      const denormalizer = new ReduxApiStateDenormalizer(() => store, createStorageMap());
      const collection = ['type1Id1'];
      collection[STATUS] = createStatus({ schema: 'type1', tag: ''});
      const denormalizedData =
        denormalizer.denormalizeCollection(collection);
      const cachedDenormalizedData =
        denormalizer.denormalizeCollection(collection);

      assert.isOk(cachedDenormalizedData === denormalizedData, 'didn\'t get cached item');
      assert.isObject(cachedDenormalizedData[STATUS]);

    });
    it('gets new collection reference when item changed', () => {
      const denormalizer = new ReduxApiStateDenormalizer();
      const collection = ['type1Id1'];
      collection[STATUS] = createStatus({ schema: 'type1', tag: ''});

      const store = getStore()
      let storage = storage = createSchemasMap(store, createStorageMap());
      const denormalizedData =
        denormalizer.denormalizeCollection(collection, storage);
      storage = createSchemasMap(getModifiedStore(store), createStorageMap());
      const cachedDenormalizedData =
        denormalizer.denormalizeCollection(collection, storage);

      assert.isOk(cachedDenormalizedData !== denormalizedData, 'didn\'t create new reference');
      assert.isObject(cachedDenormalizedData[STATUS]);
    });
  });
});

