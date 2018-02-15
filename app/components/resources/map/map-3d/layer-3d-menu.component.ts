import {Component} from '@angular/core';
import {LayerMenuComponent} from '../layer-menu.component';
import {Layer3DManager} from './layer-3d-manager';


@Component({
    moduleId: module.id,
    selector: 'layer-3d-menu',
    templateUrl: './layer-3d-menu.html'
})
/**
 * @author Thomas Kleinke
 */
export class Layer3DMenuComponent extends LayerMenuComponent {

    constructor(layerManager: Layer3DManager) {

        super(layerManager);
    }
}