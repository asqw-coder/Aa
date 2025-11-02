interface TopStatusBarProps {
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
}

export const TopStatusBar = ({ connectionStatus }: TopStatusBarProps) => {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-success';
      case 'connecting': return 'bg-warning';
      default: return 'bg-destructive';
    }
  };

  return (
    <div className="w-full h-16 bg-card/50 backdrop-blur-sm border-b border-border/30 flex items-center justify-between px-6">
      {/* Left side - Logo */}
      <div className="flex items-center gap-3">
        <img 
          src="/logo.png" 
          alt="Nova Trading Logo" 
          className="w-10 h-10 rounded-lg object-cover"
        />
        <h1 className="text-xl font-bold text-foreground">Nova</h1>
      </div>


      {/* Right side - Status indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
      </div>
    </div>
  );
};