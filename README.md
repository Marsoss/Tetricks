# Tetricks

A modern take on the classic Tetris game, built with React and TypeScript. This version features a refreshed UI, new gameplay mechanics, and responsive design for play on both desktop and mobile devices.

## Features

- **Clean, Modern UI**: A complete redesign of the classic Tetris aesthetic with smooth animations and intuitive controls.
- **Responsive Design**: Play on desktop using keyboard controls or on mobile using on-screen touch controls.
- **Classic Gameplay**: Experience the timeless Tetris mechanics you know and love.
- **TypeScript**: Built with type safety for a more robust and maintainable codebase.
- **[Custom AI Engine (Coming Soon)]**: An intelligent AI that learns your playstyle to provide personalized challenges and adaptive difficulty.

## Tech Stack

- **Framework**: [React](https://react.dev/) 19
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) with CSS Grid for layout.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd tetrics
```

2. Install dependencies:

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

### Build

To build the project for production:

```bash
npm run build
```

## Controls

### Desktop

- **Arrow Keys**: Move tetrominoes (Left, Right, Down)
- **Space Bar**: Hard Drop
- **Up Arrow / W**: Rotate

### Mobile

- **On-screen Buttons**: Use the D-pad and Action buttons on the screen to move and rotate.

## Project Structure

```
tetrics/
├── public/               # Static assets
├── src/
│   ├── assets/           # Images, fonts, etc.
│   ├── components/       # Reusable React components
│   ├── layouts/          # Page layouts
│   ├── features/         # Game features (e.g., TetrisBoard)
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   └── App.tsx           # Main application component
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Project dependencies and scripts
```

## AI Engine

This project includes a placeholder for a custom AI engine. When implemented, it will provide:
- **Real-time analysis**: Evaluates moves to suggest optimal placements.
- **Difficulty scaling**: Adapts to player skill level.
- **Personalized feedback**: Provides insights into your gameplay patterns.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.