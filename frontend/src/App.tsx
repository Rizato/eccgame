import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import ECCGamePage from './pages/ECCGamePage';
import FAQPage from './pages/FAQPage';
import PrivacyPage from './pages/PrivacyPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<ECCGamePage mode="daily" />} />
          <Route path="/practice" element={<ECCGamePage mode="practice" />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
