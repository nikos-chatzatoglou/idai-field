import { Document, ProjectConfiguration } from 'idai-field-core';
import React, { useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import useMapData from '../../../hooks/use-mapdata';
import { DocumentRepository } from '../../../repositories/document-repository';
import {
    GeoLineString, GeoMultiLineString, GeoMultiPoint,
    GeoMultiPolygon, GeoPoint, GeoPolygon
} from './geo-svg';
import { ViewPort } from './geo-svg/geojson-cs-to-svg-cs/viewport-utils/viewport-utils';
import { GeoMap, getGeoMapCoords, getGeoMapDoc, getGeoMapIsSelected } from './geometry-map/geometry-map';
import MapBottomDrawer from './MapBottomDrawer';
import { getDocumentFillOpacityPress } from './svg-element-props';
import SvgMap from './SvgMap/SvgMap';

interface MapProps {
    repository: DocumentRepository
    selectedDocumentIds: string[];
    config: ProjectConfiguration;
    navigateToDocument: (docId: string) => void;
}


const Map: React.FC<MapProps> = ({ repository, selectedDocumentIds, config, navigateToDocument }) => {

    const [viewPort, setViewPort] = useState<ViewPort>();
    const [highlightedDoc, setHighlightedDoc] = useState<Document | null>(null);
    const zoom = useRef<Animated.Value>(new Animated.Value(1)).current;


    const selectDocHandler = (doc: Document) => {

        setHighlightedDoc(doc);
    };


    const handleLayoutChange = (event: LayoutChangeEvent) => {

        setViewPort(event.nativeEvent.layout);
    };
    

    const updateZoom = (value: Animated.Value) => {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        zoom.setValue((value as any)._value);
    };

    const [
        docIds,
        documentsGeoMap,
        transformMatrix, viewBox, focusMapOnDocument] = useMapData(repository,viewPort, selectedDocumentIds);


    return (
        <View style={ { flex: 1 } }>
            <View onLayout={ handleLayoutChange } style={ styles.mapContainer }>
                { (docIds && documentsGeoMap && viewPort && transformMatrix && viewBox) &&
                    <SvgMap style={ styles.svg } viewPort={ viewPort }
                        viewBox={ viewBox.join(' ') } updatedZoom={ updateZoom }>
                        {docIds.map(docId =>
                            renderGeoSvgElement(
                                documentsGeoMap,
                                config,
                                selectDocHandler,
                                highlightedDoc ? highlightedDoc.resource.id : '',
                                docId, zoom))}
                    </SvgMap>
                }
            </View>
            <MapBottomDrawer
                document={ highlightedDoc }
                config={ config }
                navigateToDocument={ navigateToDocument }
                focusHandler={ focusMapOnDocument } />
        </View>
    );
};

const styles = StyleSheet.create({
    mapContainer: {
        flex: 1,
    },
    svg: {
        height: '100%',
        width: '100%'
    },
});


const renderGeoSvgElement = (
        geoMap: GeoMap,
        config: ProjectConfiguration,
        onPressHandler: (doc: Document) => void,
        highlightedDocId: string,
        docId: string,
        zoom: Animated.Value) => {
    

    const doc = getGeoMapDoc(geoMap, docId);
    if(doc){
        const geoType = doc.resource.geometry.type;

        const props = {
            coordinates: getGeoMapCoords(geoMap,docId),
            key: docId,
            zoom: zoom,
            ...getDocumentFillOpacityPress(
                doc,
                geoMap,
                onPressHandler,
                config,
                highlightedDocId === docId,
                getGeoMapIsSelected(geoMap, docId)) };
    
        switch(geoType){
            case('Polygon'):
                return <GeoPolygon { ...props } />;
            case('MultiPolygon'):
                return <GeoMultiPolygon { ...props } />;
            case('LineString'):
                return <GeoLineString { ...props } />;
            case('MultiLineString'):
                return <GeoMultiLineString { ...props } />;
            case('Point'):
                return <GeoPoint { ...props } />;
            case('MultiPoint'):
                return <GeoMultiPoint { ...props } />;
            default:
                console.error(`Unknown type: ${geoType}`);
            }
    }
};


export default Map;
