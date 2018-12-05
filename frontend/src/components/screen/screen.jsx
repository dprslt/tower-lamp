//REACT
import React, {Component} from "react"
import PropTypes from 'prop-types'
// REDUX
// APP

import Pixel from "../pixel/pixel"

import './screen.scss'

class Screen extends Component {
    constructor (props) {
        super(props)
    }

    static propTypes = {
        data: PropTypes.array,
        x: PropTypes.number,
        y: PropTypes.number,
        pixelSize: PropTypes.number,
        pixelGap: PropTypes.number
    };


    renderCells() {
      return this.props.data.map(e => <Pixel className="pixel" key={e.index} r={e.color[0]} g={e.color[1]} b={e.color[2]}/>)
    }

    render() {
        return (
          <div className="screen" style={{
              gridTemplateColumns: "repeat("+this.props.x+", "+this.props.pixelSize+"px)",
              gridTemplateRows: "repeat("+this.props.y+", "+this.props.pixelSize+"px)",
              gridGap: this.props.pixelGap
          }}>
            {this.renderCells()}
          </div>
        )
    }
}


export default Screen
