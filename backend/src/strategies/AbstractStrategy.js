

export default class Strategy{

    screen

    constructor(screen) {
        this.screen = screen
    }

    updateScreen(){
        this.screen.refresh()
    }

    start(){
        throw new Error("Not yet Implemented")
    }

    stop(){
        throw new Error("Not yet Implemented")
    }

}