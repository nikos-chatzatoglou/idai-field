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

        let titleValue = '';
        let idValue = '';

        if (titleKey) {
            const titleResource = document.resource[titleKey];
            // Check if titleResource is an object and fallback to `en` or `unspecifiedLanguage`
            titleValue = typeof titleResource === 'object'
                ? titleResource?.en || titleResource?.unspecifiedLanguage || ''
                : titleResource;
        }

        if (idKey) {
            const idResource = document.resource[idKey];
            // Check if idResource is an object and fallback to `en` or `unspecifiedLanguage`
            idValue = typeof idResource === 'object'
                ? idResource?.en || idResource?.unspecifiedLanguage || ''
                : idResource;
        }

        if (!titleValue || !idValue) {
            return document.resource.identifier;
        }

        return `${idValue} - ${titleValue}`.trim();
    }
}
