import {FieldDocument, IndexFacade} from '@idai-field/core';
import {PouchdbDatastore} from '../pouchdb/pouchdb-datastore';
import {DocumentCache} from '../cached/document-cache';
import {CategoryConverter} from '../cached/category-converter';
import {CachedDatastore} from '../cached/cached-datastore';

/**
 * Data Access Object
 *
 * @author Daniel de Oliveira
 */
export class FieldDatastore extends CachedDatastore<FieldDocument> {

    constructor(datastore: PouchdbDatastore,
                indexFacade: IndexFacade,
                documentCache: DocumentCache<FieldDocument>,
                documentConverter: CategoryConverter<FieldDocument>) {

        super(datastore, indexFacade, documentCache, documentConverter, 'FieldDocument');
    }
}
