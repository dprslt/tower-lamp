import {Box} from "@chakra-ui/react";
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


export default function CircleStrategy(props) {

    const actionHandler = () => {
        props.playHandler(props.strategy)
    }

    const selected = props.selectedStrategy !== null
        && props.selectedStrategy !== undefined
        && props.selectedStrategy.name === props.strategy.name
        && JSON.stringify(props.selectedStrategy.params) === JSON.stringify(props.strategy.params)

    let stratComponent = null;
    switch (props.strategy.name) {
        case 'color':
            stratComponent = <ColorStrategy params={props.strategy.params} actionHandler={actionHandler}/>
            break;
        case 'image':
        case 'fireworks':
        case 'rain':
        case 'spinning-dot':
            stratComponent = <ImageStrategy params={props.strategy.params} actionHandler={actionHandler}/>
            break
    }

    return <Box
        className={'circle-strategy' + (selected ? ' selected' : '')}
        onClick={actionHandler}
        cursor="pointer"
        borderRadius="full"
        overflow="hidden"
        lineHeight={0}
        border="2px solid"
        borderColor={selected ? 'lamp.500' : 'gray.300'}
        boxShadow={selected ? '0 0 18px 4px rgba(249, 138, 13, 0.35)' : '0 2px 8px rgba(0, 0, 0, 0.12)'}
        transition="all 0.15s ease-in-out"
        _hover={{borderColor: 'gray.500', transform: 'scale(1.06)'}}
    >
        {stratComponent}
    </Box>

}