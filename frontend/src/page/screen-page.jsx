//REACT
import React, {Component} from "react"
import PropTypes from 'prop-types'
// REDUX
import {connect} from 'react-redux'

// APP
import Strategies from "../components/strategies/strategies";
import ScreenFetcher from '../components/screen/screen-fetcher'
import io from 'socket.io-client'
import './screen-page.scss'

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max))
}

export default class ScreenPage extends Component {
    constructor (props, context) {
        super(props, context)

        this.playHandler = this.playHandler.bind(this)

        this.state = {
            strategies: []
        }

        this.socket = null
    }

    componentDidMount(){
        this.socket = io("localhost:3107",{
            "reconnectionAttempts": "Infinity",
            "transports": ['websocket']
        })

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

    playHandler(strategy){
        console.log(strategy)
        this.socket.emit("select-strategy", (strategy))
    }

    render() {
        return (
        <div >
            <div className={"container-fluid"}>
                <div className={"row"}>
                    <div className={'col heading text-center mt-5 mb-5'}>
                        <h1 className={"display-4"}>NOTRE LAMPE</h1>
                    </div>
                </div>
            </div>
            <div className={'root-container'}>
                <div className={"strategies-container"}>
                    <Strategies strategies={this.state.strategies} playHandler={this.playHandler}/>
                </div>
                <div className={'screen-container'}>
                    <ScreenFetcher socket={this.socket}/>
                </div>
            </div>
        </div>)
    }
}