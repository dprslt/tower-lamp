import {Image as KonvaImage, Layer, Rect, Stage} from "react-konva";
import {virtualScreenHeight, virtualScreenWidth} from "./strategies";

const CIRCLE_SIZE = 60

const ColorStrategy = ({params, actionHandler}) => {
    return <Stage width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        <Layer>
            <Rect x={0}
                  y={0}
                  onTap={actionHandler}
                  width={virtualScreenWidth}
                  height={virtualScreenHeight}
                  scaleX={CIRCLE_SIZE / virtualScreenWidth}
                  scaleY={CIRCLE_SIZE / virtualScreenHeight}
                  {...params}
            />
        </Layer>
    </Stage>
}


const ImageStrategy = ({params, actionHandler}) => {
    const image = new Image()
    image.src = params.data
    return <Stage width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        <Layer>
            <KonvaImage x={0}
                   y={0}

                   onTap={actionHandler}
                   width={virtualScreenWidth}
                   height={virtualScreenHeight}
                   scaleX={CIRCLE_SIZE / virtualScreenWidth}
                   scaleY={CIRCLE_SIZE / virtualScreenHeight}
                   image={image}
            />
        </Layer>
    </Stage>
}


const FireworksStrategy = ({params, actionHandler}) => {
    const image = new Image()
    image.src = params.data
    return <Stage width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        <Layer>
            <KonvaImage x={0}
                        y={0}
                        onTap={actionHandler}
                        width={virtualScreenWidth}
                        height={virtualScreenHeight}
                        scaleX={CIRCLE_SIZE / virtualScreenWidth}
                        scaleY={CIRCLE_SIZE / virtualScreenHeight}
                        image={image}
            />
        </Layer>
    </Stage>
}


const RainStrategy = ({params, actionHandler}) => {
    const image = new Image()
    image.src = params.data
    return <Stage width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        <Layer>
            <KonvaImage x={0}
                        y={0}
                        onTap={actionHandler}
                        width={virtualScreenWidth}
                        height={virtualScreenHeight}
                        scaleX={CIRCLE_SIZE / virtualScreenWidth}
                        scaleY={CIRCLE_SIZE / virtualScreenHeight}
                        image={image}
            />
        </Layer>
    </Stage>
}


export default function CircleStrategy(props) {

    const actionHandler = () => {
        props.playHandler(props.strategy)
    }

    let stratComponent = null;
    switch (props.strategy.name) {
        case 'color':
            stratComponent = <ColorStrategy params={props.strategy.params} actionHandler={actionHandler}/>
            break;
        case 'image':
            stratComponent = <ImageStrategy params={props.strategy.params} actionHandler={actionHandler}/>
            break
        case 'fireworks':
            stratComponent = <FireworksStrategy params={props.strategy.params} actionHandler={actionHandler}/>
            break
        case 'rain':
            stratComponent = <RainStrategy params={props.strategy.params} actionHandler={actionHandler}/>
            break
    }

    return <div className={'circle-strategy'} onClick={actionHandler}>
        {stratComponent}
    </div>

}
