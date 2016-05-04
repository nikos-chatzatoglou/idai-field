import {Injectable,Inject} from "angular2/core";
import {IdaiFieldObject} from "../model/idai-field-object";
import {Datastore} from "./../datastore/datastore";
import {Messages} from "./messages";
import {M} from "./../m";

/**
 * @author Thomas Kleinke
 * @author Daniel M. de Oliveira
 * @author Jan G. Wieners
 */
@Injectable()

export class ObjectList {
    
    constructor(private datastore: Datastore) {}

    private objects: IdaiFieldObject[];

    /**
     * Contains the technical ids of every object with unsaved changes.
     */
    private changedObjects: string[] = [];

    private containsNew = false;


    /**
     * Saves all changed objects to the local database if they are valid.
     * Creates a new object if an object is not present in the datastore (which means the objects don't
     * need to already have a technical id).
     * 
     * @return promise. Gets resolved in case the objects were stored successfully.
     * Gets rejected in case of errors, which are keys of M to identify the error if possible.
     */
    public trySave(): Promise<any> {

        return new Promise<any>((resolve, reject) => {

            if (this.containsNew==false && this.changedObjects.length == 0) resolve();


            var saveObjectPromises: Promise<any>[] = [];
            Promise.all(this.allChangedObjects()).then(
                objects => {
                    for (var i in objects) {
                        saveObjectPromises.push(this.save(objects[i]));
                    }

                    Promise.all(saveObjectPromises).then(
                        () => {
                            this.changedObjects = [];
                            this.containsNew = false;
                            resolve();
                        },
                        errors => {
                            if ((typeof errors)=="string") return reject([errors]); else return reject(errors);
                        }
                    );
                },
                err => {
                    reject(err);
                }
            );
        });
    }


    public getObjects() {
        return this.objects;
    }

    public setObjects(objects: IdaiFieldObject[]) {
        this.objects = objects;
    }

    public setChanged(object: IdaiFieldObject, changed: boolean) {
        if (changed) {
            if (object && (!object.id)) {
                this.containsNew=true;
            }
            else if (changed && !this.isChanged(object)) {
                if (object.id) this.changedObjects.push(object.id);
            }
        }
        else {
            var index = this.changedObjects.indexOf(object.id);
            if (index > -1) this.changedObjects.splice(index, 1);
        }
    }

    public isChanged(object: IdaiFieldObject): boolean {
        if (this.containsNew) return true;
        return this.changedObjects.indexOf(object.id) > -1;
    }

    
    /**
     * Restores all changed objects.
     */
    public restoreAll(): Promise<any> {

        return new Promise<any>((resolve, reject) => {

            Promise.all(this.allChangedObjects()).then(
                objects => {

                    var restoreObjectPromises:Promise<any>[] = [];
                    for (var i in objects)
                        restoreObjectPromises.push(this.restore(objects[i]));

                    Promise.all(restoreObjectPromises).then(
                        () => {
                            this.changedObjects = [];
                            this.containsNew = false;
                            resolve();
                        },
                        errors => reject(errors)
                    );
                },
                err => {
                    reject(err);
                }
            );
        });
    }

    private allChangedObjects() : Promise<IdaiFieldObject>[] {

        var objectPromises: Promise<IdaiFieldObject>[] = [];
        for (var i in this.changedObjects) {
            objectPromises.push(this.datastore.get(this.changedObjects[i]));
        }
        if (this.containsNew) {
            var newOPromise = new Promise<IdaiFieldObject>((resolve)=> resolve(this.objects[0]));
            objectPromises.push(newOPromise);
        }
        return objectPromises;
    }

    /**
     * Saves the object to the local datastore.
     * @param object
     */
    private save(object: any): any {

        // Replace with proper validation
        if (!object.identifier || object.identifier.length == 0) {
            return new Promise((resolve, reject) => { reject(M.OBJLIST_IDMISSING); });
        }

        object.synced = 0;

        if (object.id) {
            return this.update(object);
        } else {
            return this.create(object);
        }
    }

    /**
     * Updates an existing object in the local datastore.
     * @param object
     */
    private update(object: IdaiFieldObject) : any {
        return this.datastore.update(object);
    }

    /**
     * Saves the given object as a new object in the local datastore.
     * @param object
     */
    private create(object: IdaiFieldObject) : any {
        return this.datastore.create(object);
    }

    private restore(object: any): Promise<any> {

        return new Promise<any>((resolve, reject) => {
            if (!object.id) {
                this.removeNewObjectFromList(object);
                return resolve();
            }

            this.datastore.refresh(object.id).then(
                restoredObject => {
                    var index = this.objects.indexOf(object);
                    this.objects[index] = restoredObject;
                    this.setChanged(restoredObject, false);
                    resolve();
                },
                err => { reject(err); }
            );
        });
    }

    private removeNewObjectFromList(object: IdaiFieldObject) {
        var index = this.getObjects().indexOf(object);
        this.getObjects().splice(index, 1);
    }
}