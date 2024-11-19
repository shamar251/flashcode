import React from 'react';
import './DeckCollection.css';
import { ReactComponent as OptionsIcon } from '../../Icons/cil--options.svg';

const DeckCollection = ({ collection, onSelect, onDelete, onRename }) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  return (
    <div className="deck-collection" onClick={() => onSelect(collection.id)}>
      <div className="collection-header">
        <div className="collection-title">
          <h3>{collection.name}</h3>
          <span className="deck-count">{collection.deckCount || 0} decks</span>
        </div>

        <div className="collection-dropdown">
          <button
            className="options-button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(!isDropdownOpen);
            }}
          >
            <OptionsIcon />
          </button>

          {isDropdownOpen && (
            <div className="dropdown-menu">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newName = prompt('Enter new collection name:', collection.name);
                  if (newName && newName.trim()) {
                    onRename(collection.id, newName.trim());
                  }
                  setIsDropdownOpen(false);
                }}
              >
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this collection?')) {
                    onDelete(collection.id);
                  }
                  setIsDropdownOpen(false);
                }}
                className="delete"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeckCollection;
