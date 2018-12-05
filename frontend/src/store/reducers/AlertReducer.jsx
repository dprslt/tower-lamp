import {ADD_ALERT, DELETE_ALERT} from '../actions/AlertActions.jsx'


const initialState = {
    alerts: []
}

export default function myReducer(state = initialState, action) {
    switch (action.type) {
        case ADD_ALERT:
            var newAlert = {
                id:state.alerts.length,
                typeAlert:action.typeAlert,
                text:action.text
            }
            return {...state, alerts: state.alerts.concat(newAlert)}

        case DELETE_ALERT:
            return {...state, alerts: state.alerts.filter((tmp) => (tmp.id !== action.id))}

        default:
            return state
    }
}

