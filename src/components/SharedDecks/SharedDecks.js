import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { collection, getDocs, query, where, orderBy, addDoc, updateDoc, increment, doc } from 'firebase/firestore';
import './SharedDecks.css';

const PROGRAMMING_LANGUAGES = [
  'JavaScript',
  'Python',
  'Java',
  'C++',
  'C#',
  'Ruby',
  'PHP',
  'Swift',
  'Go',
  'Rust',
  'TypeScript',
  'SQL',
  'HTML/CSS',
  'Shell',
  'Other'
];

const SharedDecks = ({ userId, onBack }) => {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [sortBy, setSortBy] = useState('popularity'); // 'popularity', 'recent', 'imports'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSharedDecks();
  }, [selectedLanguage, sortBy]);

  const loadSharedDecks = async () => {
    try {
      setLoading(true);
      let sharedDecksRef = collection(db, 'sharedDecks');
      let constraints = [];

      if (selectedLanguage) {
        constraints.push(where('language', '==', selectedLanguage));
      }

      let sortConstraint;
      switch (sortBy) {
        case 'popularity':
          sortConstraint = orderBy('likes', 'desc');
          break;
        case 'recent':
          sortConstraint = orderBy('createdAt', 'desc');
          break;
        case 'imports':
          sortConstraint = orderBy('imports', 'desc');
          break;
        default:
          sortConstraint = orderBy('likes', 'desc');
      }
      constraints.push(sortConstraint);

      const q = query(sharedDecksRef, ...constraints);
      const snapshot = await getDocs(q);

      const loadedDecks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setDecks(loadedDecks);
      setError('');
    } catch (error) {
      console.error('Error loading shared decks:', error);
      setError('Failed to load shared decks');
    } finally {
      setLoading(false);
    }
  };

  const importDeck = async (deck) => {
    try {
      // Create new deck in user's collection
      const userDeckRef = collection(db, `users/${userId}/decks`);
      const newDeck = await addDoc(userDeckRef, {
        name: deck.name,
        language: deck.language,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        importedFrom: deck.id
      });

      // Copy all cards from shared deck to user's deck
      const sharedCardsRef = collection(db, `sharedDecks/${deck.id}/cards`);
      const cardsSnapshot = await getDocs(sharedCardsRef);
      const userCardsRef = collection(db, `users/${userId}/decks/${newDeck.id}/cards`);

      for (const cardDoc of cardsSnapshot.docs) {
        const cardData = cardDoc.data();
        await addDoc(userCardsRef, {
          ...cardData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      // Increment import count
      await updateDoc(doc(db, 'sharedDecks', deck.id), {
        imports: increment(1)
      });

      alert('Deck imported successfully!');
    } catch (error) {
      console.error('Error importing deck:', error);
      alert('Failed to import deck');
    }
  };

  const filteredDecks = decks.filter(deck =>
    deck.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deck.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="shared-decks">
      <div className="shared-decks-header">
        <button className="back-button" onClick={onBack}>
          ← Back to My Decks
        </button>
        <h2>Community Decks</h2>
      </div>

      <div className="filters-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search decks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="auth-input"
          />
        </div>

        <div className="filters">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="language-select"
          >
            <option value="">All Languages</option>
            {PROGRAMMING_LANGUAGES.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="popularity">Most Popular</option>
            <option value="recent">Most Recent</option>
            <option value="imports">Most Imported</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading shared decks...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="shared-decks-grid">
          {filteredDecks.length === 0 ? (
            <div className="no-results">
              No decks found matching your criteria
            </div>
          ) : (
            filteredDecks.map(deck => (
              <div key={deck.id} className="shared-deck-card">
                <div className="deck-info">
                  <h3>{deck.name}</h3>
                  {deck.language && (
                    <span className="language-tag">{deck.language}</span>
                  )}
                  <p className="deck-description">{deck.description || 'No description provided'}</p>
                </div>
                <div className="deck-stats">
                  <span className="stat">
                    <i className="icon-heart"></i> {deck.likes || 0} likes
                  </span>
                  <span className="stat">
                    <i className="icon-download"></i> {deck.imports || 0} imports
                  </span>
                </div>
                <div className="deck-actions">
                  <button
                    onClick={() => importDeck(deck)}
                    className="auth-button"
                  >
                    Import Deck
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SharedDecks;
