import {Component} from "react"
import PropTypes from 'prop-types'

class Pixel extends Component {
  constructor (props) {
      super(props)
  }

  static propTypes = {
    r: PropTypes.number,
    g: PropTypes.number,
    b: PropTypes.number,
  };

  render(){
    return <div className="pixel" style={{"backgroundColor": "rgb("+this.props.r+","+this.props.g+","+this.props.b+")"}}> </div>
  }
}

export default Pixel
