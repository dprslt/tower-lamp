import React from 'react'
import Slider, { Range } from 'rc-slider';
// We can just import Slider or Range to reduce bundle size
// import Slider from 'rc-slider/lib/Slider';
// import Range from 'rc-slider/lib/Range';
import 'rc-slider/assets/index.css';

import './strategy.scss'

export default class Strategy extends React.Component {

    renderFunctions = {
        color: function (p) {
            return (
                <div key={p.name} className={'animation-parameter'}>
                    <div className={'parameter-title'}>{p.name}<span className={'separator'}> : </span></div>
                    <div className={'parameter-input'}>
                        <Slider min={0} max={255}/>
                    </div>
                </div>)
        },
        number: (p) => {
            return (
                <div key={p.name} className={'animation-parameter'}>
                    <div className={'parameter-title'}>{p.name}<span className={'separator'}> : </span></div>
                    <div className={'parameter-input'}>
                        <input className={"form-control"} defaultValue={p.defaultValue} onChange={(e) => {
                            const val = e.target.value
                            this.setState((state) => { return {params : {...state.params, [p.name]: val}}})
                        }}/>
                    </div>
                </div>)
            }
    }


    constructor(props, context) {
        super(props, context);

        this.emitClick = this.emitClick.bind(this)
        this.toggleEdit = this.toggleEdit.bind(this)

        this.state = {
            expansed: false,
            params: {}
        }
    }

    toggleEdit(){
        this.setState({...this.state, expansed : !this.state.expansed})
    }

    emitClick(){
        const newParams = [...this.props.strategy.params]
        for (const np in this.state.params){
            const obj = newParams.find(e => e.name === np)
            obj.value = this.state.params[np]
        }
        const newStrat = {...this.props.strategy, params: newParams}
        this.props.playHandler(this.props.strategy)
    }

    renderParams(){
        return this.props.strategy.params.map(p => {

            if(p.type && this.renderFunctions[p.type]){
                return this.renderFunctions[p.type](p)
            } else {
                return (
                <div key={p.name} className={'animation-parameter'}>
                    <div className={'parameter-title'}>{p.name}<span className={'separator'}> : </span></div>
                    <div className={'parameter-input'}>{p.defaultValue}</div>
                </div>)
            }

        })
    }

    render(){
        const buttonClass = this.props.strategy.colorClass || "btn-primary"
        const expansedClass = this.state.expansed ? "expansed" : ""

        return (
            <div className={"strategy card"}>
                <div className={'card-body '+expansedClass}>
                    <h5 className={"card-title"}>{this.props.strategy.name}</h5>

                    <div className={"card-content"}>

                        {this.props.strategy.params.length > 0 && <button onClick={this.toggleEdit} className={"btn"}>{this.state.expansed ? "Terminer" : "Modifier"}</button>}
                        <div className="strategy-parameters">
                            {this.renderParams()}
                        </div>
                        <button onClick={this.emitClick} className={"btn card-link "+buttonClass}>Lancer !</button>
                    </div>
                </div>
            </div>)
    }

}
