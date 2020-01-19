
import WebSocket from "ws"

export default class FadeCandyConnection{
    get socket(): WebSocket {
        if(this._socket){
            return this._socket;
        }
        throw new Error("You must call connect Before");
    }

    private readonly fadeCandySocketURL: string;
    private _socket: WebSocket | undefined = undefined;
    private timeout: NodeJS.Timeout | null = null;

    constructor(fadeCandySocketURL: string) {
        this.fadeCandySocketURL = fadeCandySocketURL
    }

    connect(){

        console.log("Trying to connect to the FadeCandy")

        if(this._socket) {
            console.log("Terminating the existing connection")
            this._socket.terminate()
        }

        this._socket = new WebSocket(this.fadeCandySocketURL)
        this._socket.onerror = () => {
            console.error('Unable to connect to the fadecandy')
        }
        this._socket.onopen = () => {
            console.log('Connected to the fadeCandy')
        }
        this._socket.onclose = () => {
            console.error('Connection to the fadecandy fail. Reconnecting')
            if(this.timeout){
                clearTimeout(this.timeout)
            }
            this.timeout = setTimeout(() => this.connect(), 1000)
        }

    }

    getStatus() : number{
        if(this._socket){
            return this._socket.readyState
        }
        return WebSocket.CLOSED;
    }


}
