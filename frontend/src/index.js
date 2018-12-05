import "@babel/polyfill"
// REACT
import React from 'react'
import ReactDOM from 'react-dom'
// APP
import App from './app/app.jsx'
import './app/app.scss'
//REDUX
import { Provider } from 'react-redux'
import {createStore, applyMiddleware, compose} from 'redux'
import rootReducer from './store/reducers/RootReducer.jsx'
import { connectRouter, routerMiddleware, ConnectedRouter} from 'connected-react-router'
import thunk from 'redux-thunk'
import StatePersister from './StatePersister'

import history from './history'

const middleware = [thunk, routerMiddleware(history)]
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

const statePersister = new StatePersister()

const store = createStore(
    connectRouter(history)(rootReducer), statePersister.loadState(),
    composeEnhancers(applyMiddleware(...middleware))
)

store.subscribe(() => {
    statePersister.saveState(store.getState())
})

ReactDOM.render(
    <Provider store={store}>
        <ConnectedRouter history={history}>
            <App />
        </ConnectedRouter>
    </Provider>, 
    document.getElementById('root')
)


