import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface FinancialCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  icon?: LucideIcon;
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "gradient" | "accent";
}

export const FinancialCard = ({ 
  title, 
  value, 
  subtitle, 
  trend, 
  icon: Icon, 
  className = "",
  children,
  variant = "default"
}: FinancialCardProps) => {
  const getVariantClass = () => {
    switch (variant) {
      case "gradient":
        return "bg-gradient-to-br from-orange-400 to-yellow-500 text-white";
      case "accent":
        return "bg-gradient-to-br from-primary to-accent text-white";
      default:
        return "bg-card/80 backdrop-blur-sm";
    }
  };

  return (
    <Card className={`p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl border-0 shadow-lg ${getVariantClass()} ${className}`}>
      <div className="space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className={`text-xs sm:text-sm font-medium truncate ${variant === "default" ? "text-muted-foreground" : "text-white/80"}`}>
              {title}
            </p>
            {subtitle && (
              <p className={`text-xs ${variant === "default" ? "text-muted-foreground" : "text-white/60"} truncate`}>
                {subtitle}
              </p>
            )}
          </div>
          {Icon && (
            <div className={`p-1.5 sm:p-2 rounded-xl flex-shrink-0 ${variant === "default" ? "bg-primary/10 text-primary" : "bg-white/20 text-white"}`}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          )}
        </div>

        {/* Value */}
        <div className="space-y-1 sm:space-y-2">
          <p className={`text-2xl sm:text-3xl font-bold truncate ${variant === "default" ? "text-foreground" : "text-white"}`}>
            {value}
          </p>
          {trend && (
            <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${
              trend.isPositive 
                ? (variant === "default" ? "text-success" : "text-green-200")
                : (variant === "default" ? "text-destructive" : "text-red-200")
            }`}>
              {trend.value}
            </div>
          )}
        </div>

        {/* Children content */}
        {children}
      </div>
    </Card>
  );
};