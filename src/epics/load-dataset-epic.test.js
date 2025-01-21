import { expect } from 'chai';
import configureMockStore from 'redux-mock-store';
import { createEpicMiddleware } from 'redux-observable';
import { v4 as uuidv4 } from 'uuid';

import rootEpic from './root-epic'
import { applyHashes, configurationFor } from 'domain/dataset'
import { loadDataset, CSVconvert } from "./load-dataset-epic"
import { fromJson } from "./upload-dataset-epic"

describe("loadDatasetEpic", () => {
	let store;
	const initialState ={
			'controls': {
				'hierarchyConfig':{'path': ['test'], 'displayName': 'test', 'groupable': true},
				'colorBy':{'path': ['test'], 'displayName': 'test', 'groupable': true}
			}
		};

	beforeEach(() => {
		const epicMiddleware = createEpicMiddleware();
		const mockStore = configureMockStore([epicMiddleware]);
		store  = mockStore(initialState);
		epicMiddleware.run(rootEpic);
	});

	describe("loading various datasets", () => {
		it("loads the dataset with default config", (done) => {
			const owner = uuidv4();
			const data = [
			  { uid: "uid1", role: { role: "role", confidence: 80 } },
			  { uid: "uid2", role: { role: "role", confidence: 80 } }
			];

			const action$ = loadDataset({ 'owner': owner, 'content': data });
			store.dispatch(action$);
			let typeToCheck = loadDataset.toString();
			expect(store.getActions().filter(a => a.type === typeToCheck)[0].payload.content).to.equal(data);

			done();
		});

		it("loads the dataset and config", (done) => {
			const owner = uuidv4();
			const dataset = [
	          { uid: "uid1", role: { role: "role", confidence: 80 } },
	          { uid: "uid2", role: { role: "role", confidence: 80 } }
	        ];
	        const configuration = {
	          fields: [
	            { path: ["uid"], displayName: "UID", groupable: true },
	            { path: ["role", "role"], displayName: "Role", groupable: false },
	            { path: ["role", "confidence"], displayName: "Role.confidence", groupable: false }
	          ]
	        };

			const action$ = loadDataset({ 'owner': owner, 'content': { 'dataset': dataset, 'configuration': configuration} });
			store.dispatch(action$);
			let typeToCheck = loadDataset.toString();
			expect(store.getActions().filter(a => a.type === typeToCheck)[0].payload.content.dataset).to.equal(dataset);
			expect(store.getActions().filter(a => a.type === typeToCheck)[0].payload.content.configuration.fields).to.deep.equal(configuration.fields);

			done();
		});

		it("loads a simple object", (done) => {
			const owner = uuidv4();
			const data = { uid: "uid1", role: { role: "role", confidence: 80 } };

			const action$ = loadDataset({ 'owner': owner, 'content': data });
			store.dispatch(action$);
			let typeToCheck = loadDataset.toString();

			expect(store.getActions().filter(a => a.type === typeToCheck)[0].payload.content).to.deep.equal(data);

			done();
		});
	});

	it("preserves control state across load", (done) => {
		const owner = uuidv4();
		const data = [
		  { uid: "uid1", role: { role: "role", confidence: 80 } },
		  { uid: "uid2", role: { role: "role", confidence: 80 } }
		];
		const config = configurationFor(data, [], []);
		applyHashes(data, config);
		const action$ = loadDataset({ 'owner': owner, 'content': data });
		store.dispatch(action$);
		expect(store.getState()).to.deep.equal(initialState);

		done();
	});

	describe("CSV Conversion", () => {
		it("converts CSV to json", (done) => {
			const owner = uuidv4();
			const expectedData = [
			  { uid: "uid1", role: "role", confidence: "80" },
			  { uid: "uid2", role: "role", confidence: "80" }
			];
			const csv = "uid,role,confidence\n" +
						"uid1,role,80\nuid2,role,80"
			const converted = CSVconvert({ 'owner': owner, 'file': csv });
			expect(fromJson(converted).content).to.deep.equal(expectedData);

			done();
		});
	});

});