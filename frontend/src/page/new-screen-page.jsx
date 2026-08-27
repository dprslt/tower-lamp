//REACT
import {Component} from "react"

// APP
import Strategies from "../components/strategies/strategies"
import ScreenFetcher from '../components/screen/screen-fetcher'
import io from 'socket.io-client'
import {Box, Container, Grid, Heading} from "@chakra-ui/react"
import HeaderBar from "../components/header/HeaderBar"
import {colors, images, animations} from "../components/strategies/strategies-data"
import BACKEND_WS_URL from "../backend-url"
import './screen-page.scss'

function StrategySection({title, strategies, playHandler, selectedStrategy}) {
    return (
        <Box mb={8}>
            <Heading
                as="h2"
                size="sm"
                textTransform="uppercase"
                letterSpacing="wider"
                color="lamp.600"
                mb={3}
            >
                {title}
            </Heading>
            <Strategies playHandler={playHandler} strategies={strategies} selectedStrategy={selectedStrategy}/>
        </Box>
    )
}

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
            currentStrategy: null,
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

        this.socket.on('strategy-selected', (strategy) => {
            this.setState({...this.state, currentStrategy: strategy})
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
        return <Box minH="100vh" bg="bg">
            <HeaderBar
                status={this.state.connected}
                playHandler={this.playHandler}
                toggleScreen={this.mobileToggle}
                screenEnable={this.state.showScreenOnMobile}
            />

            <Box className="small-screen" aria-hidden="true">
                <ScreenFetcher socket={this.socket} externalStyle/>
            </Box>

            <Container maxW="container.xl" py={6}>
                <Grid
                    templateColumns={{base: '1fr', lg: '1fr auto'}}
                    gap={{base: 6, lg: 10}}
                    alignItems="start"
                >
                    <Box display={{base: showScreenOnMobile ? 'none' : 'block', lg: 'block'}}>
                        <StrategySection title="Couleurs" strategies={colors} playHandler={this.playHandler} selectedStrategy={this.state.currentStrategy}/>
                        <StrategySection title="Animations" strategies={animations} playHandler={this.playHandler} selectedStrategy={this.state.currentStrategy}/>
                        <StrategySection title="Images" strategies={images} playHandler={this.playHandler} selectedStrategy={this.state.currentStrategy}/>
                    </Box>

                    <Box
                        className="screen-container"
                        display={{base: showScreenOnMobile ? 'block' : 'none', lg: 'block'}}
                        width={{base: '100%', lg: 'fit-content'}}
                        justifySelf={{lg: 'end'}}
                    >
                        <ScreenFetcher socket={this.socket} externalStyle/>
                    </Box>
                </Grid>
            </Container>
        </Box>
    }

}