# FlashCode

FlashCode is a web-based coding practice app where users can memorize and practice coding syntax using interactive flashcard-style code snippets. The application encourages learning by allowing users to attempt writing code snippets from memory, receive feedback, and retry as needed.

## Features

- **Interactive Code Editor**: Built with CodeMirror, providing syntax highlighting and a proper coding environment
- **User Authentication**: Secure login/signup with email/password and Google authentication
- **Progress Tracking**: Visual progress bar showing completion status of practice cards
- **Practice Mode**: Flashcard-style interface for learning and practicing code snippets
- **Instant Feedback**: Check your solutions against correct implementations
- **Hint System**: Get help when stuck on challenging problems

## Getting Started

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/flashcode.git
cd flashcode
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Firebase**
- Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
- Enable Authentication (Email/Password and Google Sign-in methods)
- Create a web app in your Firebase project
- Update `src/firebase/firebaseConfig.js` with your Firebase configuration

4. **Start the development server**
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
flashcode/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   └── Auth.js
│   │   ├── CodeEditor/
│   │   │   └── CodeEditor.js
│   │   └── Flashcard/
│   │       └── Flashcard.js
│   ├── firebase/
│   │   └── firebaseConfig.js
│   ├── styles/
│   │   └── main.css
│   ├── App.js
│   └── index.js
└── package.json
```

## Technologies Used

- **React**: Frontend framework
- **Firebase**: Authentication and backend services
- **CodeMirror**: Code editor component
- **CSS3**: Styling and animations

## Usage

1. **Sign Up/Sign In**
   - Create a new account or sign in with existing credentials
   - Google authentication available for quick access

2. **Practice Mode**
   - View coding challenges
   - Write solutions in the integrated code editor
   - Check your solution against the correct implementation
   - Use hints when needed
   - Track your progress with the completion bar

3. **Navigation**
   - Move between cards using Previous/Next buttons
   - Review completed challenges
   - Track overall progress

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Future Enhancements

- Add more coding challenges and categories
- Implement spaced repetition system
- Add code execution and testing
- Support for multiple programming languages
- User profile and statistics
- Social features and sharing capabilities
