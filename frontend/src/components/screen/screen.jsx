import {Component, createRef} from "react"
import PropTypes from 'prop-types'
import './screen.scss'

class Screen extends Component {
    constructor(props) {
        super(props)
        this.canvasRef = createRef()
        this.offscreen = null
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

        if (!this.offscreen) {
            this.offscreen = document.createElement('canvas')
            this.offscreen.width = canvas.width
            this.offscreen.height = canvas.height
        }
        const offCtx = this.offscreen.getContext('2d')
        if (!offCtx) {
            return
        }

        const {data, x, y, pixelSize} = this.props
        offCtx.fillStyle = 'black'
        offCtx.fillRect(0, 0, this.offscreen.width, this.offscreen.height)
        for (let i = 0; i < data.length; i++) {
            const cell = data[i]
            const col = x - 1 - Math.floor(i / y)
            const row = i % y
            const [r, g, b] = cell.color
            offCtx.fillStyle = `rgb(${r},${g},${b})`
            offCtx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize)
        }

        ctx.drawImage(this.offscreen, 0, 0)
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