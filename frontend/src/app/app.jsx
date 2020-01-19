import React, {Component} from "react"
import {hot} from "react-hot-loader"
import './app.scss'
import {Route, Switch} from 'react-router-dom'
import {connect} from 'react-redux'
import PropTypes from "prop-types"
import ScreenPage from "../page/screen-page"
import NewScreenPage from "../page/new-screen-page";
class App extends Component {
    constructor (props) {
        super(props)
    }

  /*
  HACK : On passe l'attribut location au switch pour forcer son évaluation lorsque la route change.
  */
  render() {
      return (
        <div className="app-component">
            <div>
                <Route exact path="/old" component={ScreenPage} />
                <Route exact path="/" component={NewScreenPage} />
            </div>
        </div>
      )
  }
}

function mapStateToProps(state) {
    return {
    }
}

App.propTypes = {
}

export default connect(mapStateToProps,null)(hot(module)(App))
