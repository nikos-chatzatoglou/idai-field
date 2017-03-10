import {Component, OnInit} from "@angular/core";
import {ActivatedRoute,Router} from "@angular/router";
import {Datastore} from "idai-components-2/datastore";
import {ImageComponentBase} from "./image-component-base";
import {Messages} from "idai-components-2/messages";
import {Imagestore} from "../imagestore/imagestore";
import {DomSanitizer} from "@angular/platform-browser";

@Component({
    moduleId: module.id,
    templateUrl: './image-view.html'
})

/**
 * @author Daniel de Oliveira
 */
export class ImageViewComponent extends ImageComponentBase implements OnInit {

    constructor(
        route: ActivatedRoute,
        datastore: Datastore,
        imagestore: Imagestore,
        sanitizer: DomSanitizer,
        messages: Messages,
        private router: Router
    ) {
        super(route,datastore,imagestore,sanitizer,messages);
    }

    ngOnInit() {
        this.fetchDocAndImage();
        window.getSelection().removeAllRanges();
    }

    public selectRelatedDocument(documentToJumpTo) {
        this.router.navigate(['resources',{ id: documentToJumpTo.resource.id }])
    }
}
