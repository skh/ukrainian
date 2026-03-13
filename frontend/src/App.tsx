import { BrowserRouter, Routes, Route } from 'react-router-dom'
import VerbListPage from './pages/VerbListPage'
import AddVerbPage from './pages/AddVerbPage'
import EditVerbPage from './pages/EditVerbPage'
import PairPage from './pages/PairPage'
import DrillPage from './pages/DrillPage'
import WordFamiliesPage from './pages/WordFamiliesPage'
import WordFamilyPage from './pages/WordFamilyPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VerbListPage />} />
        <Route path="/verbs/add" element={<AddVerbPage />} />
        <Route path="/verbs/:id/edit" element={<EditVerbPage />} />
        <Route path="/pairs/:id" element={<PairPage />} />
        <Route path="/drill" element={<DrillPage />} />
        <Route path="/word-families" element={<WordFamiliesPage />} />
        <Route path="/word-families/:id" element={<WordFamilyPage />} />
      </Routes>
    </BrowserRouter>
  )
}
