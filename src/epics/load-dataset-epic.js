import { createAction } from "redux-actions";
import { ofType } from 'redux-observable';
import { of } from "rxjs";
import { mergeMap, concatMap, catchError } from 'rxjs/operators';
import { isNil, is } from "ramda";
import { resolveRefs } from 'json-refs';

import { buildIndices } from './index-dataset-epic';

import { setError } from "domain/error"
import { setDatasets, setKeyFields, setIgnoredFields, configureDataset } from "domain/dataset";
import { setControls, showBusy } from "domain/controls";
import { setNotes } from "domain/notes";

const loadDataset = createAction("LOAD_DATASET");

const loadDatasetEpic = (action$, store) => {
  return action$.pipe(
    ofType(loadDataset.toString())
    ,mergeMap(({ payload }) => {
      return of(payload).pipe(
        concatMap(formatPayload)
        ,mergeMap((payload) => {
          return of(
            setDatasets(payload)
            ,setKeyFields(payload.keyFields)
            ,setIgnoredFields(payload.ignoredFields)
            ,setControls(payload.controls)
            ,setNotes(payload.notes)
            ,buildIndices(payload)
            ,showBusy(false)
          )
        })
        ,catchError((error) => {
          if (is(ValidationError, error)) {
            return of(setError(error));
          } else {
            /* istanbul ignore next */
            throw error;
          }
        })
      );
    })
  );
}; 

// doesn't really care if it's not CSV; if it *is* CSV, convert to JSON.
// Otherwise, just pass it along.
const CSVconvert = (data) => {
  const owner = data.owner;
  const source = data.source;

  var lines = data.file.trim().split(/[\r\n]+/g);
  if (lines.length < 2) { // bail if there's not even linebreaks
    return data;
  }

  function finddelim(hdr) {
    var delims = [',','|','\t',';']
    var delim = 0
    var max = -1
    for (var i=0; i < hdr.length; i++) {
      if (max < hdr.split(delims[i]).length-1) {
        max = hdr.split(delims[i]).length-1
        delim = i
      }
    }
    return delims[delim];
  }

  var delimiter = finddelim(lines[0])
  var jsonstring = '['
  var colnames = lines[0].split(delimiter)
  for (var i=1; i < lines.length; i++) {
    var entry = lines[i].split(delimiter)
    if (entry.length !== colnames.length) { // malformed CSV, or not even CSV.
      return data;
    }
    jsonstring += "{ "
    for (var j=0; j < colnames.length; j++) {
      jsonstring += '"'+colnames[j]+'": "'+entry[j]+'"';
      if (j < colnames.length-1 ) {
        jsonstring += ", "
      } else {
        jsonstring += " }"
        if (i < lines.length-1) {
          jsonstring += ",\n"
        }
      }
    }
  }
  jsonstring += ']'
  return { 'owner': owner, 'source': source, 'file': jsonstring };
}

//if we have a naked array or an object not containing a dataset instead of an object containing a dataset
//transfer the array into an object's dataset to maintain a consistent
//schema with what is used elsewhere see https://github.com/IQTLabs/CRviz/issues/33
const formatPayload = async (data) => {
  const owner = data.owner;
  const initialName = data.name;
  const initialShortName = data.shortName;
  const source = data.source;
  const result = await resolveRefs(data.content);
  const content = result.resolved;
  const datasets = content.datasets;
  const keyFields = content.keyFields || null;
  const ignoredFields = content.ignoredFields || null;
  const controls = content.controls || {};
  const notes = content.notes || {};
  const includeData = ('includeData' in data) ? data.includeData : true;
  const includeControls = ('includeControls' in data) ? data.includeControls : false;
  const includeNotes = ('includeNotes' in data) ? data.includeNotes : false;

  var final = {};

  if(datasets){
    final =  datasets;
  } else if(!isNil(content.dataset) && is(Array, content.dataset)){
    final[owner] = { 'dataset': content.dataset };
    if(content.configuration){
      final[owner].configuration = content.configuration;
    }
  } else if(isNil(content.dataset) && is(Array, content)) {
    final[owner] = { 'dataset': content };
  } else if(isNil(content.dataset)) {
    let obj = {};
    Object.entries(content).forEach( (entry) =>{
      let key = entry[0];
      let value = entry[1]
      obj[key] = value;
      })
    final[owner] = { 'dataset': [obj] };
  } else {
    throw ValidationError('Data in invalid format');
  }
  const keys = Object.keys(final);
  keys.forEach((owner, idx) =>{
    const dataset = final[owner].dataset;
    const name = dataset.name || initialName || "Series " + idx;
    const shortName = dataset.shortName || initialShortName || name.substr(0, 1) + idx;
    const initialConfig = final[owner].configuration;
    final[owner] =  configureDataset(dataset, source, name, shortName, initialConfig, keyFields, ignoredFields);
  })

  data = { 
          'datasets': includeData ? final : {},
          'keyFields': includeData ? keyFields : [],
          'ignoredFields': includeData ? ignoredFields : [],
          'controls': includeControls ? controls : {},
          'notes': includeNotes ? notes : {}
        };
  return data;
};

function ValidationError(message) {
  this.name = 'ValidationError';
  this.message = message;
}

ValidationError.prototype = Object.create(Error.prototype);

export default loadDatasetEpic;

export { loadDataset, CSVconvert };
