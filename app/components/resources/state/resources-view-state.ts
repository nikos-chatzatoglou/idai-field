import {NavigationPathInternal} from './navigation-path-internal';


/**
 * @author Thomas Kleinke
 */
export interface ResourcesViewState {

    mainTypeDocumentResourceId?: string;
    layerIds: {[mainTypeDocumentId: string]: string[]};
    navigationPaths: {[mainTypeDocumentId: string]: NavigationPathInternal};
}


export class ResourcesViewState {

    public static default() {

        return {
            mode: 'map',
            navigationPaths: {},
            layerIds: {}
        };
    };


    public static complete(viewState: ResourcesViewState) {

        if (!viewState.layerIds || Array.isArray(viewState.layerIds)) {
            viewState.layerIds = {};
        } else {
            for (let key of Object.keys(viewState.layerIds)) {
                if (!Array.isArray(viewState.layerIds[key])) {
                    delete viewState.layerIds[key];
                }
            }
        }

        viewState.navigationPaths = {};
    }
}