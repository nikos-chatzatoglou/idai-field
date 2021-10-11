import { includedIn, isNot, isnt, Map, pairWith, flow, filter, clone, assoc, keysValues, map, forEach,
    lookup } from 'tsfun';
import { TransientFormDefinition } from '../model/form/transient-form-definition';
import { ConfigurationErrors } from './configuration-errors';
import { CustomFormDefinition } from '../model/form/custom-form-definition';
import { TransientCategoryDefinition } from '../model/category/transient-category-definition';
import { BuiltInFieldDefinition } from '../model/field/built-in-field-definition';
import { addFieldsToForm } from './add-fields-to-form';
import { Relation } from '../../model/configuration/relation';


/**
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 */
export function mergeWithCustomForms(customForms: Map<CustomFormDefinition>,
                                     categories: Map<TransientCategoryDefinition>,
                                     builtInFields: Map<BuiltInFieldDefinition>,
                                     commonFields: Map<BuiltInFieldDefinition>,
                                     relations: Array<Relation>) {

    return (forms: Map<TransientFormDefinition>) => {

        return keysValues(customForms).reduce(
            (mergedForms: Map<TransientFormDefinition>,
            [customFormName, customForm]: [string, CustomFormDefinition]) => {

            return assoc(customFormName,
                mergedForms[customFormName]
                    ? handleDirectExtension(
                        customForm, mergedForms[customFormName], categories, builtInFields, commonFields, relations
                    )
                    : handleChildExtension(
                        customFormName, customForm, categories, builtInFields, commonFields, relations
                    )
            )
            (mergedForms);

        }, clone(forms));
    };
}


function handleDirectExtension(customForm: CustomFormDefinition,
                               extendedForm: TransientFormDefinition,
                               categories: Map<TransientCategoryDefinition>,
                               builtInFields: Map<BuiltInFieldDefinition>,
                               commonFields: Map<BuiltInFieldDefinition>,
                               relations: Array<Relation>): TransientFormDefinition {

    const clonedCustomForm: TransientFormDefinition = clone(customForm) as TransientFormDefinition;
    clonedCustomForm.categoryName = extendedForm.categoryName;
    
    const result = addFieldsToForm(clonedCustomForm, categories, builtInFields, commonFields, relations, extendedForm);

    return mergeFormProperties(extendedForm, result);
}


function handleChildExtension(customFormName: string, 
                              customForm: CustomFormDefinition,
                              categories: Map<TransientCategoryDefinition>,
                              builtInFields: Map<BuiltInFieldDefinition>,
                              commonFields: Map<BuiltInFieldDefinition>,
                              relations: Array<Relation>): TransientFormDefinition {

    if (!customForm.parent) throw [ConfigurationErrors.MUST_HAVE_PARENT, customFormName];

    const clonedCustomForm = customForm as TransientFormDefinition;
    clonedCustomForm.name = customFormName;
    clonedCustomForm.categoryName = customFormName;

    return addFieldsToForm(clonedCustomForm, categories, builtInFields, commonFields, relations);
}


function mergeFormProperties(target: TransientFormDefinition,
                             source: TransientFormDefinition): TransientFormDefinition {

    if (source[CustomFormDefinition.VALUELISTS]) {
        if (!target[CustomFormDefinition.VALUELISTS]) target[CustomFormDefinition.VALUELISTS] = {};

        keysValues(source[CustomFormDefinition.VALUELISTS]).forEach(([valuelistId, valuelist]) => {
            target[CustomFormDefinition.VALUELISTS][valuelistId] = valuelist;
        });
    }
    
    target.fields = source.fields;
    target.defaultColor = target.color;
    if (source.color) target.color = source.color;
    if (source.groups) target.groups = source.groups;

    flow(
        source,
        Object.keys,
        filter(isnt(TransientFormDefinition.FIELDS)),
        filter(isNot(includedIn(Object.keys(target)))),
        map(pairWith(lookup(source))),
        forEach(overwriteIn(target))
    );

    return target;
}


function overwriteIn(target: Map<any>) {

    return ([key, value]: [string, any]) => target[key] = value;
}
