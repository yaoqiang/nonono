import { useState } from 'react';
import { HomePage } from './components/HomePage';
import { GestureDrawingApp } from './components/apps/GestureDrawingApp';
import { DrinkingEarthApp } from './components/apps/DrinkingEarthApp';
import { AuthorProfile } from './components/AuthorProfile';

export type AppType = 'home' | 'gesture-drawing' | 'drinking-earth' | 'author-profile';

export default function App() {
  const [currentApp, setCurrentApp] = useState<AppType>('home');

  const renderApp = () => {
    switch (currentApp) {
      case 'gesture-drawing':
        return <GestureDrawingApp onBack={() => setCurrentApp('home')} />;
      case 'drinking-earth':
        return <DrinkingEarthApp onBack={() => setCurrentApp('home')} />;
      case 'author-profile':
        return <AuthorProfile onBack={() => setCurrentApp('home')} />;
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
