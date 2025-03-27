import { Component, Input } from '@angular/core';
import { Document, Labels, ProjectConfiguration, Resource } from 'idai-field-core';


@Component({
    selector: 'document-teaser',
    templateUrl: './document-teaser.html',
    standalone: false
})
export class DocumentTeaserComponent {

    @Input() document: Document;


    constructor(private labels: Labels,
                private projectConfiguration: ProjectConfiguration) {}


    public getShortDescription = () => Resource.getShortDescriptionLabel(
        this.document.resource, this.labels, this.projectConfiguration
    );

    public getDynamicProperty(document: any): string {
        const resourceKeys = Object.keys(document.resource);

        const titleKey = resourceKeys.find(key => key.endsWith(':title'));
        const idKey = resourceKeys.find(key => key.endsWith(':id'));

        const titleValue = titleKey ? document.resource[titleKey] : '';
        const idValue = idKey ? document.resource[idKey] : '';

        if(!titleValue || !idValue){
            return document.resource.identifier;
        }

        return `${idValue} - ${titleValue}`.trim();
    }
}
