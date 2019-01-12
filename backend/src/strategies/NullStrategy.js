import Strategy from "./AbstractStrategy";


export default class NullStrategy extends Strategy{


    start(){
        //Do Nothing
        this.screen.erase()
        this.screen.refresh()
    }

    stop(){
        //Do Nothing
    }

}