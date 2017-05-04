import {Component} from "@angular/core";
import {IdaiFieldDocument} from "../model/idai-field-document";
import {Query} from "idai-components-2/datastore";
import {ConfigLoader, IdaiType, ProjectConfiguration} from "idai-components-2/configuration";
import {PersistenceManager} from "idai-components-2/persist";
import {Messages} from "idai-components-2/messages";
import {M} from "../m";
import {IdaiFieldDatastore} from "../datastore/idai-field-datastore";
import {Router, Event, NavigationStart} from '@angular/router';

@Component({
    moduleId: module.id,
    templateUrl: './list.html'
})

export class ListComponent {

    private detailedDocument: IdaiFieldDocument;
    public documents: IdaiFieldDocument[];
    public trenches: IdaiFieldDocument[];
    public selectedFilterTrenchId = "";
    public selectedDocument: IdaiFieldDocument;
    public typesMap: {};
    protected query: Query = {q: '', type: 'resource', prefix: true};

    constructor(
        private router: Router,
        private messages: Messages,
        private datastore: IdaiFieldDatastore,
        configLoader: ConfigLoader,
        private persistenceManager: PersistenceManager
    ) {
        this.fetchDocuments();
        this.fetchTrenches();
        configLoader.getProjectConfiguration().then(projectConfiguration => {
            this.typesMap = projectConfiguration.getTypesMap();
        });

        router.events.subscribe( (event:Event) => {
            if(event instanceof NavigationStart) {
                if(event.url == "/list") this.detailedDocument = null;
            }
        });
    }

    public save(document: IdaiFieldDocument): void {
        if (document.resource.id) {
            this.datastore.update(document).then(
                doc => {
                    this.messages.add([M.WIDGETS_SAVE_SUCCESS]);
                    this.detailedDocument = <IdaiFieldDocument> doc;
                })
                .catch(errorWithParams => {
                    // TODO replace with msg from M
                    this.messages.add(errorWithParams);
                });
        } else {
            this.datastore.create(document).then(
                doc => {
                    this.messages.add([M.WIDGETS_SAVE_SUCCESS]);
                    this.detailedDocument = <IdaiFieldDocument> doc;
                })
                .catch(errorWithParams => {
                    // TODO replace with msg from M
                    this.messages.add(errorWithParams);
                });
        }
    }

    public focusDocument(doc: IdaiFieldDocument) {
        this.detailedDocument = doc
        this.router.navigate(['./list', {focus: doc.resource.id}]);
    }

    /**
     * Populates the document list with all documents from
     * the datastore which match a <code>query</code>
     * @param query
     */
    public fetchDocuments(query: Query = this.query) {
        this.selectedFilterTrenchId = ""
        this.detailedDocument = null
        this.datastore.find(query).then(documents => {
            this.documents = documents as IdaiFieldDocument[];

        }).catch(err => { console.error(err); } );
    }

    private fetchTrenches() {
        let tquery : Query = {q: '', type: 'trench', prefix: true};
        this.datastore.find(tquery).then(documents => {
            this.trenches = documents as IdaiFieldDocument[];
        }).catch(err => { console.error(err); } );
    }

    public filterByTrench() {
        if (this.selectedFilterTrenchId == "") {
            this.fetchDocuments();
        } else {
            this.detailedDocument = null
            var filterById = this.selectedFilterTrenchId;
            this.datastore.findByBelongsTo(filterById).then(documents => {
                this.documents = documents as IdaiFieldDocument[];
            }).catch(err => { console.error(err); } );
        }
    }

    public addDocument(new_doc_type) {
        // TODO - Use Validator class
        if (!new_doc_type || new_doc_type == '') {
            return
        }

        let newDoc = <IdaiFieldDocument> { "resource": { "relations": {}, "type": new_doc_type }, synced: 0 };

        // Adding Context to selectedTrench
        if (this.selectedFilterTrenchId && new_doc_type == "context") {
            newDoc.resource.relations["belongsTo"] = [this.selectedFilterTrenchId]
        }
        this.documents.push(newDoc);
    }

    public select(documentToSelect: IdaiFieldDocument) {
       this.selectedDocument = documentToSelect;
    }

    public queryChanged(query: Query) {
        this.query = query;
        this.fetchDocuments(query);
    }


}