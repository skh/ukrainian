import { BrowserRouter, Routes, Route } from 'react-router-dom'
import VerbListPage from './pages/VerbListPage'
import AddVerbPage from './pages/AddVerbPage'
import EditVerbPage from './pages/EditVerbPage'
import PairPage from './pages/PairPage'
import DrillPage from './pages/DrillPage'
import WordFamiliesPage from './pages/WordFamiliesPage'
import WordFamilyPage from './pages/WordFamilyPage'
import NounsListPage from './pages/NounsListPage'
import AddNounPage from './pages/AddNounPage'
import AddWordPage from './pages/AddWordPage'
import WordPage from './pages/WordPage'
import WordsListPage from './pages/WordsListPage'
import NounPage from './pages/NounPage'
import ChunksListPage from './pages/ChunksListPage'
import AddChunkPage from './pages/AddChunkPage'
import ChunkPage from './pages/ChunkPage'
import TextAnalysisPage from './pages/TextAnalysisPage'
import QuickAddPage from './pages/QuickAddPage'
import DeclinablePage from './pages/DeclinablePage'
import AddDeclinablePage from './pages/AddDeclinablePage'
import DeclinablesListPage from './pages/DeclinablesListPage'

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
        <Route path="/nouns" element={<NounsListPage />} />
        <Route path="/nouns/add" element={<AddNounPage />} />
        <Route path="/words" element={<WordsListPage />} />
        <Route path="/words/add" element={<AddWordPage />} />
        <Route path="/words/:id" element={<WordPage />} />
        <Route path="/nouns/:id" element={<NounPage />} />
        <Route path="/chunks" element={<ChunksListPage />} />
        <Route path="/chunks/add" element={<AddChunkPage />} />
        <Route path="/chunks/:id" element={<ChunkPage />} />
        <Route path="/analyze" element={<TextAnalysisPage />} />
        <Route path="/quick-add" element={<QuickAddPage />} />
        <Route path="/adjectives" element={<DeclinablesListPage pos="adjective" />} />
        <Route path="/adjectives/add" element={<AddDeclinablePage pos="adjective" />} />
        <Route path="/adjectives/:id" element={<DeclinablePage pos="adjective" />} />
        <Route path="/pronouns" element={<DeclinablesListPage pos="pronoun" />} />
        <Route path="/pronouns/add" element={<AddDeclinablePage pos="pronoun" />} />
        <Route path="/pronouns/:id" element={<DeclinablePage pos="pronoun" />} />
        <Route path="/numerals" element={<DeclinablesListPage pos="numeral" />} />
        <Route path="/numerals/add" element={<AddDeclinablePage pos="numeral" />} />
        <Route path="/numerals/:id" element={<DeclinablePage pos="numeral" />} />
      </Routes>
    </BrowserRouter>
  )
}
