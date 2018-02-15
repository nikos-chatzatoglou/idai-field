import {Component, SimpleChanges} from '@angular/core';
import {MapComponent} from 'idai-components-2/idai-field-map';
import {Messages} from 'idai-components-2/messages';
import {ConfigLoader} from 'idai-components-2/configuration';
import {ImageContainer} from '../../../../core/imagestore/image-container';
import {ImageLayerManager} from './image-layer-manager';
import {ListDiffResult} from '../layer-manager';
import {IdaiFieldImageDocument} from '../../../../core/model/idai-field-image-document';
import {LayerImageProvider} from './layer-image-provider';


@Component({
    moduleId: module.id,
    selector: 'layer-map',
    templateUrl: './layer-map.html'
})
/**
 * @author Thomas Kleinke
 * @author Daniel de Oliveira
 */
export class LayerMapComponent extends MapComponent {

    public layers: Array<IdaiFieldImageDocument> = [];

    private panes: { [resourceId: string]: any } = {};
    private imageOverlays: { [resourceId: string]: L.ImageOverlay } = {};
    private layersUpdate: boolean = false;


    constructor(private layerManager: ImageLayerManager,
                private layerImageProvider: LayerImageProvider,
                protected messages: Messages,
                configLoader: ConfigLoader) {

        super(configLoader);

        this.layerManager.reset();
    }


    public async toggleLayer(layer: IdaiFieldImageDocument) {

        this.layerManager.toggleLayer(layer.resource.id as any, this.mainTypeDocument);

        if (this.layerManager.isActiveLayer(layer.resource.id as any)) {
            await this.addLayerToMap(layer.resource.id as any);
        } else {
            this.removeLayerFromMap(layer.resource.id as any);
        }
    }


    public focusLayer(layer: IdaiFieldImageDocument) {

        const georeference = layer.resource.georeference;
        const bounds = [] as any;

        bounds.push(L.latLng((georeference as any).topLeftCoordinates) as never);
        bounds.push(L.latLng((georeference as any).topRightCoordinates) as never);
        bounds.push(L.latLng((georeference as any).bottomLeftCoordinates) as never);

        this.map.fitBounds(bounds);
    }


    /**
     * Called by MapComponent.ngOnChange
     */
    protected async updateMap(changes: SimpleChanges): Promise<any> {

        if (LayerMapComponent.isLayersUpdateNecessary(changes)) this.layersUpdate = true;

        if (!this.update) return Promise.resolve();

        await super.updateMap(changes);

        if (this.layersUpdate) {
            this.layersUpdate = false;
            return this.updateLayers();
        }
    }


    private async updateLayers(): Promise<any> {

        this.layerImageProvider.reset();

        const { layers, activeLayersChange } =
            await this.layerManager.initializeLayers(this.mainTypeDocument);

        this.layers = layers;
        this.initializePanes();
        this.handleActiveLayersChange(activeLayersChange);
    }


    private handleActiveLayersChange(change: ListDiffResult) {

        change.removed.forEach(layerId => this.removeLayerFromMap(layerId));
        change.added.forEach(layerId => this.addLayerToMap(layerId));
    }


    private initializePanes() {

        this.layers
            .filter(layer => !this.panes[layer.resource.id as any])
            .reduce((zIndex, layer) => this.createPane(zIndex, layer), 1);
    }


    private createPane(zIndex: any, layer: any) {

        const pane = this.map.createPane(layer.resource.id);
        pane.style.zIndex = String(zIndex);
        this.panes[layer.resource.id] = pane;
        return zIndex + 1;
    }


    private async addLayerToMap(resourceId: string) {

        const layerDocument: IdaiFieldImageDocument|undefined
            = this.layers.find(layer => layer.resource.id == resourceId);
        if (!layerDocument) return;

        const imageContainer: ImageContainer = await this.layerImageProvider.getImageContainer(resourceId);

        const georeference = layerDocument.resource.georeference;
        this.imageOverlays[resourceId] = L.imageOverlay(
            imageContainer.imgSrc ? imageContainer.imgSrc : imageContainer.thumbSrc as any,
            [(georeference as any).topLeftCoordinates,
            (georeference as any).topRightCoordinates,
            (georeference as any).bottomLeftCoordinates],
            { pane: layerDocument.resource.id }).addTo(this.map);
    }


    private removeLayerFromMap(resourceId: string) {

        const imageOverlay = this.imageOverlays[resourceId];
        if (!imageOverlay) {
            console.warn('Failed to remove image ' + resourceId + ' from map. Image overlay not found.');
            return;
        }

        this.map.removeLayer(imageOverlay);
    }


    /**
     * Makes sure that layers are updated only once after switching to another view or main type document.
     * Triggering the update method more than once can lead to errors caused by resetting the layer image
     * provider while the images are still loading.
     */
    private static isLayersUpdateNecessary(changes: SimpleChanges): boolean {

        // Update layers after switching main type document.
        // Update layers after switching to another view with an existing main type document or coming from
        // a view with an existing main type document.
        if (changes['mainTypeDocument']
            && (changes['mainTypeDocument'].currentValue || changes['mainTypeDocument'].previousValue)) {
            return true;
        }

        // Update layers after switching from a view without main type documents to another view without
        // main type documents.
        return (changes['documents'] && changes['documents'].currentValue
            && changes['documents'].currentValue.length == 0);
    }
}
