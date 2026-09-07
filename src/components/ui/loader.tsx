import { motion } from 'framer-motion';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function Loader({ size = 'md', text }: LoaderProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const dotSize = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Rotating circles */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 ${dotSize[size]} bg-primary rounded-full`} />
        </motion.div>
        
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.2 }}
        >
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 ${dotSize[size]} bg-secondary rounded-full`} />
        </motion.div>
        
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.4 }}
        >
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 ${dotSize[size]} bg-accent rounded-full`} />
        </motion.div>

        {/* Center pulse */}
        <motion.div
          className={`absolute inset-0 flex items-center justify-center`}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className={`${dotSize[size]} bg-primary/30 rounded-full`} />
        </motion.div>
      </div>

      {text && (
        <motion.p
          className="text-sm font-semibold text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

// Alternative: Bouncing dots loader
export function DotsLoader({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 bg-primary rounded-full"
            animate={{ y: [0, -12, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15
            }}
          />
        ))}
      </div>
      {text && (
        <p className="text-sm font-semibold text-muted-foreground">{text}</p>
      )}
    </div>
  );
}

// Alternative: Pulse loader
export function PulseLoader({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative w-16 h-16">
        <motion.div
          className="absolute inset-0 bg-primary/20 rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 bg-primary/40 rounded-full"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 bg-primary rounded-full" />
        </div>
      </div>
      {text && (
        <p className="text-sm font-semibold text-muted-foreground">{text}</p>
      )}
    </div>
  );
}

// Alternative: Spinner with gradient
export function GradientSpinner({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary via-secondary to-accent"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        style={{
          maskImage: 'conic-gradient(from 0deg, transparent 0deg, black 90deg)',
          WebkitMaskImage: 'conic-gradient(from 0deg, transparent 0deg, black 90deg)'
        }}
      />
      {text && (
        <p className="text-sm font-semibold text-muted-foreground">{text}</p>
      )}
    </div>
  );
}
