import {Component, ElementRef, ViewChild} from '@angular/core';
import {ProjectConfiguration} from 'idai-components-2';
import {SearchBarComponent} from '../../../widgets/search-bar.component';
import {TypeUtility} from '../../../core/model/type-utility';

@Component({
    moduleId: module.id,
    selector: 'image-overview-search-bar',
    templateUrl: './image-overview-search-bar.html',
    host: {
        '(document:click)': 'handleClick($event)',
    }
})
/**
 * @author Thomas Kleinke
 */
export class ImageOverviewSearchBarComponent extends SearchBarComponent {

    @ViewChild('searchInput') fulltextSearchInput: ElementRef;


    constructor(private elementRef: ElementRef,
                private typeUtility: TypeUtility,
                projectConfiguration: ProjectConfiguration) {

        super(projectConfiguration);
    }


    public isTypeSelected(): boolean {

        return this.types !== undefined && this.types.length > 0;
    }


    public isFocused(): boolean {

        return this.fulltextSearchInput.nativeElement.ownerDocument.activeElement
            === this.fulltextSearchInput.nativeElement;
    }
}