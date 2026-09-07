import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Target, Zap } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  isFirstLaunch?: boolean;
}

export default function SplashScreen({ onComplete, isFirstLaunch = true }: SplashScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps = [
    { icon: BookOpen, text: 'Loading your study materials...', color: 'text-blue-500' },
    { icon: Target, text: 'Preparing your exam planner...', color: 'text-green-500' },
    { icon: Zap, text: 'Almost ready!', color: 'text-yellow-500' },
  ];

  useEffect(() => {
    if (!isFirstLaunch) {
      // Quick splash for returning users
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 300);
      }, 1200);
      return () => clearTimeout(timer);
    }

    // Full experience for first-time users
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          // Start fade out after a brief pause
          setTimeout(() => {
            setIsVisible(false);
            // Complete after fade out animation
            setTimeout(onComplete, 500);
          }, 800);
          return prev;
        }
      });
    }, 1000);

    return () => clearInterval(stepInterval);
  }, [onComplete, isFirstLaunch]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-gradient-to-br from-primary via-secondary to-primary flex flex-col items-center justify-center"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:50px_50px]" />
          </div>

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-8 max-w-sm">
            
            {/* App Icon/Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 15,
                duration: 1
              }}
              className="mb-8"
            >
              <div className="relative">
                {/* Main Icon Container */}
                <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center border-4 border-white/20">
                  <img 
                    src="/icon.png" 
                    alt="Go Study!" 
                    className="w-16 h-16 object-contain"
                    onError={(e) => {
                      // Fallback to text logo if image fails
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="text-2xl font-black text-primary">📚</div>';
                      }
                    }}
                  />
                </div>
                
                {/* Animated Ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 w-24 h-24 border-2 border-white/30 border-t-white rounded-3xl"
                />
              </div>
            </motion.div>

            {/* App Name */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mb-12"
            >
              <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                Go Study!
              </h1>
              <p className="text-lg font-semibold text-white/80">
                Your strategic exam planner
              </p>
            </motion.div>

            {/* Loading Steps - only show for first launch */}
            {isFirstLaunch && (
              <div className="w-full space-y-6">
                {/* Progress Bar */}
                <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-white rounded-full"
                  />
                </div>

                {/* Current Step */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center justify-center gap-3"
                  >
                    <motion.div
                      animate={{ 
                        rotate: [0, 360],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                        scale: { duration: 1, repeat: Infinity }
                      }}
                    >
                      {steps[currentStep] && (() => {
                        const IconComponent = steps[currentStep].icon;
                        return <IconComponent className={`h-5 w-5 ${steps[currentStep].color}`} />;
                      })()}
                    </motion.div>
                    <p className="text-white font-semibold text-sm">
                      {steps[currentStep]?.text}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}

            {/* Simple loading for returning users */}
            {!isFirstLaunch && (
              <div className="w-full space-y-4">
                <motion.div
                  animate={{ 
                    rotate: [0, 360],
                  }}
                  transition={{ 
                    rotate: { duration: 1.5, repeat: Infinity, ease: "linear" }
                  }}
                  className="flex justify-center"
                >
                  <Zap className="h-6 w-6 text-white" />
                </motion.div>
                <p className="text-white font-semibold text-sm text-center">
                  Welcome back!
                </p>
              </div>
            )}

            {/* Dots Indicator - only for first launch */}
            {isFirstLaunch && (
              <div className="flex gap-2 mt-8">
                {steps.map((_, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ 
                      scale: index <= currentStep ? 1 : 0.8,
                      opacity: index <= currentStep ? 1 : 0.5
                    }}
                    transition={{ duration: 0.3 }}
                    className={`w-2 h-2 rounded-full ${
                      index <= currentStep ? 'bg-white' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bottom Decoration */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <div className="flex items-center gap-2 text-white/60 text-xs font-semibold">
              <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" />
              <span>Powered by AI-driven study insights</span>
              <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}