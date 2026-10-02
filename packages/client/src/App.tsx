import { Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { Organizer } from './pages/Organizer';
import { Vote } from './pages/Vote';
import { Results } from './pages/Results';

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/organizer" element={<Organizer />} />
          <Route path="/vote" element={<Vote />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </main>
    </div>
  );
}
