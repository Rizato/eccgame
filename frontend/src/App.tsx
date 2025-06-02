import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import ECCGamePage from './pages/ECCGamePage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<ECCGamePage />} />
          {/* Add more routes here as needed */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
