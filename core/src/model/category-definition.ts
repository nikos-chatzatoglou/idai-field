import { I18nString } from './i18n-string';


/**
 * CategoryDefinition, as used in ProjectConfiguration
 *
 * @author Daniel de Oliveira
 */
export interface CategoryDefinition {

    name: string;
    label?: I18nString;
    description?: I18nString;
    defaultLabel?: I18nString;
    defaultDescription?: I18nString;
    abstract?: boolean;

    /**
     * @see BuiltinCategoryDefinition
     */
    mustLieWithin?: true,
    fields?: any;
    parent?: string;
    color?: string;
    defaultColor?: string;
    libraryId?: string;
    userDefinedSubcategoriesAllowed?: boolean;
    groups: Array<GroupDefinition>;
}


export interface GroupDefinition {

    name: string;
    fields: string[];
}


export module CategoryDefinition {

    export const FIELDS = 'fields';
    export const PARENT = 'parent';
}