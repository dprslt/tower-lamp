import {combineReducers} from 'redux'
import AlertReducer from './AlertReducer'
import {routerReducer} from 'react-router-redux'

const rootReducer = combineReducers({
    routing: routerReducer,
    alert: AlertReducer,
});

export default rootReducer