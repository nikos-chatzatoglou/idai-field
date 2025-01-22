import { Component} from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Document } from 'idai-field-core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'changes-history-modal',
    imports: [CommonModule],
    templateUrl: './changes-history-modal.html',
    styleUrls: ['./changes-history-modal.scss']
})

export class ChangesHistoryModalComponent {

    public escapeKeyPressed: boolean;
    public document: Document;
    public toggledDate: boolean;
    public toggledUser: boolean;

    constructor( public activeModal: NgbActiveModal,
    ) {}


    public async onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape' && !this.escapeKeyPressed) {
            this.activeModal.dismiss('cancel');
        }
        
    }


    public async onKeyUp(event: KeyboardEvent) {
        if (event.key === 'Escape') this.escapeKeyPressed = false;
    }


    public async initialize() {
        this.sortDownBy("date")
    }


    public formatDateTime( date: string | Date, locale: string = 'de-DE' ) { 
        return new Date(date).toLocaleString(locale);
    }


    public sortUpBy(documentKey: string) {
        this.document.modified.sort((a, b) => a[documentKey] > b[documentKey] ? 1 : a[documentKey] === b[documentKey] ? 0 : -1);
    }


    public sortDownBy(documentKey: string) {
        this.document.modified.sort((a, b) => a[documentKey] < b[documentKey] ? 1 : a[documentKey] === b[documentKey] ? 0 : -1);
    }
   
    public toggleColumnSort (colname: string) {        
        if(colname === 'user'){            
            this.toggledUser ? this.sortDownBy(colname) : this.sortUpBy(colname);
            this.toggledUser = !this.toggledUser;
        }else{
            this.toggledDate ? this.sortDownBy(colname) : this.sortUpBy(colname);
            this.toggledDate = !this.toggledDate;
        }
    }
}
