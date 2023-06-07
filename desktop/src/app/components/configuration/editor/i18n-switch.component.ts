import { Component, Input, Output, EventEmitter } from '@angular/core';
import { I18n } from '@ngx-translate/i18n-polyfill';
import { Field } from 'idai-field-core';


@Component({
    selector: 'i18n-switch',
    templateUrl: './i18n-switch.html'
})
/**
 * @author Thomas Kleinke
 */
export class I18nSwitchComponent {

    @Input() inputType: Field.InputType;
    

    @Output() onChanged: EventEmitter<string> = new EventEmitter<string>();

  
    constructor(private i18n: I18n) {}


    public isI18nInputType = () => Field.InputType.I18N_INPUT_TYPES.includes(this.inputType);

    public isI18nOptionEnabled = () => this.inputType !== Field.InputType.TEXT;


    public getI18nOptionTooltip(): string {

        if (this.inputType === Field.InputType.TEXT) {
            return this.i18n({
                id: 'configuration.i18nOption.changingNotAllowed',
                value: 'Die Eingabe in mehreren Sprachen ist für Felder dieses Eingabetyps immer aktiviert.'
            });
        } else {
            return '';
        }
    }


    public toggleI18nInput() {

        switch (this.inputType) {
            case Field.InputType.INPUT:
                this.onChanged.emit(Field.InputType.SIMPLE_INPUT);
                break;
            case Field.InputType.SIMPLE_INPUT:
                this.onChanged.emit(Field.InputType.INPUT);
                break;
            case Field.InputType.MULTIINPUT:
                this.onChanged.emit(Field.InputType.SIMPLE_MULTIINPUT);
                break;
            case Field.InputType.SIMPLE_MULTIINPUT:
                this.onChanged.emit(Field.InputType.MULTIINPUT);
                break;
        }
    }
}
