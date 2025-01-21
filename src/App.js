import React, { Component } from "react";
import { connect } from 'react-redux';
import classNames from 'classnames';
import Modal from 'react-modal';
import { v4 as uuidv4 } from 'uuid';

import { RingLoader } from 'react-spinners';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faCheck, faDizzy, faPlus, faHome, faAngleDoubleDown, faAngleDoubleUp,
  faFileExport, faFileImport, faTimes
} from "@fortawesome/free-solid-svg-icons";

import { 
  selectDatasets, getLastUpdated, removeDataset,getKeyFields, getIgnoredFields
} from 'domain/dataset';
import { 
  setHierarchyConfig, showNodes, colorBy, selectControls, setStartDataset, setEndDataset,
  showBusy
} from 'domain/controls';
import { getAllNotes } from "./domain/notes";
import { getError, clearError } from "domain/error";
import { removeSearchIndex } from "epics/index-dataset-epic";
import { uploadDataset } from "epics/upload-dataset-epic";

import Header from 'features/header/Header';
import HierarchySelector from 'features/hierarchy-selector/HierarchySelector';
import ComparisonSelector from 'features/comparison-selector/ComparisonSelector';
import NoteSelectorList from 'features/note-selector/NoteSelector';
import MiscControls from 'features/misc-controls/MiscControls';
import SearchControls from 'features/search/SearchControls';
import Visualization from 'features/visualization/Visualization';
import DatasetControls from 'features/dataset-controls/DatasetControls';
import DatasetSlider from 'features/dataset-controls/DatasetSlider';
import DatasetUpload from 'features/dataset-controls/DatasetUpload';
import { getDataToExport } from "features/dataset-controls/export";
import TooltipControls from "features/tooltip/Tooltip";

import style from './App.module.css';

import datasets from './datasets';

Modal.setAppElement('#root');
const IMPORT = "import";
const EXPORT = "export";
const DATA = "data";
const CONTROLS = "controls";
const NOTES = "notes";
const defaultOptions = {
      action: "",
      data: true,
      controls: true,
      notes: true
    }

const getUniqueDatasetList = (datasetAdded, uuidsFromState, uuidsFromProps) => {
  let result = [];

  if(datasetAdded || uuidsFromProps.length === 0){
    const uniqueOwners = new Set();
    uuidsFromProps.concat(uuidsFromState).forEach((u) => {
      if(!uniqueOwners.has(u.owner)){
        uniqueOwners.add(u.owner);
        result.push(u);
      }
    });
  }
  else {
    result = uuidsFromProps;
  }

  return result;
}

class App extends Component {

  constructor(props) {
    super(props);

    const url = new URL(window.location);
    const params = new URLSearchParams(url.search);
    const ds_uri = params.get("dataSourceUrl");
    const ds_name = params.get("dataSourceName") || ds_uri || ""; 
     
    const initial_data_source = {'name': ds_name, 'url': ds_uri };

    this.state = {
      showData: true,
      showGrouping: false,
      showFiltering: false,
      uuids: [{'owner': uuidv4(), 'name': 'Series 0', 'shortName': 's0'}],
      datasetAdded: false,
      startUuid: null,
      endUuid: null,
      showOptions: false,
      options: {
        action: "",
        data: true,
        controls: true,
        notes: true,
      },
      selectedFile: null,
      exportName: "dataset.json",
      initialDataSource: ds_uri ? initial_data_source : null,
      resetNodeStyles: false,
    };
  }

  static getDerivedStateFromProps = (nextProps, prevState) =>{
    const datasetAdded = prevState.datasetAdded && (nextProps.uuids.length !== prevState.uuids.length)
    const uniqueUuids = getUniqueDatasetList(datasetAdded, prevState.uuids, nextProps.uuids);
    const startUuid = nextProps.startUuid && uniqueUuids.findIndex(u => u.owner === nextProps.startUuid) !== -1 ? nextProps.startUuid : prevState.startUuid;
    const endUuid = nextProps.endUuid && uniqueUuids.findIndex(u => u.owner === nextProps.endUuid) !== -1 ? nextProps.endUuid : prevState.endUuid;
    return {
      uuids: uniqueUuids,
      startUuid: startUuid,
      endUuid: endUuid,
      datasetAdded: datasetAdded,
    };
  }

