
import WebSocket from "ws"

export default class FadeCandyConnection{

    fadeCandySocketURL;

    socket;

    constructor(fadeCandySocketURL) {
        this.fadeCandySocketURL = fadeCandySocketURL
    }

    connect(){

        console.log("Trying to connect to the FadeCandy")

        if(this.socket) {
            console.log("Terminating the existing connection")
            this.socket.terminate()
        }

        this.socket = new WebSocket(this.fadeCandySocketURL)
        this.socket.onerror = () => {
            console.error('Unable to connect to the fadecandy')
        }
        this.socket.onopen = () => {
            console.log('Connected to the fadeCandy')
        }
        this.socket.onclose = () => {
            console.error('Connection to the fadecandy fail. Reconnecting')
            if(this.timeout){
                clearTimeout(this.timeout)
            }
            this.timeout = setTimeout(() => this.connect(), 1000)
        }

    }

    getStatus(){
        if(this.socket){
            return this.socket.readyState
        }
        return WebSocket.CLOSED;
    }


}
