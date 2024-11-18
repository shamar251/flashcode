import React, { useState, useEffect } from 'react';
import { auth } from './firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import Auth from './components/Auth/Auth';
import DeckManager from './components/DeckManagement/DeckManager';
import StudyMode from './components/StudyMode/StudyMode';
import SharedDecks from './components/SharedDecks/SharedDecks';
import userIcon from './Icons/user.svg';
import { ReactComponent as FlashCodeIcon } from './Icons/flashcode-icon.svg';
import './styles/main.css';
import './styles/App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [view, setView] = useState('decks'); // 'decks', 'study', or 'shared'
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-controls')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleStartStudying = (deckId) => {
    setSelectedDeck(deckId);
    setView('study');
  };

  const handleBackToDecks = () => {
    setSelectedDeck(null);
    setView('decks');
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  if (loading) {
    return (
      <div className="app">
        <div className="auth-container">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <FlashCodeIcon className="app-icon" />
            <h1>FlashCode</h1>
          </div>
        </div>
        {user && (
          <div className="user-controls">
            <button className="user-icon-btn" onClick={toggleDropdown}>
              <img src={userIcon} alt="User menu" />
            </button>
            {showDropdown && (
              <div className="dropdown-menu">
                <div className="user-email">{user.email}</div>
                <button onClick={() => auth.signOut()}>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {user && (
        <nav className="side-panel">
          <button
            className={`nav-button ${view === 'decks' ? 'active' : ''}`}
            onClick={() => setView('decks')}
            title="My Decks"
          >
            D
          </button>
          <button
            className={`nav-button ${view === 'shared' ? 'active' : ''}`}
            onClick={() => setView('shared')}
            title="Community Decks"
          >
            C
          </button>
        </nav>
      )}

      <main className="app-main">
        {!user ? (
          <Auth />
        ) : (
          <>
            {view === 'decks' && (
              <DeckManager
                userId={user.uid}
                onStartStudying={handleStartStudying}
              />
            )}
            {view === 'study' && (
              <>
                {/* <button
                  onClick={handleBackToDecks}
                  className="auth-button back-button"
                >
                  ← Back to Decks
                </button> */}
                <StudyMode
                  userId={user.uid}
                  deckId={selectedDeck}
                />
              </>
            )}
            {view === 'shared' && (
              <SharedDecks
                userId={user.uid}
                onBack={handleBackToDecks}
              />
            )}
          </>
        )}
      </main>

      {/* <footer className="app-footer">
        <p>FlashCode - Learn coding through spaced repetition</p>
      </footer> */}
    </div>
  );
}

export default App;
