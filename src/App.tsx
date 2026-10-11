import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Matchmaker } from './pages/Matchmaker'
import { VenueDetail } from './pages/VenueDetail'
import { Explore } from './pages/Explore'
import { Saved } from './pages/Saved'
import { Demo } from './pages/Demo'

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/matchmaker" element={<Matchmaker />} />
          <Route path="/venue/:id" element={<VenueDetail />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
