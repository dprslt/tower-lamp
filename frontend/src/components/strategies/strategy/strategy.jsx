import React from 'react'


export default class Strategy extends React.Component {


    constructor(props, context) {
        super(props, context);

        this.emitClick = this.emitClick.bind(this)
    }

    emitClick(){
        this.props.playHandler(this.props.strategy)
    }

    render(){
        return (
            <div className={"strategy"}>
                <h4>{this.props.strategy.name}</h4>
                <button onClick={this.emitClick} className={"btn btn-primary"}>Play</button>
            </div>)
    }

}