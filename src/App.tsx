import { useState } from 'react';
import { HomePage } from './components/HomePage';
import { GestureDrawingApp } from './components/apps/GestureDrawingApp';

export type AppType = 'home' | 'gesture-drawing';

export default function App() {
  const [currentApp, setCurrentApp] = useState<AppType>('home');

  const renderApp = () => {
    switch (currentApp) {
      case 'gesture-drawing':
        return <GestureDrawingApp onBack={() => setCurrentApp('home')} />;
      case 'home':
      default:
        return <HomePage onLaunchApp={setCurrentApp} />;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {renderApp()}
    </div>
  );
}
