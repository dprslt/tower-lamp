import React from 'react'
import Strategy from "./strategy/strategy";
import './strategies.scss'

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
            <div className={"container-fluid"}>

                <div className={'row mt-3'}>
                    <div className={'col heading pl-5'}>
                        <h3 className={"display-4"}>Animations</h3>
                    </div>
                </div>
                <div className={"strategies"}>
                    {strategies}
                </div>
            </div>


        )

    }

}