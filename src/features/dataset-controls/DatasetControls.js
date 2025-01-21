import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { isNil } from "ramda";
import Modal from 'react-modal';
import { v4 as uuidv4 } from 'uuid';

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faCheck, faTimes, faCog, faMinusCircle 
} from "@fortawesome/free-solid-svg-icons";

import { fetchDataset, buildAuthHeader } from "epics/fetch-dataset-epic";
import { startRefresh, stopRefresh } from "epics/refresh-dataset-epic";
import { uploadDataset } from "epics/upload-dataset-epic";
import { removeSearchIndex } from "epics/index-dataset-epic";
import {
  showNodes, setHierarchyConfig, colorBy, selectControls, setStartDataset,
  setEndDataset, showBusy
} from "domain/controls";

import { getAllNotes } from 'domain/notes';

import { setError } from "domain/error"
import { 
  setDataset, selectDataset, selectDatasets, removeDataset, 
  getIsFetching, setIsFetching, getLastUpdated, getKeyFields,
  getIgnoredFields
} from "domain/dataset";

import DatasetSelector from "./DatasetSelector";
import DatasetUpload from "./DatasetUpload";
import DatasetDownload from "./DatasetDownload";
import DatasetRefresh from "./DatasetRefresh";
import DatasetTimedRefresh from "./DatasetTimedRefresh";
import { getDataToExport } from "./export"

import style from "./DatasetControls.module.css";

const CUSTOM_DATASET = {
  name: "Custom URL",
  url: "custom-url"
};

const UPLOAD_DATASET = {
  name: "Upload Dataset",
  url: "upload-dataset"
};

const authTypes = [
  {'name': '-None-', 'scheme':'None' },
  {'name': 'Username\\Password', 'scheme':'Basic' },
  {'name': 'Token', 'scheme':'Bearer' },
];

Modal.setAppElement('#root');

class DatasetControls extends React.Component {

  constructor(props) {
    super(props);

    const initialDS = props.initialDataSource;
    const idsUrl = !!initialDS ? new URL(initialDS.url) : null;
    const requiresAuth = !!idsUrl && idsUrl.protocol === "https:"
    const authScheme = requiresAuth ? 'Basic' : '';

    this.state = {
      dataset: null,
      selected: initialDS,
      selectedFile: null,
      showUrlEntry: requiresAuth,
      showUpload: false,
      url: idsUrl ? idsUrl.href : '',
      authScheme:authScheme,
      token: '',
      username: '',
      password: '',
      refreshInterval: 0,
      refreshTimerRunning: false
    };

    this.datasets = [...this.props.datasets, CUSTOM_DATASET, UPLOAD_DATASET]
    if(initialDS){
      this.datasets.push(initialDS)
    }

    if(initialDS && !requiresAuth){
      this.fetchAndSetDataset(initialDS.url, initialDS, null, null, null);
    }
  }

  resetDataset = () => {
    this.props.setDataset({ dataset: [], owner: this.props.uuid, source: null, name:"", shortName:"",  configuration: {} });
    this.setState({
      selected: null,
      selectedFile: null
    });
  }

  fetchAndSetDataset = (url, dataset, username, password, token) => {
    this.props.showBusy(true);
    this.props.setIsFetching({owner: this.props.uuid, isFetching: true});
    const authHeader = buildAuthHeader(username, password, token);
    if (toURL(url)) {
      this.props.fetchDataset({ 
        'owner': this.props.uuid,
        'name':this.props.name,
        'shortName': this.props.shortName,
        'url': url,
        'header': authHeader
      });
      // this.setState({
      //   selected: dataset,
      //   selectedFile: null,
      // });
    } else {
      this.props.setError(new Error("Please enter a valid URL."));
    }
  }

