import { useState } from 'react';
import { Home } from './components/Home';
import { Tetris } from './components/Tetris';
import { SettingsModal } from './components/SettingsModal';
import { AIDashboard } from './components/AIDashboard';
import { KeyMap, DEFAULT_KEYMAP } from './types/settings';

function App() {
    const [view, setView] = useState<'home' | 'game' | 'training'>('home');
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [settings, setSettings] = useState<{ 
        mode: 'classic' | 'modern'; 
        letAIPlay: boolean;
        randomizer: '7-bag' | 'nes' | 'history' | 'pure';
    }>({
        mode: 'classic',
        letAIPlay: false,
        randomizer: '7-bag'
    });
    
    const [keyMap, setKeyMap] = useState<KeyMap>(() => {
        const saved = localStorage.getItem('tetris_keymap');
        if (saved) {
            try {
                return { ...DEFAULT_KEYMAP, ...JSON.parse(saved) };
            } catch (e) {
                return DEFAULT_KEYMAP;
            }
        }
        return DEFAULT_KEYMAP;
    });

    const handlePlay = (newSettings: { 
        mode: 'classic' | 'modern'; 
        letAIPlay: boolean; 
        randomizer: '7-bag' | 'nes' | 'history' | 'pure'; 
    }) => {
        setSettings(newSettings);
        setView('game');
    };

    const handleSaveKeyMap = (newKeyMap: KeyMap) => {
        setKeyMap(newKeyMap);
        localStorage.setItem('tetris_keymap', JSON.stringify(newKeyMap));
    };

    return (
        <div className="App">
            {view === 'home' && (
                <Home 
                    onPlay={handlePlay} 
                    onOpenSettings={() => setShowSettings(true)} 
                    onOpenTraining={() => setView('training')} 
                />
            )}
            {view === 'game' && (
                <Tetris 
                    mode={settings.mode} 
                    letAIPlay={settings.letAIPlay} 
                    randomizer={settings.randomizer}
                    keyMap={keyMap}
                    onOpenSettings={() => setShowSettings(true)}
                    onBackToHome={() => setView('home')} 
                />
            )}
            {view === 'training' && (
                <AIDashboard onBackToHome={() => setView('home')} />
            )}

            {showSettings && (
                <SettingsModal 
                    keyMap={keyMap} 
                    onSave={handleSaveKeyMap} 
                    onClose={() => setShowSettings(false)} 
                />
            )}
        </div>
    );
}

export default App;