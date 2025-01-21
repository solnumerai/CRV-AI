import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch,  faTimesCircle} from "@fortawesome/free-solid-svg-icons";

import { selectDatasets, selectMergedConfiguration } from "domain/dataset";

import { getSearchIndices, getSearchResults } from "epics/index-dataset-epic";
import { searchDataset } from "epics/search-dataset-epic";

import style from "./SearchControls.module.css";

const defaultState = {
  queryString: '',
  searchIndices: [],
  hasSearch: false
}

export class Search extends React.Component {

  state = defaultState

  handleSearch(){
    this.setState({
      hasSearch: this.state.queryString !== ''
    });
    var data = {
      datasets: this.props.datasets,
      configuration: this.props.configuration,
      searchIndices: this.props.searchIndices,
      queryString: this.state.queryString,
      results: this.props.results
    }
    
    this.props.searchDataset(data);
  }

  clearSearch(){
    this.setState(defaultState, function() {
      this.handleSearch();
    });
  }

  handleQueryStringChange = (e) =>{
        this.setState({
          queryString: e.target.value
        });
  }

  handleKeyPress = (e) => {
    if(e.key === 'Enter'){
      this.handleSearch();
    }
  }

  render() {
    return (
      <div className={style.searchContainer}>
        <span className={ style.search }>
          <input
            type="search"
            id="search-string"
            placeholder="Search"
            value={this.state.queryString}
            onChange={this.handleQueryStringChange}
            onKeyPress={this.handleKeyPress}
          />

          <label htmlFor="search-string" className="button circular" onClick={() => this.handleSearch()} title="Search">
            <FontAwesomeIcon icon={faSearch} />
          </label>
        </span>
        { this.state.hasSearch &&
          <span>
            <label id="search-results"> {this.props.results.length} Results found </label>
            <label htmlFor="search-results" className="button circular" onClick={() => this.clearSearch()}>
              <FontAwesomeIcon icon={faTimesCircle} />
              </label>
          </span>
        }
      </div>
    );
  }
}

Search.propTypes = {
  datasets: PropTypes.object,
  configuration: PropTypes.object,
  searchIndex: PropTypes.object,
  queryString: PropTypes.string,
  results: PropTypes.array,
  searchDataset: PropTypes.func.isRequired
};

const mapStateToProps = (state, ownProps) => {
  return {
    datasets: selectDatasets(state),
    configuration: selectMergedConfiguration(state),
    searchIndices: getSearchIndices(state),
    queryString: state.search.queryString,
    results: getSearchResults(state)
  };
}

const mapDispatchToProps = {
  searchDataset,
};

export default connect(mapStateToProps, mapDispatchToProps)(Search);
