//REACT
import React, {Component} from "react"
import PropTypes from 'prop-types'
// REDUX
import {connect} from 'react-redux'

// APP
import Strategies from "../components/strategies/strategies";
import ScreenFetcher from '../components/screen/screen-fetcher'
import {readAndCompressImage} from 'browser-image-resizer';
import ImageUploader from 'react-images-upload';
import io from 'socket.io-client'
import './screen-page.scss'
import LocalScreenFetcher from "../components/screen/local-screen-fetcher";
import {Circle, Layer, Stage, Rect} from "react-konva";
import Konva from 'konva';
import {Badge, Button, Col, Container, Row} from "reactstrap";
import HeaderBar from "../components/header/HeaderBar";
import {colors, images} from "../components/strategies/strategies-data";


function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max))
}

export default class NewScreenPage extends Component {
    constructor(props, context) {
        super(props, context)

        this.playHandler = this.playHandler.bind(this)

        this.state = {
            data: null,
            refresh: false,
            dataUrl: '',
            connected: false,
            socket: null,
        }

        this.socket = null

    }

    componentDidMount() {
        this.socket = io(BACKEND_WS_URL, {
            "reconnectionAttempts": "Infinity",
            "transports": ['websocket']
        })

        this.socket.on('connect', () => {
            console.log("Connected with the backend")
            this.setState({connected: true})
        })

        this.socket.on('screen-image', (dataUrl) => {
            this.setState({...this.state, dataUrl})
        })

        this.socket.on('disconnect', () => {
            console.log("Connection lost with the backend")
            this.setState({connected: false})
        })
    }

    playHandler(strategy) {
        console.log(strategy)
        this.socket.emit("select-strategy", (strategy))
    }

    render() {
        return <div>
            <HeaderBar status={this.state.connected} playHandler={this.playHandler} />

            <div className={'small-screen'}>
                <ScreenFetcher socket={this.socket} externalStyle/>
            </div>

            <Container fluid={true}>
                <Row>
                    <Col className={'content mt-4'}>
                        <h4>Couleurs :</h4>
                        <div className={"strategies-container basic-strategies"}>
                            <Strategies playHandler={this.playHandler} strategies={colors}/>
                        </div>
                        <h4>Images :</h4>
                        <div className={"strategies-container basic-strategies"}>
                            <Strategies playHandler={this.playHandler} strategies={images}/>
                        </div>
                    </Col>
                    <Col sm={'auto'} className={'d-none d-sm-block'}>
                        <div className={'screen-container'}>
                            <ScreenFetcher socket={this.socket}/>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    }

}