  onSelected = (dataset) => {
    if (isNil(dataset)) {
      return this.resetDataset();
    }

    this.props.removeDataset({owner: this.props.uuid});
    this.props.removeSearchIndex({owner: this.props.uuid});
    this.props.stopRefresh();

    const showUrlEntry = dataset === CUSTOM_DATASET;
    const showUpload = dataset === UPLOAD_DATASET;
    this.setState({ 
      showUrlEntry: showUrlEntry,
      showUpload: showUpload,
      url: '',
      authScheme:null,
      token: '',
      username: '',
      password: '',
      selected: dataset,
      selectedFile: null,
      refreshInterval: 0,
      refreshTimerRunning: false,
     });
    if(!showUrlEntry && !showUpload)
    {
      const url = dataset.url;
      this.fetchAndSetDataset(url, dataset, null, null, null);
      this.setStartOrEnd(this.props.uuid);
    }

  }

  onUpload = (file) => {
    this.setState({
      selectedFile: file,
      refreshInterval: 0,
      refreshTimerRunning: false,
    });
  }

  onUrlChange = (evt) => {
    this.setState({ url: evt.target.value });
  }

  onTokenChange = (evt) => {
    this.setState({ token: evt.target.value });
  }

  onUsernameChange = (evt) => {
    this.setState({ username: evt.target.value });
  }

  onPasswordChange = (evt) => {
    this.setState({ password: evt.target.value });
  }

  onUrlOk = () => {
    this.setState({ showUrlEntry: false });
    const dataset = this.state.selected;
    if(!isNil(this.state.url))
    {
      const url = this.state.url;
      dataset.url = url;
      this.fetchAndSetDataset(url, dataset, this.state.username, this.state.password, this.state.token);
      this.setStartOrEnd(this.props.uuid);
    }
  }

  onUrlCancel = () => {
    this.setState({ 
      showUrlEntry: false,
      url: '',
      authScheme:'',
      token: '',
      username: '',
      password: '',
    });
  }

  onUploadOk = () =>{
    if(this.state.selectedFile){
      this.props.showBusy(true);
      this.props.uploadDataset({ 
        'owner': this.props.uuid,
        'name':this.props.name,
        'shortName': this.props.shortName,
        'file': this.state.selectedFile,
        'includeData': true,
        'includeControls': false,
      });
      this.props.stopRefresh();
      this.setState({ 
        showUpload: false,
      });

      this.setStartOrEnd(this.props.uuid);
    }
  }

  setStartOrEnd = (uuid) =>{
    if(!this.props.controls.start){
        this.props.setStartDataset(uuid);
      }
      else if(!this.props.controls.end){
        this.props.setEndDataset(uuid);
      }
  }

  onUploadCancel = () => {
    this.setState({ 
      selectedFile: null,
      showUpload: false,
    });
  }

  getDownloadUrl = () => {
    const datasets = this.props.fullDatasets;
    const controls = this.props.controls;
    const keyFields = this.props.keyFields;
    const ignoredFields = this.props.ignoredFields;
    const notes = this.props.notes;
    const urlObject = window.URL || window.webkitURL || window;
    const json = JSON.stringify(getDataToExport(datasets, keyFields, ignoredFields, controls, notes), null, 2);
    const blob = new Blob([json], {'type': "application/json"});
    const url = urlObject.createObjectURL(blob);;
    return url;
  }

  onRefresh = () =>{
    const url = this.state.selected.url;
    const dataset = this.state.selected;
    this.fetchAndSetDataset(url, dataset, this.state.username, this.state.password, this.state.token);
  }

  onTimedRefreshStart = () =>{
    this.props.setIsFetching({'owner': this.props.uuid, 'isFetching': true});
    this.setState({
      'refreshTimerRunning': true
    });
    const authHeader = buildAuthHeader(this.state.username, this.state.password, this.state.token);
    const url = this.state.selected.url;
    const interval = this.state.refreshInterval;
    this.props.startRefresh({'owner': this.props.uuid,'url': url, 'header': authHeader, 'interval': interval});
  }

  onTimedRefreshStop = () =>{
    this.setState({
      'refreshTimerRunning': false
    });
    this.props.stopRefresh();
  }

  removeDatasetEntry = () =>{
    this.props.removeDatasetEntry(this.props.uuid);
  }

  onTimedRefreshIntervalChanged = (interval) =>{
    const numInt = parseInt(interval, 10);
    if(!isNaN(numInt)){
      this.setState({
        refreshInterval: numInt,
      });
    }
    else if(!interval){
      this.setState({
        refreshInterval: null,
      });
    }
  }

