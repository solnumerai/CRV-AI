import {
  default as filterReducer,
  setFilter,
  getFilter,
  clearFilter,
  filterIsValid
} from "./filter";

import { combineReducers } from "redux";
import { expect } from "chai"

import compileExpression from "filtrex";

const reducer = combineReducers({ filter: filterReducer });

describe("Filter Reducer", () => {
	describe("setFilter", () => {
	  it("sets a Filter", (done) => {
	    const filterString = "property > 1";

	    const action = setFilter(filterString);
	    const result = reducer({}, action);

	    const expectedIsValid = true;

	    expect(filterIsValid(result)).to.equal(expectedIsValid);
	    expect(getFilter(result)).to.not.equal(null);

	    done();
	  });

	  it("sets an invalid filter string", (done) => {
	    const filterString = "property >";

	    const action = setFilter(filterString);
	    const result = reducer({}, action);

	    const expectedIsValid = false;

	    expect(filterIsValid(result)).to.equal(expectedIsValid);
	    expect(getFilter(result)).to.equal(null);

	    done();
	  });

	  it("clears the Filter", (done) => {
	    const filterString = "property > 1";
	    const filter = compileExpression(filterString);
	    const isValid = true

		const initialState = {
			filterString: filterString,
			filter: filter,
			isValid: isValid
		} 

	    const action = clearFilter();
	    const result = reducer({filter: initialState }, action);

	    expect(getFilter(result)).to.equal(null);
	    expect(filterIsValid(result)).to.equal(false);

	    done();
	  });
	});
});