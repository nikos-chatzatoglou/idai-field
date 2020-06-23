import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {FieldDocument, ImageDocument} from 'idai-components-2';
import {ImageGridComponent} from '../../image/grid/image-grid.component';
import {ImageReadDatastore} from '../../../core/datastore/field/image-read-datastore';
import {M} from '../../messages/m';
import {Messages} from '../../messages/messages';
import {Query} from '../../../core/datastore/model/query';
import {ProjectCategories} from '../../../core/configuration/project-categories';
import {ProjectConfiguration} from '../../../core/configuration/project-configuration';


@Component({
    selector: 'image-picker',
    templateUrl: './image-picker.html',
    host: {
        '(window:keydown)': 'onKeyDown($event)'
    }
})
/**
 * @author Fabian Z.
 * @author Thomas Kleinke
 */
export class ImagePickerComponent implements OnInit {

    private static documentLimit = 24;

    @ViewChild('imageGrid', {static: false}) public imageGrid: ImageGridComponent;

    public documents: Array<ImageDocument>;
    public document: FieldDocument;
    public selectedDocuments: Array<ImageDocument> = [];

    private queryString = '';
    private currentQueryId: string;
    private currentOffset = 0;
    private totalDocumentCount = 0;


    constructor(
        public activeModal: NgbActiveModal,
        private messages: Messages,
        private datastore: ImageReadDatastore,
        private el: ElementRef,
        private projectConfiguration: ProjectConfiguration
    ) {}


    public ngOnInit() {

        // Listen for transformation of modal to capture finished
        // resizing and invoke recalculation of imageGrid
        const modalEl = this.el.nativeElement.parentElement.parentElement;
        modalEl.addEventListener('transitionend', (event: any) => {
            if (event.propertyName === 'transform') this.onResize();
        });
    }


    public async onKeyDown(event: KeyboardEvent) {

        if (event.key === 'Escape') {
            this.activeModal.dismiss('cancel');
        } else if (event.key === 'Enter') {
            this.applySelection();
        }
    }


    public async setDocument(document: FieldDocument) {

        this.document = document;
        await this.fetchDocuments();
    }


    public async setQueryString(q: string) {

        this.queryString = q;
        this.currentOffset = 0;
        await this.fetchDocuments();
    }


    public onResize() {

        this.imageGrid.calcGrid();
    }


    /**
     * @param document the object that should be selected
     */
    public select(document: ImageDocument) {

        if (!this.selectedDocuments.includes(document)) {
            this.selectedDocuments.push(document);
        } else {
            this.selectedDocuments.splice(this.selectedDocuments.indexOf(document), 1);
        }
    }


    public applySelection() {

        if (this.selectedDocuments.length > 0) this.activeModal.close(this.selectedDocuments);
    }


    public getCurrentPage = () => this.currentOffset / ImagePickerComponent.documentLimit + 1;


    public getPageCount = () => Math.ceil(this.totalDocumentCount / ImagePickerComponent.documentLimit);


    public canTurnPage = () => (this.currentOffset + ImagePickerComponent.documentLimit) < this.totalDocumentCount;


    public canTurnPageBack = () => this.currentOffset > 0;


    public turnPage() {

        if (this.canTurnPage()) {
            this.currentOffset += ImagePickerComponent.documentLimit;
            this.fetchDocuments();
        }
    }


    public turnPageBack() {

        if (this.canTurnPageBack()) {
            this.currentOffset -= ImagePickerComponent.documentLimit;
            this.fetchDocuments();
        }
    }


    /**
     * Populates the document list with all documents from
     * the datastore which match a <code>query</code>
     */
    private async fetchDocuments() {

        this.currentQueryId = new Date().toISOString();

        const query: Query = {
            q: this.queryString,
            limit: ImagePickerComponent.documentLimit,
            offset: this.currentOffset,
            categories: ProjectCategories.getImageCategoryNames(this.projectConfiguration.getCategoryTreelist()),
            constraints: {
                'depicts:contain': { value: this.document.resource.id, subtract: true }
            },
            id: this.currentQueryId
        };

        try {
            const result = await this.datastore.find(query);
            this.totalDocumentCount = result.totalCount;
            if (result.queryId === this.currentQueryId) this.documents = result.documents;
        }
        catch (errWithParams) {
            console.error('Error in find with query', query);
            if (errWithParams.length === 2) {
                console.error('Error in find', errWithParams[1]);
            }
            this.messages.add([M.ALL_ERROR_FIND]);
        }
    }
}
