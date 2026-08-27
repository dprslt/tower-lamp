import {ChakraProvider} from '@chakra-ui/react'
import {Route, Routes} from 'react-router-dom'

import ScreenPage from '../page/screen-page'
import NewScreenPage from '../page/new-screen-page'
import system from './theme'

export default function App() {
    return (
        <ChakraProvider value={system}>
            <Routes>
                <Route path="/old" element={<ScreenPage />} />
                <Route path="/" element={<NewScreenPage />} />
            </Routes>
        </ChakraProvider>
    )
}