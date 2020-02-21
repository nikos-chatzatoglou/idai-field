import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {NgbActiveModal, NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {Document, FieldDocument, ImageDocument, Messages} from 'idai-components-2';
import {ImageRowItem} from '../../image/row/image-row.component';
import {ViewModalComponent} from '../view-modal.component';
import {ImageReadDatastore} from '../../../core/datastore/field/image-read-datastore';
import {RoutingService} from '../../routing-service';


@Component({
    moduleId: module.id,
    templateUrl: './resource-view.html',
    host: {
        '(window:keydown)': 'onKeyDown($event)'
    }
})
/**
 * @author Thomas Kleinke
 */
export class ResourceViewComponent extends ViewModalComponent {

    public document: FieldDocument;


    constructor(datastore: ImageReadDatastore,
                activeModal: NgbActiveModal,
                messages: Messages,
                router: Router,
                modalService: NgbModal,
                routingService: RoutingService) {

        super(datastore, activeModal, messages, router, modalService, routingService);
    }


    protected getDocument = () => this.document;

    protected setDocument = (document: FieldDocument) => this.document = document;


    public async initialize(document: FieldDocument) {

        this.document = document;
        this.images = await this.fetchImages();
        if (this.images.length > 0) this.selectedImage = this.images[0];
    }


    private async fetchImages(): Promise<Array<ImageRowItem>> {

        if (!Document.hasRelations(this.document, 'isDepictedIn')) return [];

        const images: Array<ImageDocument> = await this.datastore.getMultiple(
            this.document.resource.relations['isDepictedIn']
        );

        return images.map((document: ImageDocument) => {
            return { imageId: document.resource.id, document: document }
        });
    }
}
