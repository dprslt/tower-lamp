
class StateLoader {

    loadState() {
        try {
            let serializedState = localStorage.getItem("app:state")

            if (serializedState === null) {
                return this.initializeState()
            }

            return JSON.parse(serializedState)
        }
        catch (err) {
            return this.initializeState()
        }
    }

    saveState(state) {
        try {
            let importantState = {
                login: state.login,
                filter: state.filter,
                home: state.home,
                routing: state.routing,
                sites: state.sites,
                enterprise: state.enterprise
            }
            let serializedState = JSON.stringify(importantState)
            localStorage.setItem("app:state", serializedState)
        }
        catch (err) {
            console.error('Error while saving into localstorage')
        }
    }

    initializeState() {
        return { } //Empty initial state
    }
}

export default StateLoader