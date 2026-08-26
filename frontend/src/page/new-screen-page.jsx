//REACT
import {Component} from "react"

// APP
import Strategies from "../components/strategies/strategies"
import ScreenFetcher from '../components/screen/screen-fetcher'
import io from 'socket.io-client'
import './screen-page.scss'
import {Col, Container, Row} from "reactstrap"
import HeaderBar from "../components/header/HeaderBar"
import {colors, images} from "../components/strategies/strategies-data"
import BACKEND_WS_URL from "../backend-url"

export default class NewScreenPage extends Component {
    constructor(props, context) {
        super(props, context)

        this.playHandler = this.playHandler.bind(this)
        this.mobileToggle = this.mobileToggle.bind(this)

        this.state = {
            data: null,
            refresh: false,
            dataUrl: '',
            connected: false,
            socket: null,
            showScreenOnMobile: false,
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

    componentWillUnmount() {
        if (this.socket) {
            this.socket.close()
        }
    }

    playHandler(strategy) {
        console.log(strategy)
        this.socket.emit("select-strategy", (strategy))
    }

    mobileToggle() {
        this.setState((state) => ({showScreenOnMobile: !state.showScreenOnMobile}))
    }

    render() {

        const {showScreenOnMobile} = this.state
        return <div>
            <HeaderBar 
                status={this.state.connected} 
                playHandler={this.playHandler}
                toggleScreen={this.mobileToggle}
                screenEnable={this.state.showScreenOnMobile}   
            />

            <div className={'small-screen'}>
                <ScreenFetcher socket={this.socket} externalStyle/>
            </div>

            <Container fluid={true}>
                <Row>
                    <Col className={'content mt-4'+`${showScreenOnMobile ? ' d-none d-sm-block' : ''}`}>
                        <h4>Couleurs :</h4>
                        <div className={"strategies-container basic-strategies"}>
                            <Strategies playHandler={this.playHandler} strategies={colors}/>
                        </div>
                        <h4>Images :</h4>
                        <div className={"strategies-container basic-strategies"}>
                            <Strategies playHandler={this.playHandler} strategies={images}/>
                        </div>
                    </Col>
                    <Col sm={'auto'} className={`${showScreenOnMobile ? 'd-block' : 'd-none d-sm-block'}`}>
                        <div className={'screen-container'}>
                            <ScreenFetcher socket={this.socket}/>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    }

}