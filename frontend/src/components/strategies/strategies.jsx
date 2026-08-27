import React from 'react'
import './strategies.scss'
import CircleStrategy from "./CircleStrategy";

export const virtualScreenWidth = 8 * 20
export const virtualScreenHeight = 21 * 20


export default class Strategies extends React.Component {

    constructor(props, context) {
        super(props, context);
    }

    render(){
        return (
            <div className={""}>
                <div className={"strategies"}>
                    {this.props.strategies && this.props.strategies.map(s => <CircleStrategy strategy={ {name:s.strategyName, params:s.params} } playHandler={this.props.playHandler} selectedStrategy={this.props.selectedStrategy} key={s.name}/>)}
                </div>
            </div>


        )

    }

}