  render() {
    const canDownload = this.state.selected && !this.state.selectedFile;
    const canRefresh = this.state.selected && !isNil(this.state.selected.url) && !this.state.selectedFile;
    let url = null;
    try{
      url = new URL(this.props.source);
    }
    catch(err){
      if(err instanceof TypeError){
        url = null;
      }
      else {
        throw err;
      }
    }
    return (
      <div className={style.dataControls}>
        <div key={ this.props.uuid + "_label" } className={style.dataControlHeader}>
          {this.props.name}
          {this.props.removable && <FontAwesomeIcon icon={faMinusCircle} 
          onClick={ this.removeDatasetEntry } 
          />}
        </div>
        <div className={style.selectorContainer}>
          <span className={style.label}>Dataset</span>
          <DatasetSelector
            className={style.selector}
            selected={this.state.selected}
            onChange={this.onSelected}
            datasets={this.datasets}
            source={this.props.source}
          />
        </div>
          <div className={style.datasetSourceContainer}>
            { this.props.source &&
              <span>
               Source:&nbsp; 
               { url && 
                <a href={url}>
                  {this.props.source}
                </a>
               }
               { !url &&
                this.props.source
               }
              </span>
            }
          </div>
          <div className={style.utilityContainer}>
          { canDownload &&
            <DatasetDownload
              className={style.fileDownload}
              selected={this.state.selected.name}
              url={this.getDownloadUrl()}
              disabled={this.props.isFetching}
            />
          }
          { canRefresh &&
            <div className={style.urlRefreshContainer}>
              <DatasetRefresh
                className={style.urlRefresh}
                onClick={this.onRefresh}
                disabled={this.props.isFetching}
              />
              <DatasetTimedRefresh
                className={style.urlRefresh}
                interval={this.state.refreshInterval}
                timerIsRunning={this.state.refreshTimerRunning}
                disabled={this.props.isFetching}
                onIntervalChange={this.onTimedRefreshIntervalChanged}
                onStartClick={this.onTimedRefreshStart}
                onStopClick={this.onTimedRefreshStop}
              />
            </div>
          }
          </div>
          <div className={style.urlRefreshTime}>
            { canRefresh && this.props.isFetching &&
              <span>
                <FontAwesomeIcon className="fa-spin" icon={faCog} /> Fetching Data...
              </span>
            }
            { canRefresh && !this.props.isFetching &&
              <span>
                Last Updated: { this.props.lastUpdated ? (this.props.lastUpdated.toLocaleDateString() || "") + " " + (this.props.lastUpdated.toLocaleTimeString() || "") : "Never" }
              </span>
            }
          </div>
          <Modal isOpen={ this.state.showUrlEntry } onRequestClose={this.onUrlCancel} contentLabel="Enter a Url">
            <div className={ style.modal }>
              <div className={ style.modalMain }>
                <span>
                  <label> URL </label>
                  <input type="text" value={this.state.url} onChange={ this.onUrlChange }/>
                </span>
                <span>
                  <label> AuthType </label>
                  <label className="select">
                    <select
                      onChange={(evt) => this.setState({ authScheme: evt.target.value })}
                      value={isNil(this.state.authScheme) ? '' : this.state.authScheme}
                    >
                      {authTypes.map((at) => {
                        return (
                          <option key={at.scheme} value={at.scheme}>
                            {at.name}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </span>
                { this.state.authScheme === 'Bearer' &&
                  <span>
                    <label> Token </label>
                    <input type="text" value={this.state.Token} onChange={ this.onTokenChange }/>
                  </span> 
                }
                { this.state.authScheme === 'Basic' &&
                  <div>
                    <span>
                      <label> Username </label>
                      <input type="text" value={this.state.userName} onChange={ this.onUsernameChange }/>
                    </span>
                    <span>
                      <label> Password </label>
                      <input type="password" value={this.state.password} onChange={ this.onPasswordChange }/>
                    </span>
                  </div>
                }
                <div>
                  <span className={ style.centerSpan }>
                    <div className="button circular" title="Ok" onClick={this.onUrlOk}>
                        <FontAwesomeIcon icon={faCheck} />
                    </div>
                    <div className="button circular" title="Cancel" onClick={this.onUrlCancel}>
                        <FontAwesomeIcon icon={faTimes} />
                    </div>
                  </span>
                </div>
              </div>
            </div>
          </Modal>
          <Modal isOpen={ this.state.showUpload } onRequestClose={this.onUploadCancel} contentLabel="Upload a File">
            <div className={ style.modal }>
              <div className={ style.modalMain }>
                  <div className={style.uploadContainer}>
                    <span className={style.label}>Upload</span>
                    <DatasetUpload
                      ownerUuid={this.props.uuid}
                      className={style.fileUpload}
                      selected={this.state.selectedFile ? this.state.selectedFile.name : null}
                      onChange={this.onUpload}
                    />
                  </div>
                  <span className={ style.centerSpan }>
                    <div className="button circular" title="Ok" onClick={this.onUploadOk}>
                        <FontAwesomeIcon icon={faCheck} />
                    </div>
                    <div className="button circular" title="Cancel" onClick={this.onUploadCancel}>
                        <FontAwesomeIcon icon={faTimes} />
                    </div>
                  </span>
              </div>
            </div>
          </Modal>
      </div>
    );
  }
}

const toURL = (url) => {
  try {
    return new URL(url)
  } catch(error) {
    if (error instanceof TypeError) {
      return null;
    } else {
      throw error;
    }
  }
}

DatasetControls.defaultProps = {
  uuid: uuidv4(),
  datasets: [],
  dataset: null,
  hierarchyConfig: [],
  configHasChanged: false,
  isFetching: false,
  lastUpdated: new Date(),
  
};

DatasetControls.propTypes = {
  uuid: PropTypes.string,
  datasets: PropTypes.array,
  dataset: PropTypes.array,
  fetchDataset: PropTypes.func.isRequired,
  uploadDataset: PropTypes.func.isRequired,
  setDataset: PropTypes.func.isRequired,
  setStartDataset: PropTypes.func.isRequired,
  setEndDataset: PropTypes.func.isRequired,
  removeDataset: PropTypes.func.isRequired,
  removeSearchIndex: PropTypes.func.isRequired,
  getIsFetching: PropTypes.func.isRequired,
  setIsFetching: PropTypes.func.isRequired,
  showNodes: PropTypes.func.isRequired,
  setHierarchyConfig: PropTypes.func.isRequired, 
  colorBy: PropTypes.func.isRequired,
  startRefresh: PropTypes.func.isRequired,
  stopRefresh: PropTypes.func.isRequired,
  removeDatasetEntry: PropTypes.func.isRequired,
  isFetching: PropTypes.bool,
  lastUpdated: PropTypes.instanceOf(Date),
  setError: PropTypes.func.isRequired,
  hierarchyConfig: PropTypes.array,
  configHasChanged: PropTypes.bool,
  fullDatasets: PropTypes.object,
  controls: PropTypes.object,
  keyFields: PropTypes.array,
  ignoredFields: PropTypes.array,
  showBusy: PropTypes.func.isRequired,
};

const mapStateToProps = (state, ownProps) => {
  const owner = ownProps.uuid;
  const fullDatasets = selectDatasets(state)
  return {
    dataset: (owner in fullDatasets) ? fullDatasets[owner].dataset : [],
    source: (owner in fullDatasets) ? fullDatasets[owner].source : null,
    isFetching: getIsFetching(state, owner),
    lastUpdated: getLastUpdated(state, owner),
    fullDatasets: fullDatasets,
    controls: selectControls(state),
    keyFields: getKeyFields(state),
    ignoredFields: getIgnoredFields(state),
    notes: getAllNotes(state)
  };
}

const mapDispatchToProps = {
  fetchDataset,
  uploadDataset,
  setDataset,
  setStartDataset,
  setEndDataset,
  selectDataset,
  removeDataset,
  removeSearchIndex,
  getIsFetching,
  setIsFetching,
  showNodes,
  setHierarchyConfig, 
  colorBy,
  startRefresh,
  stopRefresh,
  setError,
  showBusy
};

export default connect(mapStateToProps, mapDispatchToProps)(DatasetControls);