  componentDidUpdate = (prevProps) => {
    if(this.state.resetNodeStyles){
      this.setState({
        resetNodeStyles: false,
      });
    }
  }

  toggleShowData = () =>{
    this.setState({
      showData: !this.state.showData,
      showComparison: false,
      showNotes:false,
      showGrouping: false,
      showFiltering: false,
    });
  }

  toggleShowComparison = () =>{
    this.setState({
      showData: false,
      showComparison: !this.state.showComparison,
      showGrouping: false,
      showFiltering: false
    });
  }

  toggleShowNotes = () =>{
    this.setState({
      showData: false,
      showComparison: false,
      showNotes: !this.state.showNotes,
      showGrouping: false,
      showFiltering: false
    });
  }

  toggleShowGrouping = () =>{
    this.setState({
      showData: false,
      showComparison: false,
      showGrouping: !this.state.showGrouping,
      showFiltering: false
    });
  }

  toggleShowFiltering = () =>{
    this.setState({
      showData: false,
      showComparison: false,
      showGrouping: false,
      showFiltering: !this.state.showFiltering
    });
  }

  onErrorClose = () => {
    this.props.clearError();
  }

  resetControls = () => {
    this.props.colorBy(null);
    this.props.setHierarchyConfig([]);
    this.props.showNodes(true);
    this.setState({
      resetNodeStyles: true,
    });
  }

  showImportOptions = () => {
    this.showOptions(IMPORT);
  }

  showExportOptions = () => {
    this.showOptions(EXPORT);
  }

  showOptions = (action) => {
    this.setOptions("action", action);
    this.setState({showOptions: true})
  }

  processOptions = () => {
    if(this.state.options.action === IMPORT)
    {
      this.props.showBusy(true);
      if(this.state.selectedFile){
        this.props.uploadDataset({
          'owner': uuidv4(),
          'file': this.state.selectedFile,
          'includeData': this.state.options.data,
          'includeControls': this.state.options.controls,
          'includeNotes': this.state.options.notes,
        })
      }
      this.setState({showOptions: false })
    }
  }

  onUpload = (file) => {
    this.setState({
      selectedFile: file,
    });
  }

