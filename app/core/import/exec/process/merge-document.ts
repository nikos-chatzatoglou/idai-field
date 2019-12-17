import {isNot, includedIn, isArray, isObject, keys} from 'tsfun';
import {NewDocument, Document, Resource} from 'idai-components-2';
import {clone} from '../../../util/object-util';
import {HIERARCHICAL_RELATIONS} from '../../../model/relation-constants';
import {ImportErrors} from '../import-errors';


/**
 * @author Daniel de Oliveira
 *
 * @throws
 *   [ImportErrors.TYPE_CANNOT_BE_CHANGED] TODO document in process apidoc
 *   [ImportErrors.EMPTY_SLOTS_IN_ARRAYS_FORBIDDEN]
 */
export function mergeDocument(into: Document, additional: NewDocument): Document {

    if (additional.resource.type && into.resource.type !== additional.resource.type) {
        throw [ImportErrors.TYPE_CANNOT_BE_CHANGED, into.resource.identifier];
    }

    const target = clone(into);

    try {

        target.resource =
            overwriteOrDeleteProperties(
                target.resource,
                additional.resource,
                Resource.CONSTANT_FIELDS, true);

        if (!additional.resource.relations) return target;

        target.resource.relations =
            overwriteOrDeleteProperties(
                target.resource.relations ? target.resource.relations : {},
                additional.resource.relations,
                [HIERARCHICAL_RELATIONS.RECORDED_IN],
                false);
        return target;

    } catch (err) {
        throw err === ImportErrors.EMPTY_SLOTS_IN_ARRAYS_FORBIDDEN
            ? [ImportErrors.EMPTY_SLOTS_IN_ARRAYS_FORBIDDEN, into.resource.identifier]
            : err;
    }
}


/**
 * Iterates over all fields of source, except those specified by exlusions
 * and either copies them from source to target
 * or deletes them if the field is set to null.
 *
 * If expandObjectArrays is set, objects contained within array fields
 * get copied by the same rules, recursively.
 *
 * @param target
 * @param source
 * @param exclusions
 * @param expandObjectArrays
 */
function overwriteOrDeleteProperties(target: {[_: string]: any}|undefined,
                                     source: {[_: string]: any},
                                     exclusions: string[],
                                     expandObjectArrays: boolean) {

    return Object.keys(source)
        .filter(isNot(includedIn(exclusions)))
        .reduce((target: any, propertyName: string|number) => {

            if (source[propertyName] === null) delete target[propertyName];
            else if (expandObjectArrays && isArray(source[propertyName])) {

                if (!target[propertyName]) target[propertyName] = [];
                expandObjectArray(target[propertyName], source[propertyName]);
            }
            else if (isObject(source[propertyName]) && isObject(target[propertyName])) {

                overwriteOrDeleteProperties(target[propertyName], source[propertyName], [], expandObjectArrays);
            }
            else target[propertyName] = source[propertyName];

            return target;
        }, target ? target : {});
}


function expandObjectArray(target: Array<any>, source: Array<any>) {

    keys(source).forEach(index => {

        if (source[index] === undefined || source[index] === null) return; // TODO should ignore only undefined, but not null

        if (target.length < index) throw ImportErrors.EMPTY_SLOTS_IN_ARRAYS_FORBIDDEN;

        if (isObject(source[index]) && isObject(target[index])) {
            overwriteOrDeleteProperties(target[index], source[index], [], true);
        } else {
            target[index] = source[index];
        }
    });
}