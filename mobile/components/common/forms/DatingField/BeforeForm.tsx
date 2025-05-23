import { DatingElement } from 'idai-field-core';
import React from 'react';
import { StyleSheet } from 'react-native';
import BooleanCheckbox from '../../BooleanCheckbox';
import Row from '../../Row';
import BaseForm from './BaseForm';
import { FormBaseProps, IS_IMPRECISE_ID, IS_UNCERTAIN_ID } from './constants';
import DatingElementField from './DatingElementField';

interface BeforeFormProps extends FormBaseProps {
  end: DatingElement | undefined;
  setEnd: (dating: DatingElement) => void;
  isImprecise: boolean | undefined;
  setIsImprecise: (imprecise: boolean) => void;
  isUncertian: boolean | undefined;
  setIsUncertian: (uncertain: boolean) => void;
}

const BeforeForm: React.FC<BeforeFormProps> = (props) => {
  return (
    <BaseForm
      onSubmit={props.onSubmit}
      onCancel={props.onCancel}
      setSource={props.setSource}
      source={props.source}
      testID="beforeForm"
    >
      <DatingElementField
        dating={props.end}
        setDating={props.setEnd}
        type="end"
      />
      <Row>
        <BooleanCheckbox
          value={props.isImprecise}
          setValue={props.setIsImprecise}
          title="Imprecise"
          style={styles.checkbox}
          testID={IS_IMPRECISE_ID}
        />
        <BooleanCheckbox
          value={props.isUncertian}
          setValue={props.setIsUncertian}
          title="Uncertain"
          style={styles.checkbox}
          testID={IS_UNCERTAIN_ID}
        />
      </Row>
    </BaseForm>
  );
};

const styles = StyleSheet.create({
  checkbox: {
    margin: 5,
  },
});

export default BeforeForm;
