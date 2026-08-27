import {Circle, Image as KonvaImage, Layer, Rect, Stage} from "react-konva";
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


const FireworksStrategy = ({actionHandler}) => {
    return <Stage width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        <Layer>
            <Rect x={0}
                  y={0}
                  width={CIRCLE_SIZE}
                  height={CIRCLE_SIZE}
                  fill={'#0b0b14'}
                  onTap={actionHandler}
            />
            <Circle x={CIRCLE_SIZE / 2}
                    y={CIRCLE_SIZE / 2}
                    radius={2}
                    fill={'#fff8d0'}
                    onTap={actionHandler}
            />
            <Circle x={CIRCLE_SIZE / 2 - 10}
                    y={CIRCLE_SIZE / 2 + 8}
                    radius={3}
                    fill={'#ff4d6d'}
                    onTap={actionHandler}
            />
            <Circle x={CIRCLE_SIZE / 2 + 12}
                    y={CIRCLE_SIZE / 2 + 5}
                    radius={2.5}
                    fill={'#4dccff'}
                    onTap={actionHandler}
            />
            <Circle x={CIRCLE_SIZE / 2 - 6}
                    y={CIRCLE_SIZE / 2 - 12}
                    radius={2}
                    fill={'#ffe66d'}
                    onTap={actionHandler}
            />
            <Circle x={CIRCLE_SIZE / 2 + 8}
                    y={CIRCLE_SIZE / 2 - 10}
                    radius={3}
                    fill={'#c084fc'}
                    onTap={actionHandler}
            />
        </Layer>
    </Stage>
}


const RainStrategy = ({actionHandler}) => {
    return <Stage width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        <Layer>
            <Rect x={0}
                  y={0}
                  width={CIRCLE_SIZE}
                  height={CIRCLE_SIZE}
                  fill={'#10102a'}
                  onTap={actionHandler}
            />
            <Circle x={CIRCLE_SIZE / 2 - 12}
                    y={CIRCLE_SIZE / 2 - 12}
                    radius={1.5}
                    fill={'#7ab8ff'}
                    onTap={actionHandler}
            />
            <Circle x={CIRCLE_SIZE / 2 + 2}
                    y={CIRCLE_SIZE / 2 - 6}
                    radius={1.5}
                    fill={'#9d8aff'}
                    onTap={actionHandler}
            />
            <Circle x={CIRCLE_SIZE / 2 - 8}
                    y={CIRCLE_SIZE / 2 + 6}
                    radius={1.5}
                    fill={'#c084fc'}
                    onTap={actionHandler}
            />
            <Circle x={CIRCLE_SIZE / 2 + 10}
                    y={CIRCLE_SIZE / 2 + 10}
                    radius={1.5}
                    fill={'#7ab8ff'}
                    onTap={actionHandler}
            />
            <Circle x={CIRCLE_SIZE / 2 + 14}
                    y={CIRCLE_SIZE / 2 - 4}
                    radius={2}
                    fill={'#e0d7ff'}
                    onTap={actionHandler}
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
            stratComponent = <FireworksStrategy actionHandler={actionHandler}/>
            break
        case 'rain':
            stratComponent = <RainStrategy actionHandler={actionHandler}/>
            break
    }

    return <div className={'circle-strategy'} onClick={actionHandler}>
        {stratComponent}
    </div>

}
