import {FieldDocument, IdaiType} from 'idai-components-2';
import {includedIn, isNot, isnt, to} from 'tsfun';
import {clone} from '../util/object-util';


/**
 * @author Daniel de Oliveira
 */
export module CSVExport {

    /**
     * Creates a header line and lines for each record.
     * If documents is empty, still a header line gets created.
     *
     * @param documents
     * @param resourceType
     * @param relations
     */
    export function createExportable(documents: FieldDocument[],
                                     resourceType: IdaiType,
                                     relations: Array<string>) {

        const headings: string[] = makeHeadings(resourceType, relations);

        let matrix = documents
            .map(toDocumentWithFlattenedRelations)
            .map(toRowsArrangedBy(headings));

        const indexOfDatingElement = headings.indexOf('dating');
        if (indexOfDatingElement !== -1) {
            const max = getMax(matrix, indexOfDatingElement);
            expandDatingHeader(headings, indexOfDatingElement, max);

            matrix = matrix
                .map(expandArrayToSize(indexOfDatingElement, max))
                .map(rowsWithDatingElementsExpanded(indexOfDatingElement, max));
        }

        return ([headings].concat(matrix)).map(toCsvLine);
    }


    function getMax(matrix: any, indexOfDatingElement: any) {

        return matrix.reduce((max: number, row: any) =>

                Math.max(
                    max,
                    row[indexOfDatingElement]
                        ? row[indexOfDatingElement].length
                        : 0)

            , 0);
    }


    function makeHeadings(resourceType: IdaiType, relations: Array<string>) {

        return makeFieldNamesList(resourceType)
            .concat(
                relations
                    .filter(isNot(includedIn(['isRecordedIn', 'includes'])))
                    .map(relation => 'relations.' + relation));
    }


    /**
     * @param fieldNames gets modified
     * @param indexOfDatingElement
     * @param max
     */
    function expandDatingHeader(fieldNames: any, indexOfDatingElement: number, max: number) {

        const dating_fields: string[] = [];
        for (let i = 0; i < max; i++) dating_fields.push('dating.' + i);
        fieldNames.splice(indexOfDatingElement, 1, ...dating_fields);

        for (let i = max - 1; i >= 0; i--) {

            const indexOfCurrentDatingElement = indexOfDatingElement + i;
            fieldNames.splice(indexOfCurrentDatingElement, 1, [
                    'dating.' + i + '.begin.year',
                    'dating.' + i + '.end.year',
                    'dating.' + i + '.source',
                    'dating.' + i + '.label']);
        }
    }


    function rowsWithDatingElementsExpanded(indexOfDatingElement: number, max: number) {

        return expandHomogeneousItems(indexOfDatingElement, max, 4,
            (removed: any) => {

                return [
                    removed['begin'] && removed['begin']['year'] ? removed['begin']['year'] : undefined,
                    removed['end'] && removed['end']['year'] ? removed['end']['year'] : undefined,
                    removed['source'],
                    removed['label']];
            });
    }


    function expandArrayToSize(where: number, targetSize: number) {

        return expandHomogeneousItems(where, 1, targetSize, identity);
    }


    function expandHomogeneousItems(where: number, nrOfNewItems: number, widthOfEachNewItem: number,
                    computeReplacement: (removed: any) => any[]) {

        return (itms: any[]) => { // TODO make copy so to not work in place

            for (let i = nrOfNewItems - 1; i >= 0; i--) {

                const removed = itms.splice(where + i, 1, ...Array(widthOfEachNewItem))[0];
                if (removed) {
                    const newEls = computeReplacement(removed);
                    for (let j = 0; j < newEls.length; j++) itms[where + i + j] = newEls[j];
                }
            }

            return itms;
        }
    }


    function toDocumentWithFlattenedRelations(document: FieldDocument) {

        const cloned = clone(document);

        if (!cloned.resource.relations) return cloned;
        for (let relation of Object.keys(cloned.resource.relations)) { // TODO use HOF, maybe get rid of clone then
            cloned.resource['relations.' + relation] = cloned.resource.relations[relation].join(';');
        }
        delete cloned.resource.relations;

        if (cloned.resource['relations.liesWithin']) delete cloned.resource['relations.isRecordedIn'];
        else if (cloned.resource['relations.isRecordedIn']) {
            cloned.resource['relations.liesWithin'] = cloned.resource['relations.isRecordedIn'];
            delete cloned.resource['relations.isRecordedIn'];
        }

        return cloned;
    }


    function toRowsArrangedBy(fieldNames: string[]) {

        return (document: FieldDocument) => {

            const newLine = new Array(fieldNames.length);

            return getUsableFieldNames(Object.keys(document.resource))
                .reduce((line, fieldName) =>  {

                    const indexOfFoundElement = fieldNames.indexOf(fieldName);
                    if (indexOfFoundElement !== -1) {

                        line[indexOfFoundElement] = (document.resource as any)[fieldName];
                    }
                    return line;
                }, newLine);
        }
    }


    function makeFieldNamesList(resourceType: IdaiType) {

        let fieldNames: string[] = getUsableFieldNames(resourceType.fields.map(to('name')));
        const indexOfShortDescription = fieldNames.indexOf('shortDescription');
        if (indexOfShortDescription !== -1) {
            fieldNames.splice(indexOfShortDescription, 1);
            fieldNames.unshift('shortDescription');
        }
        fieldNames = fieldNames.filter(isnt('identifier'));
        fieldNames.unshift('identifier');
        return fieldNames;
    }


    function getUsableFieldNames(fieldNames: string[]): string[] {

        return fieldNames
            .filter(isnt('type'))
            .filter(isnt('geometry'))  // TODO probably enable later
            .filter(isnt('id'));
    }


    const toCsvLine = (as: string[]): string => as.join(',');


    const identity = (_: any) => _; // TODO move to tsfun or expose tsfuns identical
}