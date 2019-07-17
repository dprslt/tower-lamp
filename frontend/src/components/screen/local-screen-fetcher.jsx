import React, {Component} from "react"
import io from "socket.io-client";
import Screen from "./screen";


/**
 * Excluding the 4th first cases of the array
 * @param rawArray
 * @param xMax
 * @param yMax
 * @returns {any[]}
 */
function convertRawFadeCandyDataToScreen(rawArray, xMax, yMax){
    var a = Array(xMax * yMax)
    for (let i = 1; i <= xMax * yMax ; i++) {
        a[i-1] = {
            index: i - 1,
            color: [rawArray[i * 3 + 1], rawArray[i * 3 + 1 + 1], rawArray[i * 3 + 2 + 1 ]]
        }
    }

    return a.reverse()
}

export default class LocalScreenFetcher extends Component{
    constructor (props) {
        super(props)

        this.x = 8
        this.y = 21

        this.state = {
            cells : this.generateBlack(this.x * this. y)
        }

        this.socket = null
    }


    generateBlack(size) {
        var a = []
        for (var i = 0; i < size; i++) {
            a.push(this.generateBlackPixel(i))
        }
        return a
    }

    generateBlackPixel(index){
        return { index: index, color: [0, 0, 0] }
    }

       render(){
        let finalData = this.state.cells
        if(this.props.data){
            finalData = convertRawFadeCandyDataToScreen(this.props.data, this.x, this.y)
        }

        return (
            <Screen data={finalData} x={this.x} y={this.y} pixelSize={25} pixelGap={3}/>
        )
    }


}