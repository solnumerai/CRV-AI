import React from "react";
import { connect } from "react-redux";

import {
  showNodes,
  useDarkTheme,
  colorBy,
  selectControls
} from "domain/controls";
import { selectMergedConfiguration, selectMergedValues, getFieldId } from "domain/dataset";

import FieldSelect from "./FieldSelect";

import style from "./MiscControls.module.css";

function MiscControls(props) {
  const {
  controls,
  configuration,
  values,
  showNodes,
  colorBy,
  } = props;
  const fields = configuration.fields.filter((f) => f.groupable);
  const darkThemeChanged = (checked) => {
    props.useDarkTheme(checked)
  };
  return (
    <div className={style.container}>
      <div className={`${style.checkboxContainer} input-group`}>
        <div className={ style.switch }>
          <input
            type="checkbox"
            id="show-node-check"
            checked={controls.shouldShowNodes}
            onChange={(evt) => showNodes(evt.target.checked)}
          />
          <label htmlFor="show-node-check" className={ style.switchLabel }>
          </label>
        </div>
        <label >Show nodes</label>
      </div>

      <div className={`${style.checkboxContainer} input-group`}>
        <div className={ style.switch }>
          <input
            type="checkbox"
            id="dark-theme-check"
            checked={controls.darkTheme}
            onChange={(evt) => darkThemeChanged(evt.target.checked)}
          />
          <label htmlFor="dark-theme-check" className={ style.switchLabel }> 
          </label>
        </div>
        <label>Use dark theme</label>
      </div>

      <div className={`input-group ${style.colorBy}`}>
        <label htmlFor="colorBy">Color by</label>
        <div className={style.fieldSelect}>
          <FieldSelect
            name="colorBy"
            className={style.selector}
            onChange={colorBy}
            fields={fields}
            values={values}
            getFieldId={getFieldId}
            value={controls.colorBy}
          />
        </div>
      </div>
    </div>
  );
}

const mapStateToProps = (state) => {
  return {
    controls: selectControls(state),
    configuration: selectMergedConfiguration(state),
    values: selectMergedValues(state)
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    showNodes: (shouldShowNodes) => dispatch(showNodes(shouldShowNodes)),
    useDarkTheme: (darkTheme) => dispatch(useDarkTheme(darkTheme)),
    colorBy: (field) => dispatch(colorBy(field))
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(MiscControls);
