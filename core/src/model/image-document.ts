import { ObjectUtils, takeOrMake } from '../tools';
import {Document} from './document';
import {ImageResource} from './image-resource';

/**
 * @author Daniel de Oliveira
 */
export interface ImageDocument extends Document {

    id?: string;
    resource: ImageResource;
}


export module ImageDocument {

    export function fromDocument(document: Document): ImageDocument {

        const doc = ObjectUtils.clone(document);
        takeOrMake(doc, ['resource','relations','depicts'], []);
        return doc as any;
    }
}