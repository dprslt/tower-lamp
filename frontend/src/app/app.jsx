import { Route, Routes } from 'react-router-dom'

import ScreenPage from '../page/screen-page'
import NewScreenPage from '../page/new-screen-page'

export default function App() {
    return (
        <div className="app-component">
            <Routes>
                <Route path="/old" element={<ScreenPage />} />
                <Route path="/" element={<NewScreenPage />} />
            </Routes>
        </div>
    )
}