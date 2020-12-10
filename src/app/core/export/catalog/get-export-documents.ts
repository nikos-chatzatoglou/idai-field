import {includedIn} from 'tsfun';
import {Document, toResourceId} from 'idai-components-2';
import {DocumentReadDatastore} from '../../datastore/document-read-datastore';
import {Name, ResourceId} from '../../constants';
import {ImageRelations, TypeRelations} from '../../model/relation-constants';
import {RelationsManager} from '../../model/relations-manager';
import {ImageRelationsManager} from '../../model/image-relations-manager';


export async function getExportDocuments(datastore: DocumentReadDatastore,
                                         relationsManager: RelationsManager,
                                         imageRelationsManager: ImageRelationsManager,
                                         catalogId: ResourceId,
                                         project: Name): Promise<[Array<Document>, Array<ResourceId>]> {

    const catalogAndTypes = (await relationsManager.get(catalogId, { descendants: true }));
    const relatedImages = cleanImageDocuments(
        await imageRelationsManager.getLinkedImages(catalogAndTypes),
        catalogAndTypes.map(toResourceId)
        );
    return [
        catalogAndTypes
            .concat(relatedImages)
            .map(cleanDocument)
            .map(document => {
                document.project = project;
                return document;
            }),
        relatedImages.map(toResourceId)
    ];
}


// TODO maybe move to CatalogUtil; then maybe pass catalogResources instead ids
function cleanImageDocuments(images: Array<Document>,
                             idsOfCatalogResources: Array<ResourceId>) {

    const relatedImageDocuments = [];
    for (let image of images) {

        image.resource.relations = {
            depicts: image.resource.relations[ImageRelations.DEPICTS]
                .filter(includedIn(idsOfCatalogResources))
        } as any;

        if (image.resource.relations[ImageRelations.DEPICTS].length > 0) {
            relatedImageDocuments.push(image);
        }
    }
    return relatedImageDocuments;
}


function cleanDocument(document: Document) {

    delete document['_attachments'];
    delete document[Document._REV];
    delete document[Document.CREATED];
    delete document[Document.MODIFIED];
    delete document.resource.relations[TypeRelations.HASINSTANCE];
    return document;
}
