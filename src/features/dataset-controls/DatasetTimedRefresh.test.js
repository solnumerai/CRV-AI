import React from 'react';
import { shallow, mount } from 'enzyme';

import { expect } from "chai"
import sinon from 'sinon'

import DatasetTimedRefresh from "./DatasetTimedRefresh";
import style from "./DatasetControls.module.css";

describe('DatasetTimedRefresh', () => {
	it('renders the control with the timer stopped', (done) => {
		const spy = sinon.spy();
		const refresh = mount(<DatasetTimedRefresh
                className={style.urlRefresh}
                interval={10}
                timerIsRunning={false}
                onIntervalChange={spy}
                onStartClick={spy}
                onStopClick={spy}
              />);
		expect(refresh.find('input')).to.have.length(1);
		expect(refresh.find('div.button')).to.have.length(1);
		expect(refresh.find('svg').first().prop('role')).to.equal('img');
		expect(refresh.find('svg').first().prop('data-icon')).to.equal('sync-alt');

		done();
	});

	it('renders the control with the timer running', (done) => {
		const spy = sinon.spy();
		const refresh = mount(<DatasetTimedRefresh
                className={style.urlRefresh}
                interval={10}
                timerIsRunning={true}
                onIntervalChange={spy}
                onStartClick={spy}
                onStopClick={spy}
              />);
		expect(refresh.find('input')).to.have.length(1);
		expect(refresh.find('div.button')).to.have.length(1);
		expect(refresh.find('svg').first().prop('role')).to.equal('img');
		expect(refresh.find('svg').first().prop('data-icon')).to.equal('stop-circle');

		done();
	});

	it('enters an interval value', (done) => {
		const expectedArg = 10;
		const changeSpy = sinon.spy();
		const startSpy = sinon.spy();
		const stopSpy = sinon.spy();
		const refresh = shallow(<DatasetTimedRefresh
                className={style.urlRefresh}
                interval={0}
                timerIsRunning={false}
                onIntervalChange={changeSpy}
                onStartClick={startSpy}
                onStopClick={stopSpy}
              />);
		refresh.find('input').simulate("change", {'target': {'value': 10}});
		expect(changeSpy.calledWith(expectedArg)).to.equal(true);

		done();
	});

	it('clicks the start button', (done) => {
		const changeSpy = sinon.spy();
		const startSpy = sinon.spy();
		const stopSpy = sinon.spy();
		const refresh = shallow(<DatasetTimedRefresh
                className={style.urlRefresh}
                interval={10}
                timerIsRunning={false}
                onIntervalChange={changeSpy}
                onStartClick={startSpy}
                onStopClick={stopSpy}
              />);
		refresh.find('div.button').simulate("click");
		expect(startSpy.calledOnce).to.equal(true);

		done();
	});

	it('clicks the stop button', (done) => {
		const changeSpy = sinon.spy();
		const startSpy = sinon.spy();
		const stopSpy = sinon.spy();
		const refresh = shallow(<DatasetTimedRefresh
                className={style.urlRefresh}
                interval={10}
                timerIsRunning={true}
                onIntervalChange={changeSpy}
                onStartClick={startSpy}
                onStopClick={stopSpy}
              />);
		refresh.find('div.button').simulate("click");
		expect(stopSpy.calledOnce).to.equal(true);

		done();
	});

});