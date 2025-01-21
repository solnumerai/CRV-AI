import React from 'react';
import { mount } from 'enzyme';

import { expect } from "chai"
import sinon from 'sinon'

import DatasetSelector from "./DatasetSelector";
import style from "./DatasetControls.module.css";

const datasets =[
	{"name": "ds1", "url":"test1.url"},
	{"name": "ds2", "url":"test2.url"},
	{"name": "ds3", "url":"test3.url"}
]
const empty = {name: "None", url:" "};
const change = (target) => {

}
const event = {"target": {value:"test3.url"}};
describe('DatasetSelector', () => {
	it('renders the control', (done) => {
		const selector = mount(<DatasetSelector
            className={style.selector}
            selected={empty}
            onChange={change}
            datasets={datasets}
          />);
		//4 items because of the implicit "None we add"
		expect(selector.find('option')).to.have.length(4);

		done();
	});

	it('changes the selection', (done) => {
		const fakeOnChange = (evt) =>{
			
		}
		const onChangeSpy = sinon.spy(fakeOnChange);
		const selector = mount(<DatasetSelector
            className={style.selector}
            selected={empty}
            onChange={onChangeSpy}
            datasets={datasets}
          />);
		selector.find('select').first().simulate('change', event);
		expect(onChangeSpy.calledWith(datasets[2])).to.equal(true);

		done();
	});

});