  getDownloadUrl = () => {
    const datasets = this.state.options.data && this.props.fullDatasets;
    const controls = this.state.options.controls && this.props.controls;
    const notes = this.state.options.notes && this.props.notes;
    const keyFields = this.state.options.data && this.props.keyFields;
    const ignoredFields = this.state.options.data && this.props.ignoredFields;
    const exportData = getDataToExport(datasets, keyFields, ignoredFields, controls,notes)
    const urlObject = window.URL || window.webkitURL || window;
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], {'type': "application/json"});
    const url = urlObject.createObjectURL(blob);;
    return url;
  }

  exportNameChange = (name) => {
    this.setState({
      exportName: name,
    });
  }

  cancelOptions = () => {
    this.setState({
      showOptions: false,
      options: defaultOptions
    })
  }

  setOptions = (key, value) => {
    const options = this.state.options;
    options[key] = value;
    this.setState({options: options});
  }

  addDatasetEntry = () => {
    const uuids = this.state.uuids;
    const newItem = { 'owner': uuidv4(), 'name': 'Series ' + uuids.length, 'shortName': 's' + uuids.length };
    uuids.push(newItem);
    this.setState({
      uuids: uuids,
      datasetAdded: true
    });
  }

  removeDatasetEntry = (uuid) =>{
    const uuids = this.state.uuids;
    if(uuids.includes(uuid)){
      const newUuids = uuids.splice(uuids.indexOf(uuid), 1);
      this.setState({uuids: newUuids})
    }
    this.props.removeSearchIndex({'owner': uuid});
    this.props.removeDataset({'owner': uuid});
  }

  setStartUuid = (uuid) =>{
    this.setState({startUuid: uuid});
    this.props.setStartDataset(uuid);
  }

  setEndUuid = (uuid) =>{
    this.setState({endUuid: uuid});
    this.props.setEndDataset(uuid);
  }

  render() {
    const { datasetCount, darkTheme, error, lastUpdated} = this.props;
    const hasDataset = datasetCount > 0;

    const uuids = this.state.uuids;
    const startUuid = this.state.startUuid;
    const endUuid = this.state.endUuid;
    const showData = this.state.showData;
    const showComparison = this.state.showComparison;
    const showNotes = this.state.showNotes;
    const showGrouping = this.state.showGrouping;
    const showOptions = this.state.showOptions;
    const options = this.state.options;
    const initialDataSource = this.state.initialDataSource;

    return (
      <div className={
          classNames({
            [style.appContainer]: true,
            'darkTheme': darkTheme
          })
      }>
        <input name="hideControls" id="hideControls" type="checkbox" />
        <label htmlFor="hideControls" className={ style.hideControls }>
          { /* <FontAwesomeIcon icon={faChevron} /> */ }
          <span>&lt;&lt;</span>
        </label>
        <div className={ style.controls }>
          <Header />
          <div className={ classNames({ [style.centerSpan]: true }) }>
            <div className="button circular" title="Reset Controls" size="3x" onClick={this.resetControls}>
              <FontAwesomeIcon icon={faHome} />
            </div>
          </div>
          <div className={style.accordionHeader} onClick={this.toggleShowData}>
            Data  {!showData && <FontAwesomeIcon icon={faAngleDoubleDown} />}{showData && <FontAwesomeIcon onClick={this.toggleShowData} icon={faAngleDoubleUp} />}
          </div>
          <div className={ classNames({ [style.section]: true, [style.hidden]: !showData })}>
            {uuids.map((uuid) => {
              return(
                <div  key={ uuid.owner + "_container" } >
                  <DatasetControls 
                    uuid={ uuid.owner }
                    name={ uuid.name }
                    shortName={ uuid.shortName }
                    removeDatasetEntry={ this.removeDatasetEntry }
                    removable={uuids.length > 1}
                    datasets={ datasets }
                    initialDataSource={initialDataSource}/>
                </div>
              )
            })}
            <span className={ style.centerSpan }>
              <div className="button circular" title="Add Dataset" onClick={this.addDatasetEntry}>
                <FontAwesomeIcon icon={faPlus} />
              </div>
            </span>
          </div>

          { hasDataset &&
            <div className={ classNames({ [style.section]: true, [style.hidden]: !showData }) }>
              <SearchControls />
            </div>
          }

          <div className={style.accordionHeader} onClick={this.toggleShowGrouping}>
            Grouping  {!showGrouping && <FontAwesomeIcon icon={faAngleDoubleDown} />}{showGrouping && <FontAwesomeIcon  onClick={this.toggleShowGrouping} icon={faAngleDoubleUp} />}
          </div>
          { hasDataset &&
            <div className={ classNames({ [style.section]: true, [style.hierarchySection]: true, [style.hidden]: !showGrouping }) }>
              <HierarchySelector />
            </div>
          }

          { hasDataset &&
            <div className={ classNames({ [style.section]: true, [style.hidden]: !showGrouping }) }>
              <MiscControls />
            </div>
          }
          { !hasDataset && 
            <div className={ classNames({ [style.section]: true, [style.dimSection]:true, [style.hierarchySection]: true, [style.hidden]: !showGrouping }) }>
              Please select a dataset to continue
            </div>
          }

          <div className={style.accordionHeader} onClick={this.toggleShowComparison}>
            Comparison  {!showComparison && <FontAwesomeIcon icon={faAngleDoubleDown} />}{showComparison && <FontAwesomeIcon  onClick={this.toggleShowComparison} icon={faAngleDoubleUp} />}
          </div>
          { datasetCount >= 2 &&
            <div className={ classNames({ [style.section]: true, [style.hierarchySection]: true, [style.hidden]: !showComparison }) }>
              <ComparisonSelector startUid={startUuid} endUid={endUuid} />
            </div>
          }
          { datasetCount < 2 && 
            <div className={ classNames({ [style.section]: true, [style.dimSection]:true, [style.hierarchySection]: true, [style.hidden]: !showComparison }) }>
              Please select at least 2 datasets to continue
            </div>
          }
          <div className={style.accordionHeader} onClick={this.toggleShowNotes}>
            Notes  {!showNotes && <FontAwesomeIcon icon={faAngleDoubleDown} />}{showNotes && <FontAwesomeIcon  onClick={this.toggleShowNotes} icon={faAngleDoubleUp} />}
          </div>
          { showNotes &&
            <div> 
              <NoteSelectorList />
            </div>
          }

          
          <div className={style.footerContainer}>
            <span className={ style.centerSpan }>
                <div className="button circular" title="Import Dataset" onClick={this.showImportOptions}>
                  <FontAwesomeIcon icon={faFileImport} />
                </div>
                <div className="button circular" disabled={!hasDataset} title="Export Dataset" onClick={this.showExportOptions}>
                  <FontAwesomeIcon icon={faFileExport} />
                </div>
            </span>
          </div>

          
        </div>
        { datasetCount === 0 && lastUpdated !== null &&
          <div  className={ style.emptyDataset }>
            <span>
              Current dataset is empty
            </span>
          </div>
        }

        

        <div className={ style.canvas }>
          <Visualization startUid={startUuid} endUid={endUuid} resetNodeStyles={this.state.resetNodeStyles}/>
        </div>
        <div className={classNames({ [style.key]: true, [style.hidden]: datasetCount < 2 }) }>
          <svg width="100%" height="60">
            <g>
              <g className="viz-isAdded-fixed">
                <circle cx="15" cy="15" r="10"/>
              </g>
              <text x="30" y="15">Added</text>
            </g>
            <g>
              <g className="viz-isChanged-fixed">
                <circle cx="100" cy="15" r="10"/>
              </g>
              <text x="115" y="15">Changed</text>
            </g>
            <g>
              <g className="viz-isRemoved-fixed">
                <circle cx="200" cy="15" r="10"/>
              </g>
              <text x="215" y="15">Removed</text>
            </g>
          </svg>
        </div>
        <div className={ classNames({ [style.sliderContainer]: true, [style.hidden]: datasetCount < 2 }) } >
          <DatasetSlider points={uuids} startUuid={startUuid} endUuid={endUuid} 
            setStartUuid={this.setStartUuid} setEndUuid={this.setEndUuid} />
        </div>
        <Modal isOpen={ error !== null } onRequestClose={this.onErrorClose} contentLabel="An Error has occurred">
            <div className={ style.modal }>
              <div className={ style.modalMain }>
                <span className={ style.justifySpan }>
                   <div className={ style.icon } title="Error">
                        <FontAwesomeIcon icon={faDizzy} size="7x" color="#cc0000"/>
                    </div>
                    <div>
                      { error ? error.message : ""}
                    </div>
                </span>
                <div>
                  <span className={ style.centerSpan }>
                    <div className="button circular" title="Ok" onClick={this.onErrorClose}>
                        <FontAwesomeIcon icon={faCheck} />
                    </div>
                  </span>
                </div>
              </div>
            </div>
        </Modal>
        <Modal isOpen={ showOptions } onRequestClose={this.cancelOptions} contentLabel="An Error has occurred">
          <div className={ style.modal }>
            <div className={ style.modalMain }>
              {options.action === IMPORT &&
                <div className={style.uploadContainer}>
                  <span className={style.label}>Upload</span>
                  <DatasetUpload
                    ownerUuid={uuidv4()}
                    className={style.fileUpload}
                    selected={this.state.selectedFile ? this.state.selectedFile.name : null}
                    onChange={this.onUpload}
                  />
                </div>
                }
                {options.action === EXPORT &&
                <div className={style.uploadContainer}>
                  <span className={style.label}>Export As</span>
                  <input
                    type="text"
                    id="export-as"
                    value={this.state.exportName}
                    onChange={(evt) => this.exportNameChange(evt.target.value)}
                  />
                </div>
                }
              <div className={style.container}>
                <div className={`${style.checkboxContainer} input-group`}>
                  <div className={ style.switch }>
                    <input
                      type="checkbox"
                      id="data-check"
                      checked={options.data}
                      onChange={(evt) => this.setOptions(DATA, evt.target.checked)}
                    />
                    <label htmlFor="data-check" className={ style.switchLabel }>
                    </label>
                  </div>
                  <label >Data</label>
                </div>
                <div className={`${style.checkboxContainer} input-group`}>
                  <div className={ style.switch }>
                    <input
                      type="checkbox"
                      id="controls-check"
                      checked={options.controls}
                      onChange={(evt) => this.setOptions(CONTROLS, evt.target.checked)}
                    />
                    <label htmlFor="controls-check" className={ style.switchLabel }>
                    </label>
                  </div>
                  <label >Controls</label>
                </div>
                <div className={`${style.checkboxContainer} input-group`}>
                  <div className={ style.switch }>
                    <input
                      type="checkbox"
                      id="notes-check"
                      checked={options.notes}
                      onChange={(evt) => this.setOptions(NOTES, evt.target.checked)}
                    />
                    <label htmlFor="notes-check" className={ style.switchLabel }>
                    </label>
                  </div>
                  <label>Notes</label>
                </div>
              </div>
              <div>
                <span className={ style.centerSpan }>
                  {options.action === IMPORT &&
                    <div className="button circular" title="Ok" 
                         disabled={options.action === IMPORT && !this.state.selectedFile} 
                         onClick={this.processOptions}>
                        <FontAwesomeIcon icon={faCheck} />
                    </div>
                  }
                  {options.action === EXPORT &&
                    <a className="button circular" href={ this.getDownloadUrl() } download={ this.state.exportName }
                      title="Download" disabled={!hasDataset} onClick={this.cancelOptions} >
                      <FontAwesomeIcon icon={faCheck} />
                    </a>
                  }
                  <div className="button circular" title="Cancel" onClick={this.cancelOptions}>
                      <FontAwesomeIcon icon={faTimes} />
                  </div>
                </span>
              </div>
            </div>
          </div>
        </Modal>
        <div className={style.activityIndicatorContainer}>
          <RingLoader
            sizeUnit={"px"}
            size={150}
            color={'#0277BD'}
            loading={this.props.shouldShowBusy}
          />
        </div>
  
          <div >
            <TooltipControls />
          </div>
  
      </div>
    );
  }
}

const mapStateToProps = state => {
  const datasets = selectDatasets(state);
  const uuids = Object.keys(datasets).map(key => ({ 'owner': key, 'name': datasets[key].name, 'shortName': datasets[key].shortName })) 
                || [{ 'owner': uuidv4(), 'name': "Series 0", 'shortName': "s0" }];
  const datasetCount = uuids.length;
  const controls = selectControls(state);

  return {
    datasetCount: datasetCount,
    darkTheme: controls.darkTheme,
    error: getError(state),
    lastUpdated: getLastUpdated(state, uuids[0]),
    uuids: uuids,
    startUuid: controls.start,
    endUuid: controls.end,
    fullDatasets: datasets,
    controls: controls,
    notes: getAllNotes(state),
    keyFields: getKeyFields(state),
    ignoredFields: getIgnoredFields(state),
    shouldShowBusy: controls.showBusy,
  }
}

const mapDispatchToProps = {
  clearError,
  setHierarchyConfig, 
  showNodes, 
  colorBy, 
  removeDataset,
  removeSearchIndex,
  setStartDataset,
  setEndDataset,
  uploadDataset,
  showBusy,
};

export default connect(mapStateToProps, mapDispatchToProps)(App);
