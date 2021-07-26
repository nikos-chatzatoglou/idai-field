import { Map } from 'tsfun';
import { Valuelists } from '../../model';
import { I18N, Name } from '../../tools';
import { assertFieldsAreValid } from '../boot/assert-fields-are-valid';
import { ConfigurationErrors } from '../boot/configuration-errors';
import { BaseCategoryDefinition, BaseFieldDefinition, BaseGroupDefinition } from './base-category-definition';


/**
 * CategoryDefinition, as used in FormLibrary
 *
 * @author Daniel de Oliveira
 */
export interface LibraryCategoryDefinition extends BaseCategoryDefinition {

    color?: string,
    positionValuelists?: Valuelists;
    commons?: string[];
    parent?: string,
    categoryName: string;
    libraryId?: string;
    description: I18N.String,
    createdBy: string,
    creationDate: string;
    fields: Map<LibraryFieldDefinition>;
    groups: Array<BaseGroupDefinition>;
}


export interface LibraryFieldDefinition extends BaseFieldDefinition {

    inputType?: string;
    positionValuelistId?: string;
}


const VALID_FIELD_PROPERTIES = [
    'inputType',
    'positionValues',
    'constraintIndexed',
    'fulltextIndexed',
    'creationDate',
    'createdBy'
];


export namespace LibraryCategoryDefinition {

    export const PARENT = 'parent';


    export function makeAssertIsValid(builtinCategories: string[]) {

        return function assertIsValid([categoryName, category]: [Name, LibraryCategoryDefinition]) {

            if (category.description === undefined) throw [ConfigurationErrors.MISSING_CATEGORY_PROPERTY, 'description', categoryName];
            if (category.creationDate === undefined) throw [ConfigurationErrors.MISSING_CATEGORY_PROPERTY, 'creationDate', categoryName];
            if (category.createdBy === undefined) throw [ConfigurationErrors.MISSING_CATEGORY_PROPERTY, 'createdBy', categoryName];
            if (category.categoryName === undefined) throw [ConfigurationErrors.MISSING_CATEGORY_PROPERTY, 'categoryName', categoryName];
            if (category.commons === undefined) throw [ConfigurationErrors.MISSING_CATEGORY_PROPERTY, 'commons', categoryName];
            if (category.valuelists === undefined) throw [ConfigurationErrors.MISSING_CATEGORY_PROPERTY, 'valuelists', categoryName];

            if (!builtinCategories.includes(category.categoryName) && !category.parent) throw [ConfigurationErrors.MISSING_CATEGORY_PROPERTY, 'parent', categoryName];

            if (!category.fields) throw [ConfigurationErrors.MISSING_CATEGORY_PROPERTY, 'creationDate', categoryName];
            assertFieldsAreValid(category.fields, VALID_FIELD_PROPERTIES, 'library');
        }
    }
}
