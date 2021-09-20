import { AfterViewChecked, AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { NgbActiveModal, NgbModal, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { Document, Datastore } from 'idai-field-core';
import { AngularUtility } from '../../angular/angular-utility';
import { reload } from '../../core/common/reload';
import { StateSerializer } from '../../core/common/state-serializer';
import { ProjectNameValidator } from '../../core/model/project-name-validator';
import { Settings, SyncTarget } from '../../core/settings/settings';
import { SettingsProvider } from '../../core/settings/settings-provider';
import { SettingsService } from '../../core/settings/settings-service';
import { DoceditComponent } from '../docedit/docedit.component';
import { MenuContext, MenuService } from '../menu-service';
import { M } from '../messages/m';
import { Messages } from '../messages/messages';
import { ProjectNameValidatorMsgConversion } from '../messages/project-name-validator-msg-conversion';

const remote = typeof window !== 'undefined' ? window.require('@electron/remote') : undefined;


@Component({
    selector: 'projects-modal',
    templateUrl: './projects-modal.html',
    host: {
        '(document:click)': 'handleClick($event)',
        '(window:keydown)': 'onKeyDown($event)'
    }
})
/**
 * @author Thomas Kleinke
 * @author Daniel de Oliveira
 */
export class ProjectsModalComponent implements OnInit, AfterViewChecked {

    public selectedProject: string;
    public newProject: string = '';
    public projectToDelete: string = '';
    public openConflictResolver: boolean = false;
    public settings: Settings;
    public syncTarget: SyncTarget;

    private focusInput: boolean = false;

    @ViewChild('createPopover', { static: false }) private createPopover: NgbPopover;
    @ViewChild('deletePopover', { static: false }) private deletePopover: NgbPopover;


    constructor(public activeModal: NgbActiveModal,
                private settingsProvider: SettingsProvider,
                private settingsService: SettingsService,
                private modalService: NgbModal,
                private messages: Messages,
                private stateSerializer: StateSerializer,
                private datastore: Datastore,
                private menuService: MenuService) {
    }

    
    async ngOnInit() {

        this.settings = this.settingsProvider.getSettings();

        if (!this.settings.syncTargets[this.settings.selectedProject]) {
            this.settings.syncTargets[this.settings.selectedProject] = {
                address: '', password: '', isSyncActive: false
            };
        }
        this.syncTarget = this.settings.syncTargets[this.settings.selectedProject];
    }


    ngAfterViewChecked() {

        if (this.focusInput) {
            AngularUtility.focusElementInNgTemplate('new-project-input');
            AngularUtility.focusElementInNgTemplate('delete-project-input');
            this.focusInput = false;
        }
    }


    public onKeyDown(event: KeyboardEvent) {

        if (this.menuService.getContext() === MenuContext.PROJECTS && event.key === 'Escape') {
            if (this.createPopover.isOpen()) {
                this.createPopover.close();
            } else if (this.deletePopover.isOpen()) {
                this.deletePopover.close();
            } else {
                this.activeModal.close();
            }
        }
    }


    public reset() {

        this.projectToDelete = '';
        this.newProject = '';
    }


    public openMenu(popover: any) {

        this.reset();
        popover.toggle();
        this.focusInput = true;
    }


    public handleClick(event: Event) {

        let target: any = event.target;
        let insideCreatePopover: boolean = false;
        let insideDeletePopover: boolean = false;

        do {
            if (target.id === 'new-project-menu' || target.id === 'new-project-button') {
                insideCreatePopover = true;
            }
            if (target.id === 'delete-project-menu' || target.id === 'delete-project-button') {
                insideDeletePopover = true;
            }
            target = target.parentNode;
        } while (target);

        if (!insideCreatePopover && this.createPopover.isOpen()) this.createPopover.close();
        if (!insideDeletePopover && this.deletePopover.isOpen()) this.deletePopover.close();
    }


    public async toggleSync() {

        this.syncTarget.isSyncActive = !this.syncTarget.isSyncActive;
        try {
        this.settings = await this.settingsService.updateSettings(this.settings);
        } catch (err) {
            console.error(err);
        }

        this.syncTarget = this.settings.syncTargets[this.settings.selectedProject];
        await this.settingsService.setupSync();
    }
}
