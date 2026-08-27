import {Box} from '@chakra-ui/react'
import CircleStrategy from "./CircleStrategy";

export const virtualScreenWidth = 8 * 20
export const virtualScreenHeight = 21 * 20


export default function Strategies({strategies, playHandler, selectedStrategy}) {
    return (
        <Box display="flex" flexWrap="wrap" gap={3}>
            {strategies && strategies.map(s => <CircleStrategy
                strategy={{name: s.strategyName, params: s.params}}
                playHandler={playHandler}
                selectedStrategy={selectedStrategy}
                key={s.name || s.strategyName + JSON.stringify(s.params)}
            />)}
        </Box>
    )
}