import { createAction, handleActions } from "redux-actions";

const defaultState = {
  byId:[],
  byHash: {
  },
  hoverStatus:false,
  hoveredNoteId:''
};

// ACTIONS
const addNote = createAction("ADD_NOTE");
const setNotes = createAction("SET_NOTE");
const removeNote = createAction("REMOVE_NOTE");
const toggleNotesHover = createAction("TOGGLE_NOTES_HOVER");
const setNoteHovered = createAction("SET_HOVERED_NOTED");

// REDUCERS
const reducer = handleActions(
  {
    [addNote]: (state, { payload }) => {
      return {
        byId: [ ...state.byId, payload.id],
        byHash: {
          ...state.byHash,
          [payload.id]: payload
        }
      }
    },
    [removeNote]: (state, { payload }) => {
      const prunedIds = state.byId.filter(item => {
        return item !== payload.id 
      })
      delete state.byHash[payload.id] 
      
      return {
        byId: prunedIds,
        byHash: state.byHash
      }
    },

    [setNotes]: (state, { payload }) => {
      const byid = payload.byId || state.byId;
      const byhash = payload.byHash || state.byHash;
      return {
        ...state,
        byId: byid,
        byHash: byhash,
      }
    },
    [toggleNotesHover]: (state, { payload }) => {
      const hoverStatus = payload;
      return {
        ...state,
        hoverStatus: hoverStatus,
      }
    },
    [setNoteHovered]: (state, { payload }) => {
      const hoveredNoteId = payload;
      //alert(`${hoveredNoteId}`);
      return {
        ...state,
        hoveredNoteId: hoveredNoteId,
      }
    },
  },
  defaultState
);

// SELECTORS
const getNotesIndexedByHash = (state) => state.notes.byHash;
const getAllNotes = (state) => state.notes;
const getNotesHoverStatus = (state) => state.notes.hoverStatus;
const getNoteHoveredId = (state) => state.notes.hoveredNoteId;


export default reducer;

export { addNote,setNotes,removeNote, getNotesIndexedByHash, getAllNotes, toggleNotesHover, getNotesHoverStatus, setNoteHovered, getNoteHoveredId};