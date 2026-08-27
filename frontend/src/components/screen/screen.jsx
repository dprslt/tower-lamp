import {Component, createRef} from "react"
import PropTypes from 'prop-types'

class Screen extends Component {
    constructor(props) {
        super(props)
        this.canvasRef = createRef()
    }

    static propTypes = {
        data: PropTypes.array,
        x: PropTypes.number,
        y: PropTypes.number,
        pixelSize: PropTypes.number,
        pixelGap: PropTypes.number,
        externalStyle: PropTypes.bool,
    };

    componentDidMount() {
        this.draw()
    }

    componentDidUpdate() {
        this.draw()
    }

    draw() {
        const canvas = this.canvasRef.current
        if (!canvas) {
            return
        }
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            return
        }

        const {data, x, y, pixelSize} = this.props
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        for (const cell of data) {
            const col = x - 1 - Math.floor(cell.index / y)
            const row = cell.index % y
            const [r, g, b] = cell.color
            ctx.fillStyle = `rgb(${r},${g},${b})`
            ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize)
        }
    }

    render() {
        const {x, y, pixelSize, externalStyle} = this.props
        return (
            <canvas
                ref={this.canvasRef}
                className="screen"
                width={x * pixelSize}
                height={y * pixelSize}
                style={externalStyle ? {} : {width: x * pixelSize, height: y * pixelSize}}
            />
        )
    }
}


export default Screen