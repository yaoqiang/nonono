import { motion } from 'motion/react';
import { Video, Sparkles, Zap, User, Bot } from 'lucide-react';
import type { AppType } from '../App';

interface HomePageProps {
  onLaunchApp: (app: AppType) => void;
}

export function HomePage({ onLaunchApp }: HomePageProps) {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" 
          style={{
            backgroundImage: `
              linear-gradient(#39ff14 1px, transparent 1px),
              linear-gradient(90deg, #39ff14 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
        {/* Title */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-16"
        >
          <motion.h1 
            className="text-8xl md:text-9xl mb-6 relative inline-block"
            style={{ fontFamily: 'Impact, sans-serif', letterSpacing: '-0.02em' }}
            animate={{ 
              textShadow: [
                '0 0 20px #39ff14, 0 0 40px #39ff14',
                '0 0 30px #ff10f0, 0 0 60px #ff10f0',
                '0 0 20px #39ff14, 0 0 40px #39ff14',
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            NO<span className="text-[#39ff14]">NO</span>NO
          </motion.h1>
          
          <motion.p 
            className="text-2xl md:text-3xl tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="text-[#ff10f0]">Say NO to Boring.</span>
            <br />
            <span className="text-white">拒绝千篇一律！</span>
          </motion.p>
        </motion.div>

        {/* App Grid */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full"
        >
          {/* Gesture Drawing App */}
          <AppCard
            title="GESTURE DRAW"
            description="用手势在空中画画"
            icon={Video}
            color="#39ff14"
            onClick={() => onLaunchApp('gesture-drawing')}
            delay={0}
          />

          {/* 喝酒地球 - 可点击进入应用 */}
          <AppCard
            title="DRINKING EARTH"
            description="实时地球喝酒地图"
            icon={Bot}
            color="#ff10f0"
            onClick={() => onLaunchApp('drinking-earth')}
            delay={0.1}
          />

          <PlaceholderCard
            title="COMING SOON"
            icon={Zap}
            delay={0.2}
          />
        </motion.div>

        {/* Footer manifesto */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-20 flex flex-col items-center gap-6"
        >
          <p className="text-sm tracking-widest text-gray-500 uppercase">
            This is a space for rebels & creators
          </p>
          
          <motion.button
            onClick={() => onLaunchApp('author-profile')}
            className="group flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 hover:border-[#39ff14] hover:bg-[#39ff14]/10 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <User className="w-4 h-4 text-gray-400 group-hover:text-[#39ff14] transition-colors" />
            <span className="text-gray-400 group-hover:text-[#39ff14] tracking-widest text-sm font-mono transition-colors">
              WHO IS YAO?
            </span>
          </motion.button>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <motion.div
        className="absolute top-20 right-20 w-40 h-40 border-4 border-[#ff10f0] rotate-12"
        animate={{ rotate: [12, 24, 12] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      <motion.div
        className="absolute bottom-20 left-20 w-32 h-32 bg-[#39ff14] rounded-full"
        style={{ filter: 'blur(60px)' }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

interface AppCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
  delay: number;
}

function AppCard({ title, description, icon: Icon, color, onClick, delay }: AppCardProps) {
  return (
    <motion.button
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1 + delay, duration: 0.5 }}
      whileHover={{ 
        scale: 1.05, 
        boxShadow: `0 0 40px ${color}`,
        borderColor: color,
      }}
      whileTap={{ scale: 0.95, rotate: [0, -2, 2, 0] }}
      onClick={onClick}
      className="group relative bg-white/5 backdrop-blur-sm border-2 border-white/20 p-8 rounded-none overflow-hidden transition-all"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Background effect */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
        style={{ backgroundColor: color }}
      />

      {/* Content */}
      <div className="relative z-10">
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
        >
          <Icon className="w-16 h-16 mb-4" style={{ color }} />
        </motion.div>
        
        <h3 
          className="text-2xl mb-2 tracking-wider"
          style={{ fontFamily: 'Impact, sans-serif' }}
        >
          {title}
        </h3>
        
        <p className="text-sm text-gray-400">{description}</p>
      </div>

      {/* Corner decoration */}
      <div 
        className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ borderColor: color }}
      />
    </motion.button>
  );
}

interface PlaceholderCardProps {
  title: string;
  icon: React.ElementType;
  delay: number;
}

function PlaceholderCard({ title, icon: Icon, delay }: PlaceholderCardProps) {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1 + delay, duration: 0.5 }}
      className="relative bg-white/5 backdrop-blur-sm border-2 border-white/10 border-dashed p-8 rounded-none overflow-hidden"
    >
      <div className="relative z-10 opacity-30">
        <Icon className="w-16 h-16 mb-4 text-gray-500" />
        
        <h3 
          className="text-2xl tracking-wider text-gray-600"
          style={{ fontFamily: 'Impact, sans-serif' }}
        >
          {title}
        </h3>
      </div>
    </motion.div>
  );
}
