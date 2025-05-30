import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ECCGamePage from './pages/ECCGamePage';
import GamePage from './pages/GamePage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<ECCGamePage />} />
          <Route path="/legacy" element={<GamePage />} />
          {/* Add more routes here as needed */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
