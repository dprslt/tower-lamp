import React from 'react'
import Strategy from "./strategy/strategy";


export default class Strategies extends React.Component {


    constructor(props, context) {
        super(props, context);
    }

    render(){
        let strategies = null
        if(this.props.strategies) {
            strategies = this.props.strategies.map((s,i) => <Strategy strategy={s} playHandler={this.props.playHandler} key={i+""+s.name}/>)
        }
        return (
            <div className={}>
                <h2>Animation</h2>
                <div className={"strategies"}>
                    {strategies}
                </div>
            </div>
        )

    }

}