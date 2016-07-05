import {Injectable, NgZone} from "@angular/core";
import {ObjectReader} from "../services/object-reader";
import {Messages, Datastore, Utils} from "idai-components-2/idai-components-2";
import {ObjectList} from "../model/objectList";
import {IdaiFieldDocument} from "../model/idai-field-document";
import {ValidationInterceptor} from "../services/validation-interceptor";
import {M} from "../m";


/**
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 */
@Injectable()
export class Importer {

    private docsToImport: Array<IdaiFieldDocument>;
    private currentUpdatePromise: Promise<any>;
    private importSuccessCounter: number;
    private objectReaderFinished: boolean;
    private errorState: boolean;
    
    constructor(
        private objectReader: ObjectReader,
        private messages: Messages,
        private objectList: ObjectList,
        private datastore: Datastore,
        private validationInterceptor: ValidationInterceptor,
        private zone: NgZone
    ) {}

    public importResourcesFromFile(filepath: string): void {

        this.docsToImport = [];
        this.currentUpdatePromise = undefined;
        this.importSuccessCounter = 0;
        this.objectReaderFinished = false;
        this.errorState = false;

        this.showStartMessage();

        var fs = require('fs');
        fs.readFile(filepath, 'utf8', function (err, data) {
            if (err) {
                this.messages.add(M.IMPORTER_FAILURE_FILEUNREADABLE, [ filepath ]);
                return;
            }

            var file = new File([ data ], '', { type: "application/json" });
            this.objectReader.fromFile(file).subscribe( doc => {
                if (this.errorState) return;
                if (!this.currentUpdatePromise) {
                    this.updateDocument(doc);
                } else {
                    this.docsToImport.push(doc);
                }
            }, error => {
                this.messages.add(M.IMPORTER_FAILURE_INVALIDJSON, [ error.lineNumber ]);
                this.objectReaderFinished = true;
                this.errorState = true;
            }, () => {
                this.objectReaderFinished = true;
            });
        }.bind(this));
    }

    private updateDocument(doc: IdaiFieldDocument) {
        
        var index = this.docsToImport.indexOf(doc);
        if (index > -1) this.docsToImport.splice(index, 1);

        var error = this.validationInterceptor.validate(doc)
        if (error) {
            this.showValidationErrorMessage(doc, error);
            this.errorState = true;
            this.finishImport();
            return;
        }

        this.currentUpdatePromise = this.datastore.update(doc);
        this.currentUpdatePromise.then(() => {
            this.importSuccessCounter++;
            if (this.errorState) return;
            if (this.docsToImport.length > 0) {
                this.updateDocument(this.docsToImport[0]);
            } else if (this.objectReaderFinished) {
                this.finishImport();
            }
        }, error => {
            this.showDatabaseErrorMessage(doc, error);
            this.errorState = true;
            this.finishImport();
        });
    }

    private finishImport() {
        
        if (this.importSuccessCounter > 0 ) {
            this.objectList.fetchAllDocuments();
            this.showSuccessMessage();
        }
    }
    
    private showStartMessage() {
        
        this.messages.clear();
        this.messages.add(M.IMPORTER_START);

        this.zone.run(() => {});
    }

    private showSuccessMessage() {
        
        if (this.importSuccessCounter == 1) {
            this.messages.add(M.IMPORTER_SUCCESS_SINGLE);
        } else {
            this.messages.add(M.IMPORTER_SUCCESS_MULTIPLE, [this.importSuccessCounter.toString()]);
        }
        
        this.zone.run(() => {});
    }

    private showDatabaseErrorMessage(doc: IdaiFieldDocument, error: any) {
        
        if (error == M.OBJLIST_IDEXISTS) {
            this.messages.add(M.IMPORTER_FAILURE_IDEXISTS, [doc.resource.identifier]);
        } else {
            this.messages.add(M.IMPORTER_FAILURE_GENERICDATASTOREERROR, [doc.resource.identifier]);
        }

        this.zone.run(() => {});
    }

    private showValidationErrorMessage(doc: IdaiFieldDocument, error: any) {
        
        if (error == M.OBJLIST_IDMISSING) {
            this.messages.add(M.IMPORTER_FAILURE_IDMISSING);
        } else if (error == M.VALIDATION_ERROR_INVALIDTYPE) {
            this.messages.add(M.IMPORTER_FAILURE_INVALIDTYPE,
                [Utils.getTypeFromId(doc.resource["@id"]), doc.resource.identifier]);
        } else if (error == M.VALIDATION_ERROR_INVALIDFIELD) {
            this.messages.add(M.IMPORTER_FAILURE_INVALIDFIELD, [doc.resource.identifier]);
        }

        this.zone.run(() => {});
    }
}