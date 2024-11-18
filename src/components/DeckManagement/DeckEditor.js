import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import CardManager from './CardManager';
import './DeckEditor.css';

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

const DeckEditor = ({ userId, deckId, onBack }) => {
  const [deck, setDeck] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [language, setLanguage] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [cards, setCards] = useState([]);
  const [editingCard, setEditingCard] = useState(null);
  const [showAddCard, setShowAddCard] = useState(true);

  useEffect(() => {
    loadDeck();
  }, [userId, deckId]);

  useEffect(() => {
    if (!showAddCard) {
      loadCards();
    }
  }, [showAddCard]);

  const loadDeck = async () => {
    try {
      const deckRef = doc(db, `users/${userId}/decks/${deckId}`);
      const deckDoc = await getDoc(deckRef);

      if (!deckDoc.exists()) {
        setError('Deck not found');
        return;
      }

      const deckData = deckDoc.data();
      setDeck(deckData);
      setDeckName(deckData.name);
      setLanguage(deckData.language || '');
      setDescription(deckData.description || '');
      setError('');
    } catch (error) {
      console.error('Error loading deck:', error);
      setError('Failed to load deck');
    }
  };

  const loadCards = async () => {
    try {
      const cardsRef = collection(db, `users/${userId}/decks/${deckId}/cards`);
      const q = query(cardsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const loadedCards = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCards(loadedCards);
    } catch (error) {
      console.error('Error loading cards:', error);
      setError('Failed to load cards');
    }
  };

  const handleSave = async () => {
    try {
      const deckRef = doc(db, `users/${userId}/decks/${deckId}`);
      await updateDoc(deckRef, {
        name: deckName.trim(),
        language: language,
        description: description.trim(),
        updatedAt: new Date().toISOString()
      });
      loadDeck();
    } catch (error) {
      console.error('Error updating deck:', error);
      setError('Failed to update deck');
    }
  };

  const deleteCard = async (cardId) => {
    if (!window.confirm('Are you sure you want to delete this card?')) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/decks/${deckId}/cards/${cardId}`));
      loadCards();
      if (editingCard?.id === cardId) {
        setEditingCard(null);
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      setError('Failed to delete card');
    }
  };

  const handleCardAdded = () => {
    setEditingCard(null);
    loadCards();
  };

  if (error) {
    return (
      <div className="deck-editor">
        <div className="error-message">{error}</div>
        <button className="auth-button" onClick={onBack}>
          Back to Decks
        </button>
      </div>
    );
  }

  if (!deck) {
    return <div className="deck-editor">Loading...</div>;
  }

  return (
    <div className="deck-editor">
      <div className="editor-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Decks
        </button>

        <div className="deck-settings">
          <div className="settings-row">
            <div className="setting-group">
              <label>Deck Name</label>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                className="auth-input"
                placeholder="Enter deck name"
              />
            </div>

            <div className="setting-group">
              <label>Programming Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="language-select"
              >
                <option value="">Select Language</option>
                {PROGRAMMING_LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <button
              className="auth-button save-button"
              onClick={handleSave}
            >
              Save Changes
            </button>
          </div>

          <div className="setting-group description-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="auth-input description-input"
              placeholder="Add a description for your deck..."
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="cards-header">
        <h3>Cards</h3>
        <button
          className="auth-button toggle-button"
          onClick={() => setShowAddCard(!showAddCard)}
        >
          {showAddCard ? 'View Cards' : 'Add New Card'}
        </button>
      </div>

      <div className="cards-section">
        {showAddCard ? (
          <CardManager
            userId={userId}
            deckId={deckId}
            onCardAdded={handleCardAdded}
            editingCard={editingCard}
          />
        ) : (
          <div className="cards-list">
            {cards.length === 0 ? (
              <div className="no-cards">
                No cards in this deck yet. Click "Add New Card" to create one.
              </div>
            ) : (
              cards.map(card => (
                <div key={card.id} className="card-item">
                  <div className="card-content">
                    <h5>{card.title}</h5>
                    <p>{card.description}</p>
                  </div>
                  <div className="card-actions">
                    <button
                      onClick={() => {
                        setEditingCard(card);
                        setShowAddCard(true);
                      }}
                      className="auth-button"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCard(card.id)}
                      className="auth-button delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckEditor;
