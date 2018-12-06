//REACT
import React, {Component} from "react"
import PropTypes from 'prop-types'
// REDUX
import {connect} from 'react-redux'

// APP
import Screen from '../components/screen/screen'
import './screen-page.scss'

import io from 'socket.io-client'

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max))
}

/**
 * Excluding the 4th first cases of the array
 * @param rawArray
 * @param xMax
 * @param yMax
 * @returns {any[]}
 */
function convertRawFadeCandyDataToScreen(rawArray, xMax, yMax){
    var a = Array(xMax * yMax)
    for (let i = 1; i <= xMax * yMax ; i++) {
        a[i-1] = {
            index: i - 1,
            color: [rawArray[i * 3 + 1], rawArray[i * 3 + 1 + 1], rawArray[i * 3 + 2 + 1 ]]
        }
    }

    return a.reverse()
}

class ScreenPage extends Component {
    constructor (props, context) {
        super(props, context)
        this.state = {
          cells : this.generateBlack(168)
        }
        this.randomize = this.randomize.bind(this)
        this.startRandomize = this.startRandomize.bind(this)
        this.stopRandomize = this.stopRandomize.bind(this)
        this.replaceOne = this.replaceOne.bind(this)

        this.x = 8
        this.y = 21

        this.socket = null
    }

    componentDidMount(){
        //this.startRandomize()
        this.socket = io("localhost:3107",{
            "reconnectionAttempts": "Infinity",
            "transports": ['websocket']
        })
        this.socket.on('screen-update', function(data) {
            this.setState({cells: convertRawFadeCandyDataToScreen(data, this.x, this.y)})
        }.bind(this))

        this.socket.on('connect', function () {
            console.log("Sending event")
            this.socket.emit('get-strategies')
        }.bind(this))

        this.socket.on('strategies', function (data) {
            let newState = Object.assign({}, this.state)
            newState.strategies = data
            this.setState(newState)
        }.bind(this))
    }

    componentWillUnmount(){
        this.stopRandomize()
    }

    startRandomize(){
        if(this.interval) {
            this.stopRandomize()
        }
        this.interval = setInterval(function () {
            this.randomize()
        }.bind(this), 16)
    }

    stopRandomize(){
        if(this.interval) {
            clearInterval(this.interval)
            this.interval = null
        }
    }

    static propTypes = {
    };

    randomize(){
        this.setState({cells : this.generateRandom(this.x * this.y)})
    }

    replaceOne(){
        let newState = Object.assign({}, this.state)
        var i = getRandomInt(newState.cells.length)
        newState.cells[i] = this.generateRandomPixel(i)
        this.setState(newState)
    }

    generateRandom(size) {
      var a = []
      for (var i = 0; i < size; i++) {
        a.push(this.generateRandomPixel(i))
      }
      return a
    }

    generateBlack(size) {
        var a = []
        for (var i = 0; i < size; i++) {
            a.push(this.generateBlackPixel(i))
        }
        return a
    }

    generateRandomPixel(index){
         return { index: index, color: [getRandomInt(255), getRandomInt(255), getRandomInt(255)] }
    }

    generateBlackPixel(index){
        return { index: index, color: [0, 0, 0] }
    }

    render() {
        return <div className={'screen-container'}>
            <Screen data={this.state.cells} x={8} y={21} pixelSize={25} pixelGap={3}/>


        </div>
    }
}

/*
            <div className={'buttons-line'}>
                <button className={"btn"} onClick={this.randomize}>Randomize</button>
                <button className={"btn"} onClick={this.replaceOne}>Replace One</button>
                <button className={"btn btn-success"} onClick={this.startRandomize}>Start</button>
                <button className={"btn btn-danger"} onClick={this.stopRandomize}>Stop</button>

            </div>
            */

function mapDispatchToProps(dispatch) {
    return {
    }
}

export default connect(null, mapDispatchToProps)(ScreenPage)
