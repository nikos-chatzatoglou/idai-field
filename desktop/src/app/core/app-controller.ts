import { Injectable } from '@angular/core';
import { Document, DocumentCache, Indexer, IndexFacade } from 'idai-field-core';
import { ProjectConfiguration } from './configuration/project-configuration';
import { FieldCategoryConverter } from './datastore/field/field-category-converter';
import { PouchdbManager } from './datastore/pouchdb/pouchdb-manager';
import { ImagesState } from './images/overview/view/images-state';
import { ResourcesStateManager } from './resources/view/resources-state-manager';
import { TabManager } from './tabs/tab-manager';

const remote = typeof window !== 'undefined' ? window.require('electron').remote : require('electron').remote;
const express = typeof window !== 'undefined' ? window.require('express') : require('express');


@Injectable()
/**
 * @author Daniel de Oliveira
 */
export class AppController {

    constructor(private pouchdbManager: PouchdbManager,
                private resourcesState: ResourcesStateManager,
                private documentCache: DocumentCache<Document>,
                private imagesState: ImagesState,
                private indexFacade: IndexFacade,
                private tabManager: TabManager,
                private projectConfiguration: ProjectConfiguration) {}


    public setupServer(): Promise<any> {

        return new Promise(resolve => {

            if (!remote.getGlobal('switches').provide_reset) return resolve(undefined);

            const control = express();
            control.use(express.json());

            control.post('/reset', async (request: any, result: any) => {
                await this.reset();
                result.send('done');
            });

            control.listen(3003, function() {
                console.log('App Control listening on port 3003');
                resolve(undefined);
            });
        });
    }


    private async reset() {

        this.resourcesState.resetForE2E();
        this.imagesState.resetForE2E();
        this.tabManager.resetForE2E();
        this.documentCache.resetForE2E();
        await this.pouchdbManager.resetForE2E();
        await Indexer.reindex(
            this.indexFacade, this.pouchdbManager.getDb(), this.documentCache, new FieldCategoryConverter(this.projectConfiguration)
        );
    }
}
